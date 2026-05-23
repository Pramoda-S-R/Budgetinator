import { createFileRoute } from "@tanstack/react-router";
import { requireCurrentUser } from "#/lib/server-auth";
import { db } from "#/db";
import {
  monthlyBudgets,
  monthlyBudgetAllocations,
  categoryGroups,
  categories,
  transactions,
} from "#/db/schema";
import { and, sql, eq } from "drizzle-orm";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/dashboard/budget-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireCurrentUser(request);
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth() + 1;

        // allocated per category group for this month
        const allocs = await db
          .select({
            groupId: monthlyBudgetAllocations.categoryGroupId,
            groupName: categoryGroups.name,
            allocated: sql`coalesce(sum(${monthlyBudgetAllocations.allocatedAmount}), 0)`,
          })
          .from(monthlyBudgetAllocations)
          .leftJoin(
            monthlyBudgets,
            eq(monthlyBudgetAllocations.monthlyBudgetId, monthlyBudgets.id)
          )
          .leftJoin(
            categoryGroups,
            eq(monthlyBudgetAllocations.categoryGroupId, categoryGroups.id)
          )
          .where(
            and(
              eq(monthlyBudgets.userId, user.id),
              eq(monthlyBudgets.year, year),
              eq(monthlyBudgets.month, month),
            ),
          )
          .groupBy(
            monthlyBudgetAllocations.categoryGroupId,
            categoryGroups.name
          );

        // spent per category group this month
        const spends = await db
          .select({
            groupId: categoryGroups.id,
            spent: sql`coalesce(sum(${transactions.amount}), 0)`,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .leftJoin(
            categoryGroups,
            eq(categories.groupId, categoryGroups.id)
          )
          .where(
            and(
              eq(transactions.userId, user.id),
              sql`date_trunc('month', ${transactions.transactionDate}) = date_trunc('month', current_timestamp)`,
            ),
          )
          .groupBy(categoryGroups.id);

        // merge and compute utilization
        const budgetStatus = allocs.map((a) => {
          const spent = parseFloat(String(spends.find((s) => s.groupId === a.groupId)?.spent ?? 0));
          const allocated = parseFloat(String(a.allocated));
          const percent = allocated > 0
            ? ((spent / allocated) * 100).toFixed(2)
            : '0';
          return {
            groupId: a.groupId,
            groupName: a.groupName,
            allocated,
            spent,
            percent,
          };
        });
        return json({ budgetStatus });
      },
    },
  },
});
