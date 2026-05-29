import { createFileRoute } from "@tanstack/react-router";
import { sql } from "drizzle-orm";

import { db } from "#/db";
import { accountBalanceHistory, accounts } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/analytics/networth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const url = new URL(request.url);
        const months = Math.min(Number(url.searchParams.get("months") ?? "12"), 36);

        // Collect every date in the window on which any net-worth account had a balance
        // update, then for EACH of those dates sum the LAST KNOWN balance of EVERY
        // net-worth account (including ones that weren't updated that day).  This prevents
        // accounts from disappearing from the total on days they had no activity.
        const result = await db.execute(sql`
          WITH active_dates AS (
            SELECT DISTINCT DATE(abh.recorded_at) AS date
            FROM ${accountBalanceHistory} abh
            INNER JOIN ${accounts} a ON abh.account_id = a.id
            WHERE a.user_id    = ${user.id}
              AND a.include_in_net_worth = true
              AND abh.recorded_at >= NOW() - (INTERVAL '1 month' * ${months})
          ),
          user_accts AS (
            SELECT id
            FROM ${accounts}
            WHERE user_id = ${user.id}
              AND include_in_net_worth = true
          ),
          filled AS (
            SELECT
              d.date,
              (
                SELECT abh2.balance
                FROM ${accountBalanceHistory} abh2
                WHERE abh2.account_id = ua.id
                  AND DATE(abh2.recorded_at) <= d.date
                ORDER BY abh2.recorded_at DESC
                LIMIT 1
              ) AS balance
            FROM active_dates d
            CROSS JOIN user_accts ua
          )
          SELECT
            date::text            AS date,
            SUM(balance)::text    AS "netWorth"
          FROM filled
          WHERE balance IS NOT NULL
          GROUP BY date
          ORDER BY date
        `);

        const rows = (result as any).rows as Array<{ date: string; netWorth: string }>;
        return json({ history: rows });
      },
    },
  },
});
