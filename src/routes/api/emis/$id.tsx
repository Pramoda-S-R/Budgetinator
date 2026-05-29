import { createFileRoute } from "@tanstack/react-router";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, emis, transactions } from "#/db/schema";
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
	name: z.string().trim().min(1).optional(),
	monthlyAmount: z.coerce.number().positive().optional(),
	nextDueDate: z.string().optional(),
	lenderName: z.string().trim().optional(),
	status: z.enum(["active", "completed", "cancelled"]).optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/emis/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const payload = await request.json();
				const parsedBody = updateSchema.safeParse(payload);
				if (!parsedBody.success) {
					return json({ error: "Invalid request body", issues: parsedBody.error.flatten() }, 400);
				}

				const user = await requireCurrentUser(request);
				const d = parsedBody.data;

				const updates: Partial<typeof emis.$inferInsert> = {
					...(d.name ? { name: d.name } : {}),
					...(d.monthlyAmount !== undefined ? { monthlyAmount: d.monthlyAmount.toFixed(2) } : {}),
					...(d.nextDueDate ? { nextDueDate: new Date(d.nextDueDate) } : {}),
					...(d.lenderName !== undefined ? { lenderName: d.lenderName } : {}),
					...(d.status ? { status: d.status } : {}),
				};

				const [updated] = await db
					.update(emis)
					.set(updates)
					.where(and(eq(emis.id, parsedParams.data.id), eq(emis.userId, user.id)))
					.returning();

				if (!updated) return json({ error: "EMI not found" }, 404);
				return json({ emi: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const user = await requireCurrentUser(request);

				const [emi] = await db
					.select()
					.from(emis)
					.where(and(eq(emis.id, parsedParams.data.id), eq(emis.userId, user.id)))
					.limit(1);

				if (!emi) return json({ error: "EMI not found" }, 404);

				await db.transaction(async (tx) => {
					const relatedTxs = await tx
						.select()
						.from(transactions)
						.where(
							or(
								eq(transactions.accountId, emi.accountId),
								eq(transactions.transferAccountId, emi.accountId),
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
						const inverted = invertDeltas(deltas).filter(
							(d) => d.accountId !== emi.accountId,
						);
						await applyBalanceAdjustments(tx, user.id, inverted);
						// Drop the transaction explicitly — transactions.transfer_account_id
						// is RESTRICT, so the account delete below would block otherwise.
						await tx.delete(transactions).where(eq(transactions.id, t.id));
					}

					await tx.delete(emis).where(eq(emis.id, emi.id));
					await tx.delete(accounts).where(eq(accounts.id, emi.accountId));
				});

				return json({ success: true });
			},
		},
	},
});
