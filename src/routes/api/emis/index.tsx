import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, emis, transactions } from "#/db/schema";
import { pairedAccountName } from "#/lib/account-class";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	toNumericString,
} from "#/lib/transaction-ledger";
import {
	applyBalanceAdjustments,
	authorizeAccounts,
	authorizeCategory,
} from "../transactions/-helpers";

const createEmiSchema = z.object({
	name: z.string().trim().min(1),
	principal: z.coerce.number().positive(),
	interestRate: z.coerce.number().min(0),
	monthlyAmount: z.coerce.number().positive(),
	startDate: z.string(),
	endDate: z.string(),
	nextDueDate: z.string(),
	lenderName: z.string().trim().optional(),
	// If supplied, treat this EMI as a *new* loan being disbursed today: the
	// principal arrives in this bank account.  If omitted, treat it as an
	// already-running EMI being registered for tracking (no cash movement).
	disbursementAccountId: z.string().uuid().optional(),
	// Applied to the disbursement transaction only (when one is created).
	categoryId: z.string().uuid().nullable().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/emis/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const rows = await db.execute(sql`
					SELECT
						e.id,
						e.user_id         AS "userId",
						e.account_id      AS "accountId",
						e.name,
						e.interest_rate   AS "interestRate",
						e.monthly_amount  AS "monthlyAmount",
						e.start_date      AS "startDate",
						e.end_date        AS "endDate",
						e.next_due_date   AS "nextDueDate",
						e.lender_name     AS "lenderName",
						e.status,
						e.created_at      AS "createdAt",
						ABS(a.current_balance)::text AS "outstanding",
						COALESCE((
							SELECT ABS(balance)::text
							FROM account_balance_history abh
							WHERE abh.account_id = e.account_id
							ORDER BY abh.recorded_at ASC LIMIT 1
						), ABS(a.current_balance)::text) AS "principal"
					FROM ${emis} e
					JOIN ${accounts} a ON a.id = e.account_id
					WHERE e.user_id = ${user.id}
					ORDER BY e.next_due_date DESC
				`);
				return json({ emis: (rows as any).rows });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createEmiSchema.safeParse(payload);

				if (!parsed.success) {
					return json({ error: "Invalid request body", issues: parsed.error.flatten() }, 400);
				}

				const d = parsed.data;
				if (d.disbursementAccountId) {
					await authorizeAccounts(db, user.id, [d.disbursementAccountId]);
				}
				await authorizeCategory(db, user.id, d.categoryId ?? null);

				const startDate = new Date(d.startDate);
				const initialBalance = (-d.principal).toFixed(2);

				const created = await db.transaction(async (tx) => {
					// Paired liability account starting at -principal.  If a disbursement
					// account is supplied, we zero this out and use a transfer instead, so
					// the bank gains the principal at the same moment the liability accrues.
					const [pairedAccount] = await tx
						.insert(accounts)
						.values({
							userId: user.id,
							name: pairedAccountName({ kind: "emi", label: d.name }),
							accountType: "emi",
							currentBalance: d.disbursementAccountId ? "0" : initialBalance,
							includeInNetWorth: true,
							isActive: true,
						})
						.returning();

					if (d.disbursementAccountId) {
						const txDate = startDate;
						await tx.insert(transactions).values({
							userId: user.id,
							accountId: pairedAccount.id,
							transferAccountId: d.disbursementAccountId,
							categoryId: d.categoryId ?? null,
							amount: toNumericString(d.principal),
							transactionType: "transfer",
							transactionDate: txDate,
							merchant: `EMI disbursement: ${d.name}`,
							notes: "",
							isRecurring: false,
						});

						const deltas = combineAccountDeltas(
							buildTransactionDeltas({
								accountId: pairedAccount.id,
								transferAccountId: d.disbursementAccountId,
								amount: d.principal,
								transactionType: "transfer",
							}),
						);
						await applyBalanceAdjustments(tx, user.id, deltas);
					} else {
						// No disbursement — record the opening balance manually for history.
						await tx.execute(sql`
							INSERT INTO account_balance_history (account_id, balance, recorded_at)
							VALUES (${pairedAccount.id}, ${initialBalance}, ${startDate})
						`);
					}

					const [emi] = await tx
						.insert(emis)
						.values({
							userId: user.id,
							accountId: pairedAccount.id,
							name: d.name,
							interestRate: d.interestRate.toFixed(2),
							monthlyAmount: d.monthlyAmount.toFixed(2),
							startDate,
							endDate: new Date(d.endDate),
							nextDueDate: new Date(d.nextDueDate),
							lenderName: d.lenderName ?? "",
						})
						.returning();

					return emi;
				});

				return json({ emi: created }, 201);
			},
		},
	},
});
