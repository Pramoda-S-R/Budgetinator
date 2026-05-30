import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { contacts } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth.server";

const createContactSchema = z.object({
	name: z.string().trim().min(1),
	phone: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export const Route = createFileRoute("/api/contacts/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const rows = await db
					.select()
					.from(contacts)
					.where(eq(contacts.userId, user.id))
					.orderBy(desc(contacts.name));
				return Response.json({ contacts: rows });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createContactSchema.safeParse(payload);

				if (!parsed.success) {
					return Response.json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						{ status: 400 },
					);
				}

				const [created] = await db
					.insert(contacts)
					.values({
						userId: user.id,
						name: parsed.data.name,
						phone: parsed.data.phone ?? "",
						notes: parsed.data.notes ?? "",
					})
					.returning();

				return Response.json({ contact: created }, { status: 201 });
			},
		},
	},
});
