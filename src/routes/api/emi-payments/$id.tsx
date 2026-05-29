import { createFileRoute } from "@tanstack/react-router";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { emiPayments, emis, transactions } from "#/db/schema";
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

export const Route = createFileRoute("/api/emi-payments/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const user = await requireCurrentUser(request);

				const [row] = await db
					.select({ payment: emiPayments, emi: emis })
					.from(emiPayments)
					.innerJoin(emis, eq(emiPayments.emiId, emis.id))
					.where(
						and(
							eq(emiPayments.id, parsedParams.data.id),
							eq(emis.userId, user.id),
						),
					)
					.limit(1);

				if (!row) return json({ error: "Payment not found" }, 404);

				await db.transaction(async (tx) => {
					const linkedTxs = await tx
						.select()
						.from(transactions)
						.where(
							and(
								eq(transactions.userId, user.id),
								like(transactions.notes, `emi_payment:${row.payment.id}`),
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
						.delete(emiPayments)
						.where(eq(emiPayments.id, row.payment.id));

					// Rewind nextDueDate by one month and revive status if needed.
					const prev = new Date(row.emi.nextDueDate);
					prev.setMonth(prev.getMonth() - 1);
					const revertedStatus =
						row.emi.status === "completed" ? "active" : row.emi.status;
					await tx
						.update(emis)
						.set({ nextDueDate: prev, status: revertedStatus })
						.where(eq(emis.id, row.emi.id));
				});

				return json({ success: true });
			},
		},
	},
});
