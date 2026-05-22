import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { categoryGroups } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const categoryGroupIdSchema = z.object({ id: z.string().uuid() });

const updateCategoryGroupSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		type: z.string().trim().min(1).optional(),
		icon: z.string().trim().min(1).optional(),
		color: z.string().trim().min(1).optional(),
		sortOrder: z.coerce.number().int().nonnegative().optional(),
		isArchived: z.boolean().optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: "At least one field must be provided",
	});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/category-groups/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = categoryGroupIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid category group id" }, 400);
				}

				const payload = await request.json();
				const parsedBody = updateCategoryGroupSchema.safeParse(payload);

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

				const [updated] = await db
					.update(categoryGroups)
					.set(parsedBody.data)
					.where(
						and(
							eq(categoryGroups.id, parsedParams.data.id),
							eq(categoryGroups.userId, user.id),
						),
					)
					.returning();

				if (!updated) {
					return json({ error: "Category group not found" }, 404);
				}

				return json({ categoryGroup: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = categoryGroupIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid category group id" }, 400);
				}

				const user = await requireCurrentUser(request);

				const [deleted] = await db
					.delete(categoryGroups)
					.where(
						and(
							eq(categoryGroups.id, parsedParams.data.id),
							eq(categoryGroups.userId, user.id),
						),
					)
					.returning({ id: categoryGroups.id });

				if (!deleted) {
					return json({ error: "Category group not found" }, 404);
				}

				return json({ success: true });
			},
		},
	},
});
