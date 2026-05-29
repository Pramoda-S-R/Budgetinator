import { createFileRoute } from "@tanstack/react-router";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, investments, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	type TransactionType,
} from "#/lib/transaction-ledger";
import { applyBalanceAdjustments } from "../transactions/-helpers";

const investmentIdSchema = z.object({ id: z.string().uuid() });

const updateInvestmentSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		investmentType: z.string().trim().min(1).optional(),
		symbol: z.string().trim().optional(),
		status: z.enum(["active", "liquidated"]).optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investments/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = investmentIdSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid investment id" }, 400);

				const payload = await request.json();
				const parsedBody = updateInvestmentSchema.safeParse(payload);
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
				const id = parsedParams.data.id;
				const updates: Partial<typeof investments.$inferInsert> = {
					...(parsedBody.data.name !== undefined && {
						name: parsedBody.data.name,
					}),
					...(parsedBody.data.investmentType !== undefined && {
						investmentType: parsedBody.data.investmentType,
					}),
					...(parsedBody.data.symbol !== undefined && {
						symbol: parsedBody.data.symbol ?? null,
					}),
					...(parsedBody.data.status !== undefined && {
						status: parsedBody.data.status,
					}),
				};

				const [updated] = await db
					.update(investments)
					.set(updates)
					.where(and(eq(investments.id, id), eq(investments.userId, user.id)))
					.returning();

				if (!updated) return json({ error: "Investment not found" }, 404);
				return json({ investment: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = investmentIdSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid investment id" }, 400);

				const user = await requireCurrentUser(request);
				const id = parsedParams.data.id;

				const [inv] = await db
					.select()
					.from(investments)
					.where(and(eq(investments.id, id), eq(investments.userId, user.id)))
					.limit(1);

				if (!inv) return json({ error: "Investment not found" }, 404);

				await db.transaction(async (tx) => {
					const relatedTxs = await tx
						.select()
						.from(transactions)
						.where(
							or(
								eq(transactions.accountId, inv.accountId),
								eq(transactions.transferAccountId, inv.accountId),
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
							(d) => d.accountId !== inv.accountId,
						);
						await applyBalanceAdjustments(tx, user.id, inverted);
						// Drop the transaction explicitly — transactions.transfer_account_id
						// is RESTRICT, so the account delete below would block otherwise.
						await tx.delete(transactions).where(eq(transactions.id, t.id));
					}

					await tx.delete(investments).where(eq(investments.id, inv.id));
					await tx.delete(accounts).where(eq(accounts.id, inv.accountId));
				});

				return json({ success: true });
			},
		},
	},
});
