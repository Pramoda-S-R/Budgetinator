import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, contacts, loans, transactions } from "#/db/schema";
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

const createLoanSchema = z.object({
	contactId: z.string().uuid().nullable().optional(),
	accountId: z.string().uuid(), // source account is now required: it's the bank the money moves through
	categoryId: z.string().uuid().nullable().optional(),
	loanType: z.enum(["given", "taken"]),
	principalAmount: z.coerce.number().positive(),
	interestRate: z.coerce.number().min(0).nullable().optional(),
	startedAt: z.string().optional(),
	expectedEndDate: z.string().nullable().optional(),
	notes: z.string().trim().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/loans/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);

				// One row per loan, with the linked-account balance giving the *remaining*
				// amount and the oldest balance-history entry giving the *original principal*.
				const rows = await db.execute(sql`
					SELECT
						l.id,
						l.user_id           AS "userId",
						l.contact_id        AS "contactId",
						l.account_id        AS "accountId",
						l.loan_type         AS "loanType",
						l.interest_rate     AS "interestRate",
						l.started_at        AS "startedAt",
						l.expected_end_date AS "expectedEndDate",
						l.status,
						l.notes,
						l.created_at        AS "createdAt",
						c.name              AS "contactName",
						a.name              AS "accountName",
						ABS(a.current_balance)::text AS "remainingAmount",
						COALESCE((
							SELECT ABS(balance)::text
							FROM ${accounts} a2
							JOIN account_balance_history abh ON abh.account_id = a2.id
							WHERE a2.id = l.account_id
							ORDER BY abh.recorded_at ASC LIMIT 1
						), ABS(a.current_balance)::text) AS "principalAmount",
						COALESCE((
							SELECT SUM(amount)::text FROM loan_payments WHERE loan_id = l.id
						), '0') AS "totalPaid"
					FROM ${loans} l
					LEFT JOIN ${contacts} c ON c.id = l.contact_id
					JOIN ${accounts} a ON a.id = l.account_id
					WHERE l.user_id = ${user.id}
					ORDER BY l.created_at DESC
				`);

				const list = (rows as any).rows as any[];
				return json({
					loans: list.map((r) => ({
						loan: {
							id: r.id,
							userId: r.userId,
							contactId: r.contactId,
							accountId: r.accountId,
							loanType: r.loanType,
							interestRate: r.interestRate,
							startedAt: r.startedAt,
							expectedEndDate: r.expectedEndDate,
							status: r.status,
							notes: r.notes,
							createdAt: r.createdAt,
							principalAmount: r.principalAmount,
							remainingAmount: r.remainingAmount,
						},
						contactName: r.contactName,
						accountName: r.accountName,
						totalPaid: r.totalPaid,
					})),
				});
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createLoanSchema.safeParse(payload);

				if (!parsed.success) {
					return json({ error: "Invalid request body", issues: parsed.error.flatten() }, 400);
				}

				const d = parsed.data;

				// Verify the source bank account belongs to the user (also pre-fills the
				// transfer validation we'll use later).
				await authorizeAccounts(db, user.id, [d.accountId]);
				await authorizeCategory(db, user.id, d.categoryId ?? null);

				let contactLabel = "unknown";
				if (d.contactId) {
					const [contact] = await db
						.select({ name: contacts.name })
						.from(contacts)
						.where(and(eq(contacts.id, d.contactId), eq(contacts.userId, user.id)))
						.limit(1);
					if (!contact) return json({ error: "Contact not found" }, 404);
					contactLabel = contact.name;
				}

				const startedAt = d.startedAt ? new Date(d.startedAt) : new Date();

				const created = await db.transaction(async (tx) => {
					// 1. Auto-create the paired loan account.
					const accountKind = d.loanType === "given" ? "loan_given" : "loan_taken";
					const [pairedAccount] = await tx
						.insert(accounts)
						.values({
							userId: user.id,
							name: pairedAccountName({ kind: accountKind, label: contactLabel }),
							accountType: accountKind,
							currentBalance: "0",
							includeInNetWorth: true,
							isActive: true,
						})
						.returning();

					// 2. Record the cash movement as a transfer.  For a loan GIVEN, money
					//    leaves the bank and lands in the loan-given asset.  For a loan
					//    TAKEN, money flows the other way: the liability accrues and the
					//    bank gains the principal.
					const sourceAccountId = d.loanType === "given" ? d.accountId : pairedAccount.id;
					const destAccountId = d.loanType === "given" ? pairedAccount.id : d.accountId;

					const [transferTx] = await tx
						.insert(transactions)
						.values({
							userId: user.id,
							accountId: sourceAccountId,
							transferAccountId: destAccountId,
							categoryId: d.categoryId ?? null,
							amount: toNumericString(d.principalAmount),
							transactionType: "transfer",
							transactionDate: startedAt,
							merchant: d.loanType === "given" ? `Loan to ${contactLabel}` : `Loan from ${contactLabel}`,
							notes: d.notes ?? "",
							isRecurring: false,
						})
						.returning();

					const deltas = combineAccountDeltas(
						buildTransactionDeltas({
							accountId: sourceAccountId,
							transferAccountId: destAccountId,
							amount: d.principalAmount,
							transactionType: "transfer",
						}),
					);
					await applyBalanceAdjustments(tx, user.id, deltas);

					// 3. Insert the loan metadata.
					const [loan] = await tx
						.insert(loans)
						.values({
							userId: user.id,
							contactId: d.contactId ?? null,
							accountId: pairedAccount.id,
							loanType: d.loanType,
							interestRate: d.interestRate != null ? d.interestRate.toFixed(2) : null,
							startedAt,
							expectedEndDate: d.expectedEndDate ? new Date(d.expectedEndDate) : null,
							notes: d.notes ?? "",
						})
						.returning();

					return { loan, pairedAccount, transferTx };
				});

				return json({ loan: created.loan }, 201);
			},
		},
	},
});
