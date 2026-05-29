import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
	monthlyBudgetAllocations,
	monthlyBudgets,
	presetAllocations,
} from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const applyPresetSchema = z.object({
	presetId: z.string().uuid(),
	year: z.coerce.number().int().min(1970),
	month: z.coerce.number().int().min(1).max(12),
	expectedIncome: z.coerce.number().min(0).optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/monthly-budgets/apply-preset")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = applyPresetSchema.safeParse(payload);
				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}
				const { presetId, year, month, expectedIncome } = parsed.data;
				const result = await db.transaction(async (tx) => {
					const existing = await tx
						.select({ id: monthlyBudgets.id })
						.from(monthlyBudgets)
						.where(
							and(
								eq(monthlyBudgets.userId, user.id),
								eq(monthlyBudgets.year, year),
								eq(monthlyBudgets.month, month),
							),
						)
						.limit(1);
					const budgetId = existing.length
						? existing[0].id
						: (
								await tx
									.insert(monthlyBudgets)
									.values({
										userId: user.id,
										presetId,
										year,
										month,
										expectedIncome: String(expectedIncome ?? 0),
									})
									.returning()
							)[0].id;
					await tx
						.delete(monthlyBudgetAllocations)
						.where(eq(monthlyBudgetAllocations.monthlyBudgetId, budgetId));
					const presetRows = await tx
						.select({
							categoryGroupId: presetAllocations.categoryGroupId,
							categoryId: presetAllocations.categoryId,
							allocatedAmount: presetAllocations.allocatedAmount,
						})
						.from(presetAllocations)
						.where(eq(presetAllocations.presetId, presetId));
					await tx.insert(monthlyBudgetAllocations).values(
						presetRows.map((a) => ({
							monthlyBudgetId: budgetId,
							categoryGroupId: a.categoryGroupId ?? null,
							categoryId: a.categoryId ?? null,
							allocatedAmount: String(a.allocatedAmount),
						})),
					);
					const [monthlyBudget] = await tx
						.select()
						.from(monthlyBudgets)
						.where(eq(monthlyBudgets.id, budgetId))
						.limit(1);
					const allocations = await tx
						.select()
						.from(monthlyBudgetAllocations)
						.where(eq(monthlyBudgetAllocations.monthlyBudgetId, budgetId));
					return { monthlyBudget, allocations };
				});
				return json(result, 201);
			},
		},
	},
});
