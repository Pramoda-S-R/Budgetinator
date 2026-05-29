import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db";
import { categories, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/analytics/spending-trends")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const url = new URL(request.url);
				const months = Math.min(
					Number(url.searchParams.get("months") ?? "6"),
					24,
				);

				// Monthly spending per category
				const rows = await db
					.select({
						year: sql<number>`EXTRACT(YEAR FROM ${transactions.transactionDate})::int`,
						month: sql<number>`EXTRACT(MONTH FROM ${transactions.transactionDate})::int`,
						categoryId: transactions.categoryId,
						categoryName: categories.name,
						total: sql<string>`SUM(${transactions.amount})`,
					})
					.from(transactions)
					.leftJoin(categories, eq(transactions.categoryId, categories.id))
					.where(
						and(
							eq(transactions.userId, user.id),
							eq(transactions.transactionType, "expense"),
							sql`${transactions.transactionDate} >= NOW() - INTERVAL '1 month' * ${months}`,
						),
					)
					.groupBy(
						sql`EXTRACT(YEAR FROM ${transactions.transactionDate})`,
						sql`EXTRACT(MONTH FROM ${transactions.transactionDate})`,
						transactions.categoryId,
						categories.name,
					)
					.orderBy(
						sql`EXTRACT(YEAR FROM ${transactions.transactionDate})`,
						sql`EXTRACT(MONTH FROM ${transactions.transactionDate})`,
					);

				return json({ trends: rows });
			},
		},
	},
});
