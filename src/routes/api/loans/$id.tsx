import { createFileRoute } from "@tanstack/react-router";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, loans, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	type TransactionType,
} from "#/lib/transaction-ledger";
import { applyBalanceAdjustments } from "../transactions/-helpers";

const idSchema = z.object({ id: z.string().uuid() });

const updateSchema = z.object({
	contactId: z.string().uuid().nullable().optional(),
	loanType: z.enum(["given", "taken"]).optional(),
	interestRate: z.coerce.number().min(0).nullable().optional(),
	expectedEndDate: z.string().nullable().optional(),
	status: z.enum(["active", "paid", "overdue"]).optional(),
	notes: z.string().trim().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/loans/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const payload = await request.json();
				const parsedBody = updateSchema.safeParse(payload);
				if (!parsedBody.success) {
					return json(
						{
							error: "Invalid request body",
							issues: parsedBody.error.flatten(),
						},
						400,
					);
				}

				const user = await requireCurrentUser(request);
				const d = parsedBody.data;

				const updates: Partial<typeof loans.$inferInsert> = {
					...(d.contactId !== undefined ? { contactId: d.contactId } : {}),
					...(d.loanType ? { loanType: d.loanType } : {}),
					...(d.interestRate !== undefined
						? {
								interestRate:
									d.interestRate != null ? d.interestRate.toFixed(2) : null,
							}
						: {}),
					...(d.expectedEndDate !== undefined
						? {
								expectedEndDate: d.expectedEndDate
									? new Date(d.expectedEndDate)
									: null,
							}
						: {}),
					...(d.status ? { status: d.status } : {}),
					...(d.notes !== undefined ? { notes: d.notes } : {}),
				};

				const [updated] = await db
					.update(loans)
					.set(updates)
					.where(
						and(eq(loans.id, parsedParams.data.id), eq(loans.userId, user.id)),
					)
					.returning();

				if (!updated) return json({ error: "Loan not found" }, 404);
				return json({ loan: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const user = await requireCurrentUser(request);

				const [loan] = await db
					.select()
					.from(loans)
					.where(
						and(eq(loans.id, parsedParams.data.id), eq(loans.userId, user.id)),
					)
					.limit(1);

				if (!loan) return json({ error: "Loan not found" }, 404);

				// Inverting a loan means refunding every prior cash movement: the bank
				// gets the principal back and every recorded payment is undone.  We do
				// this by replaying every transaction that touched the paired account
				// (as source or destination) with inverted deltas.
				await db.transaction(async (tx) => {
					const relatedTxs = await tx
						.select()
						.from(transactions)
						.where(
							or(
								eq(transactions.accountId, loan.accountId),
								eq(transactions.transferAccountId, loan.accountId),
							),
						);

					for (const t of relatedTxs) {
						const deltas = combineAccountDeltas(
							buildTransactionDeltas({
								accountId: t.accountId,
								transferAccountId: t.transferAccountId,
								amount: Number(t.amount),
								transactionType: t.transactionType as TransactionType,
							}),
						);
						// Apply only the inverted delta on accounts OTHER than the paired
						// account — the paired account is about to be deleted, so updating
						// its balance is wasted work and would also re-trigger history rows.
						const inverted = invertDeltas(deltas).filter(
							(d) => d.accountId !== loan.accountId,
						);
						await applyBalanceAdjustments(tx, user.id, inverted);
						// Explicitly drop the transaction.  transactions.account_id cascades
						// on account delete, but transactions.transfer_account_id is
						// RESTRICT — so the account delete below would otherwise fail.
						await tx.delete(transactions).where(eq(transactions.id, t.id));
					}

					await tx.delete(loans).where(eq(loans.id, loan.id));
					await tx.delete(accounts).where(eq(accounts.id, loan.accountId));
				});

				return json({ success: true });
			},
		},
	},
});
