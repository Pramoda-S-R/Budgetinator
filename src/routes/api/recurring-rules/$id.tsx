import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { recurringRules } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const idSchema = z.object({ id: z.string().uuid() });

const updateSchema = z.object({
	description: z.string().trim().min(1).optional(),
	amount: z.coerce.number().positive().optional(),
	transactionType: z.enum(["income", "expense"]).optional(),
	frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
	nextRunDate: z.string().optional(),
	categoryId: z.string().uuid().nullable().optional(),
	accountId: z.string().uuid().nullable().optional(),
	isActive: z.boolean().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/recurring-rules/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const payload = await request.json();
				const parsedBody = updateSchema.safeParse(payload);
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
				const d = parsedBody.data;

				const updates: Partial<typeof recurringRules.$inferInsert> = {
					...(d.description ? { description: d.description } : {}),
					...(d.amount !== undefined ? { amount: d.amount.toFixed(2) } : {}),
					...(d.transactionType ? { transactionType: d.transactionType } : {}),
					...(d.frequency ? { frequency: d.frequency } : {}),
					...(d.nextRunDate ? { nextRunDate: new Date(d.nextRunDate) } : {}),
					...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
					...(d.accountId !== undefined ? { accountId: d.accountId } : {}),
					...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
				};

				const [updated] = await db
					.update(recurringRules)
					.set(updates)
					.where(
						and(
							eq(recurringRules.id, parsedParams.data.id),
							eq(recurringRules.userId, user.id),
						),
					)
					.returning();

				if (!updated) return json({ error: "Rule not found" }, 404);
				return json({ rule: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success) return json({ error: "Invalid id" }, 400);

				const user = await requireCurrentUser(request);
				const [deleted] = await db
					.delete(recurringRules)
					.where(
						and(
							eq(recurringRules.id, parsedParams.data.id),
							eq(recurringRules.userId, user.id),
						),
					)
					.returning({ id: recurringRules.id });

				if (!deleted) return json({ error: "Rule not found" }, 404);
				return json({ success: true });
			},
		},
	},
});
