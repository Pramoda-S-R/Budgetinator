import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accountBalanceHistory, accounts, investments } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

// "Valuations" are now thin views over `account_balance_history` rows for the
// investment's paired account.  POST sets a new current value (updates the
// account's `current_balance` AND appends a history row).  The on-the-wire
// shape matches the legacy {valuationAmount, valuationDate, investmentId}
// payload so the existing UI continues to work unchanged.

const createValuationSchema = z.object({
	investmentId: z.string().uuid(),
	valuationAmount: z.coerce.number(),
	valuationDate: z.coerce.date().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investment-valuations/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const rows = await db
					.select({
						id: accountBalanceHistory.id,
						investmentId: investments.id,
						valuationAmount: accountBalanceHistory.balance,
						valuationDate: accountBalanceHistory.recordedAt,
					})
					.from(accountBalanceHistory)
					.innerJoin(accounts, eq(accountBalanceHistory.accountId, accounts.id))
					.innerJoin(investments, eq(investments.accountId, accounts.id))
					.where(eq(investments.userId, user.id))
					.orderBy(desc(accountBalanceHistory.recordedAt));
				return json({ valuations: rows });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createValuationSchema.safeParse(payload);
				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const { investmentId, valuationAmount, valuationDate } = parsed.data;
				const [inv] = await db
					.select({ accountId: investments.accountId })
					.from(investments)
					.where(
						and(
							eq(investments.id, investmentId),
							eq(investments.userId, user.id),
						),
					)
					.limit(1);

				if (!inv) return json({ error: "Investment not found" }, 404);

				const created = await db.transaction(async (tx) => {
					await tx
						.update(accounts)
						.set({ currentBalance: valuationAmount.toFixed(2) })
						.where(eq(accounts.id, inv.accountId));

					const [history] = await tx
						.insert(accountBalanceHistory)
						.values({
							accountId: inv.accountId,
							balance: valuationAmount.toFixed(2),
							...(valuationDate ? { recordedAt: valuationDate } : {}),
						})
						.returning();

					return history;
				});

				return json(
					{
						valuation: {
							id: created.id,
							investmentId,
							valuationAmount: created.balance,
							valuationDate: created.recordedAt,
						},
					},
					201,
				);
			},
		},
	},
});
