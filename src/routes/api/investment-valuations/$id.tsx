import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accountBalanceHistory, accounts, investments } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const valuationIdSchema = z.object({ id: z.string().uuid() });

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investment-valuations/$id")({
	server: {
		handlers: {
			// Deleting a "valuation" deletes the history row and rolls the investment
			// account's current balance back to whatever the next-most-recent history
			// row says (zero if none remain).  Useful for undoing a fat-fingered value
			// update without losing the entry trail.
			DELETE: async ({ request, params }) => {
				const parsedParams = valuationIdSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid valuation id" }, 400);

				const user = await requireCurrentUser(request);
				const id = parsedParams.data.id;

				const [row] = await db
					.select({
						history: accountBalanceHistory,
						accountId: accounts.id,
					})
					.from(accountBalanceHistory)
					.innerJoin(accounts, eq(accountBalanceHistory.accountId, accounts.id))
					.innerJoin(investments, eq(investments.accountId, accounts.id))
					.where(
						and(
							eq(accountBalanceHistory.id, id),
							eq(investments.userId, user.id),
						),
					)
					.limit(1);

				if (!row) return json({ error: "Valuation not found" }, 404);

				await db.transaction(async (tx) => {
					await tx
						.delete(accountBalanceHistory)
						.where(eq(accountBalanceHistory.id, id));

					const [latest] = await tx
						.select({ balance: accountBalanceHistory.balance })
						.from(accountBalanceHistory)
						.where(eq(accountBalanceHistory.accountId, row.accountId))
						.orderBy(desc(accountBalanceHistory.recordedAt))
						.limit(1);

					await tx
						.update(accounts)
						.set({ currentBalance: latest?.balance ?? "0" })
						.where(eq(accounts.id, row.accountId));
				});

				return json({ success: true });
			},
		},
	},
});
