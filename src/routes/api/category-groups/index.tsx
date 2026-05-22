import { createFileRoute } from "@tanstack/react-router";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { categoryGroups } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createCategoryGroupSchema = z.object({
	name: z.string().trim().min(1),
	type: z.string().trim().min(1),
	icon: z.string().trim().min(1).optional(),
	color: z.string().trim().min(1).optional(),
	sortOrder: z.coerce.number().int().nonnegative().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function includeArchivedFromUrl(request: Request) {
	const url = new URL(request.url);
	return url.searchParams.get("includeArchived") === "true";
}

export const Route = createFileRoute("/api/category-groups/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const includeArchived = includeArchivedFromUrl(request);

				const filters = [eq(categoryGroups.userId, user.id)];

				if (!includeArchived) {
					filters.push(eq(categoryGroups.isArchived, false));
				}

				const groups = await db
					.select()
					.from(categoryGroups)
					.where(and(...filters))
					.orderBy(
						asc(categoryGroups.sortOrder),
						desc(categoryGroups.createdAt),
					);

				return json({ categoryGroups: groups });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createCategoryGroupSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const [lastGroup] = await db
					.select({ sortOrder: categoryGroups.sortOrder })
					.from(categoryGroups)
					.where(eq(categoryGroups.userId, user.id))
					.orderBy(desc(categoryGroups.sortOrder))
					.limit(1);

				const [created] = await db
					.insert(categoryGroups)
					.values({
						userId: user.id,
						name: parsed.data.name,
						type: parsed.data.type,
						icon: parsed.data.icon ?? "folder",
						color: parsed.data.color ?? "#475569",
						sortOrder:
							parsed.data.sortOrder ?? (lastGroup?.sortOrder ?? -1) + 1,
					})
					.returning();

				return json({ categoryGroup: created }, 201);
			},
		},
	},
});
