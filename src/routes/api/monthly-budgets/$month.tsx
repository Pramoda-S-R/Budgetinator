import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
	categories,
	categoryGroups,
	monthlyBudgetAllocations,
	monthlyBudgets,
} from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const monthParamSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/monthly-budgets/$month")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const parsedParams = monthParamSchema.safeParse(params);
				if (!parsedParams.success) {
					return json({ error: "Invalid month format" }, 400);
				}
				const user = await requireCurrentUser(request);
				const [year, mon] = parsedParams.data.month.split("-").map(Number);
				const [budget] = await db
					.select()
					.from(monthlyBudgets)
					.where(
						and(
							eq(monthlyBudgets.userId, user.id),
							eq(monthlyBudgets.year, year),
							eq(monthlyBudgets.month, mon),
						),
					)
					.limit(1);
				if (!budget) {
					return json({ error: "Budget not found" }, 404);
				}
				const allocations = await db
					.select({
						id: monthlyBudgetAllocations.id,
						allocatedAmount: monthlyBudgetAllocations.allocatedAmount,
						categoryId: monthlyBudgetAllocations.categoryId,
						categoryName: categories.name,
						categoryGroupId: monthlyBudgetAllocations.categoryGroupId,
						categoryGroupName: categoryGroups.name,
					})
					.from(monthlyBudgetAllocations)
					.leftJoin(
						categories,
						eq(monthlyBudgetAllocations.categoryId, categories.id),
					)
					.leftJoin(
						categoryGroups,
						eq(monthlyBudgetAllocations.categoryGroupId, categoryGroups.id),
					)
					.where(eq(monthlyBudgetAllocations.monthlyBudgetId, budget.id));
				return json({ monthlyBudget: budget, allocations });
			},

			PATCH: async ({ request, params }) => {
				const parsedParams = monthParamSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid month format" }, 400);
				const user = await requireCurrentUser(request);
				const [year, mon] = parsedParams.data.month.split("-").map(Number);
				const payload = await request.json();
				const parsed = z
					.object({ expectedIncome: z.coerce.number().min(0) })
					.safeParse(payload);
				if (!parsed.success) return json({ error: "Invalid body" }, 400);

				const [budget] = await db
					.select()
					.from(monthlyBudgets)
					.where(
						and(
							eq(monthlyBudgets.userId, user.id),
							eq(monthlyBudgets.year, year),
							eq(monthlyBudgets.month, mon),
						),
					)
					.limit(1);
				if (!budget) return json({ error: "Budget not found" }, 404);

				const [updated] = await db
					.update(monthlyBudgets)
					.set({ expectedIncome: parsed.data.expectedIncome.toFixed(2) })
					.where(eq(monthlyBudgets.id, budget.id))
					.returning();

				return json({ monthlyBudget: updated });
			},

			DELETE: async ({ request, params }) => {
				const parsedParams = monthParamSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid month format" }, 400);
				const user = await requireCurrentUser(request);
				const [year, mon] = parsedParams.data.month.split("-").map(Number);

				const [budget] = await db
					.select()
					.from(monthlyBudgets)
					.where(
						and(
							eq(monthlyBudgets.userId, user.id),
							eq(monthlyBudgets.year, year),
							eq(monthlyBudgets.month, mon),
						),
					)
					.limit(1);
				if (!budget) return json({ error: "Budget not found" }, 404);

				await db.delete(monthlyBudgets).where(eq(monthlyBudgets.id, budget.id));
				return json({ success: true });
			},
		},
	},
});
