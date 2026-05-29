import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db";
import { transactions, categories, categoryGroups } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/analytics/category-breakdown")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const url = new URL(request.url);

        const now = new Date();
        const year = Number(url.searchParams.get("year") ?? now.getFullYear());
        const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);

        const rows = await db
          .select({
            categoryId: transactions.categoryId,
            categoryName: categories.name,
            categoryColor: categories.color,
            groupName: categoryGroups.name,
            total: sql<string>`SUM(${transactions.amount})`,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .leftJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
          .where(
            and(
              eq(transactions.userId, user.id),
              eq(transactions.transactionType, "expense"),
              sql`EXTRACT(YEAR FROM ${transactions.transactionDate}) = ${year}`,
              sql`EXTRACT(MONTH FROM ${transactions.transactionDate}) = ${month}`,
            ),
          )
          .groupBy(
            transactions.categoryId,
            categories.name,
            categories.color,
            categoryGroups.name,
          )
          .orderBy(sql`SUM(${transactions.amount}) DESC`);

        const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

        const breakdown = rows.map((r) => ({
          ...r,
          percent: grandTotal > 0 ? Math.round((Number(r.total) / grandTotal) * 100) : 0,
        }));

        return json({ breakdown, grandTotal: grandTotal.toFixed(2), year, month });
      },
    },
  },
});
