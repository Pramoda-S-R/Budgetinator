import { createFileRoute } from "@tanstack/react-router";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { categories, categoryGroups } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const createCategorySchema = z.object({
	groupId: z.string().uuid(),
	name: z.string().trim().min(1),
	icon: z.string().trim().min(1).optional(),
	color: z.string().trim().min(1).optional(),
	transactionType: z.string().trim().min(1),
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

export const Route = createFileRoute("/api/categories/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const includeArchived = includeArchivedFromUrl(request);

				const filters = [eq(categories.userId, user.id)];

				if (!includeArchived) {
					filters.push(eq(categories.isArchived, false));
				}

				const rows = await db
					.select({
						id: categories.id,
						userId: categories.userId,
						groupId: categories.groupId,
						name: categories.name,
						icon: categories.icon,
						color: categories.color,
						transactionType: categories.transactionType,
						sortOrder: categories.sortOrder,
						isArchived: categories.isArchived,
						createdAt: categories.createdAt,
						groupName: categoryGroups.name,
					})
					.from(categories)
					.innerJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
					.where(and(...filters))
					.orderBy(asc(categories.sortOrder), desc(categories.createdAt));

				return json({ categories: rows });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createCategorySchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const [group] = await db
					.select({ id: categoryGroups.id })
					.from(categoryGroups)
					.where(
						and(
							eq(categoryGroups.id, parsed.data.groupId),
							eq(categoryGroups.userId, user.id),
						),
					)
					.limit(1);

				if (!group) {
					return json({ error: "Category group not found" }, 404);
				}

				const [lastCategory] = await db
					.select({ sortOrder: categories.sortOrder })
					.from(categories)
					.where(
						and(
							eq(categories.userId, user.id),
							eq(categories.groupId, parsed.data.groupId),
						),
					)
					.orderBy(desc(categories.sortOrder))
					.limit(1);

				const [created] = await db
					.insert(categories)
					.values({
						userId: user.id,
						groupId: parsed.data.groupId,
						name: parsed.data.name,
						icon: parsed.data.icon ?? "tag",
						color: parsed.data.color ?? "#64748b",
						transactionType: parsed.data.transactionType,
						sortOrder:
							parsed.data.sortOrder ?? (lastCategory?.sortOrder ?? -1) + 1,
					})
					.returning();

				return json({ category: created }, 201);
			},
		},
	},
});
