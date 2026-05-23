import { createFileRoute } from "@tanstack/react-router";
import { requireCurrentUser } from "#/lib/server-auth";
import { db } from "#/db";
import { transactions } from "#/db/schema";
import { and, sql, eq } from "drizzle-orm";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/dashboard/cashflow")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        // aggregate daily net cashflow for current month
        const rows = await db
          .select({
            day: sql`date_trunc('day', ${transactions.transactionDate})`,
            net: sql`
              coalesce(sum(
                case when ${transactions.transactionType}='income' then ${transactions.amount}
                else -${transactions.amount} end
              ), 0)
            `,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, user.id),
              sql`date_trunc('month', ${transactions.transactionDate}) = date_trunc('month', current_timestamp)`,
            ),
          )
          .groupBy(sql`date_trunc('day', ${transactions.transactionDate})`)
          .orderBy(sql`date_trunc('day', ${transactions.transactionDate})`);

        const cashflow = rows.map((r) => ({
          date: new Date(String(r.day)).toISOString(),
          net: r.net,
        }));
        return json({ cashflow });
      },
    },
  },
});
