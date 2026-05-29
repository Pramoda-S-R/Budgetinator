import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, loanPayments, loans, transactions } from "#/db/schema";
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

const createPaymentSchema = z.object({
	loanId: z.string().uuid(),
	accountId: z.string().uuid(), // source bank account for this payment
	categoryId: z.string().uuid().nullable().optional(),
	amount: z.coerce.number().positive(),
	paidAt: z.string().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/loan-payments/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const url = new URL(request.url);
				const loanId = url.searchParams.get("loanId");

				const rows = loanId
					? await db
							.select({ payment: loanPayments })
							.from(loanPayments)
							.innerJoin(loans, eq(loanPayments.loanId, loans.id))
							.where(
								and(eq(loans.userId, user.id), eq(loanPayments.loanId, loanId)),
							)
							.orderBy(desc(loanPayments.paidAt))
					: await db
							.select({ payment: loanPayments })
							.from(loanPayments)
							.innerJoin(loans, eq(loanPayments.loanId, loans.id))
							.where(eq(loans.userId, user.id))
							.orderBy(desc(loanPayments.paidAt));

				return json({ payments: rows.map((r) => r.payment) });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createPaymentSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const d = parsed.data;

				const [loan] = await db
					.select()
					.from(loans)
					.where(and(eq(loans.id, d.loanId), eq(loans.userId, user.id)))
					.limit(1);

				if (!loan) return json({ error: "Loan not found" }, 404);

				await authorizeAccounts(db, user.id, [d.accountId]);
				await authorizeCategory(db, user.id, d.categoryId ?? null);

				// For a loan GIVEN, a payment is the contact returning your money:
				//   transfer FROM loan_account (asset shrinks) TO bank (cash grows).
				// For a loan TAKEN, a payment is YOU repaying the lender:
				//   transfer FROM bank (cash shrinks) TO loan_account (liability shrinks toward 0).
				const sourceAccountId =
					loan.loanType === "given" ? loan.accountId : d.accountId;
				const destAccountId =
					loan.loanType === "given" ? d.accountId : loan.accountId;
				const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();

				const created = await db.transaction(async (tx) => {
					const [payment] = await tx
						.insert(loanPayments)
						.values({
							loanId: d.loanId,
							amount: toNumericString(d.amount),
							paidAt,
						})
						.returning();

					await tx.insert(transactions).values({
						userId: user.id,
						accountId: sourceAccountId,
						transferAccountId: destAccountId,
						categoryId: d.categoryId ?? null,
						amount: toNumericString(d.amount),
						transactionType: "transfer",
						transactionDate: paidAt,
						merchant:
							loan.loanType === "given"
								? "Loan repayment received"
								: "Loan repayment",
						notes: `loan_payment:${payment.id}`,
						isRecurring: false,
					});

					const deltas = combineAccountDeltas(
						buildTransactionDeltas({
							accountId: sourceAccountId,
							transferAccountId: destAccountId,
							amount: d.amount,
							transactionType: "transfer",
						}),
					);
					await applyBalanceAdjustments(tx, user.id, deltas);

					// Mark the loan as paid when the paired account hits zero.
					const [pairedAcct] = await tx
						.select({ balance: accounts.currentBalance })
						.from(accounts)
						.where(eq(accounts.id, loan.accountId))
						.limit(1);

					if (pairedAcct && Math.abs(Number(pairedAcct.balance)) < 0.005) {
						await tx
							.update(loans)
							.set({ status: "paid" })
							.where(eq(loans.id, loan.id));
					}

					return payment;
				});

				return json({ payment: created }, 201);
			},
		},
	},
});
