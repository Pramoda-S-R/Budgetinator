import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { contacts } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth.server";

const idSchema = z.object({ id: z.string().uuid() });

const updateSchema = z.object({
	name: z.string().trim().min(1).optional(),
	phone: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export const Route = createFileRoute("/api/contacts/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success)
					return Response.json({ error: "Invalid id" }, { status: 400 });

				const payload = await request.json();
				const parsedBody = updateSchema.safeParse(payload);
				if (!parsedBody.success) {
					return Response.json(
						{
							error: "Invalid request body",
							issues: parsedBody.error.flatten(),
						},
						{ status: 400 },
					);
				}

				const user = await requireCurrentUser(request);
				const [updated] = await db
					.update(contacts)
					.set(parsedBody.data)
					.where(
						and(
							eq(contacts.id, parsedParams.data.id),
							eq(contacts.userId, user.id),
						),
					)
					.returning();

				if (!updated)
					return Response.json({ error: "Contact not found" }, { status: 404 });
				return Response.json({ contact: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = idSchema.safeParse(params);
				if (!parsedParams.success)
					return Response.json({ error: "Invalid id" }, { status: 400 });

				const user = await requireCurrentUser(request);
				const [deleted] = await db
					.delete(contacts)
					.where(
						and(
							eq(contacts.id, parsedParams.data.id),
							eq(contacts.userId, user.id),
						),
					)
					.returning({ id: contacts.id });

				if (!deleted)
					return Response.json({ error: "Contact not found" }, { status: 404 });
				return Response.json({ success: true });
			},
		},
	},
});
