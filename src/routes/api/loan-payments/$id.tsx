import { createFileRoute } from "@tanstack/react-router";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { loanPayments, loans, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	type TransactionType,
} from "#/lib/transaction-ledger";
import { applyBalanceAdjustments } from "../transactions/-helpers";

const idSchema = z.object({ id: z.string().uuid() });

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/loan-payments/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const user = await requireCurrentUser(request);

				const [row] = await db
					.select({ payment: loanPayments, loan: loans })
					.from(loanPayments)
					.innerJoin(loans, eq(loanPayments.loanId, loans.id))
					.where(
						and(
							eq(loanPayments.id, parsedParams.data.id),
							eq(loans.userId, user.id),
						),
					)
					.limit(1);

				if (!row) return json({ error: "Payment not found" }, 404);

				await db.transaction(async (tx) => {
					// Locate the linked transaction by the `loan_payment:<id>` tag we wrote
					// at creation time, invert its ledger effect, then delete both rows.
					const linkedTxs = await tx
						.select()
						.from(transactions)
						.where(
							and(
								eq(transactions.userId, user.id),
								like(transactions.notes, `loan_payment:${row.payment.id}`),
							),
						);

					for (const t of linkedTxs) {
						const deltas = combineAccountDeltas(
							buildTransactionDeltas({
								accountId: t.accountId,
								transferAccountId: t.transferAccountId,
								amount: Number(t.amount),
								transactionType: t.transactionType as TransactionType,
							}),
						);
						await applyBalanceAdjustments(tx, user.id, invertDeltas(deltas));
						await tx.delete(transactions).where(eq(transactions.id, t.id));
					}

					await tx
						.delete(loanPayments)
						.where(eq(loanPayments.id, row.payment.id));

					// If the loan was marked paid because of this payment, reopen it.
					if (row.loan.status === "paid") {
						await tx
							.update(loans)
							.set({ status: "active" })
							.where(eq(loans.id, row.loan.id));
					}
				});

				return json({ success: true });
			},
		},
	},
});
