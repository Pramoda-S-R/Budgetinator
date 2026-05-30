import { eq } from "drizzle-orm";

import { db } from "#/db";
import { users } from "#/db/schema";
import { fetchNeonSessionUser } from "#/lib/neon-auth-session.server";

export async function requireCurrentUser(request: Request) {
	const sessionUser = await fetchNeonSessionUser(request);

	if (!sessionUser?.id) {
		throw new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "content-type": "application/json" },
		});
	}

	const name =
		sessionUser.name?.trim() || sessionUser.email || "Budgetinator User";
	const email = sessionUser.email ?? `${sessionUser.id}@local.budgetinator.dev`;

	const [existingById] = await db
		.select()
		.from(users)
		.where(eq(users.id, sessionUser.id))
		.limit(1);

	if (existingById) {
		if (existingById.email === email && existingById.name === name) {
			return existingById;
		}

		try {
			const [updatedById] = await db
				.update(users)
				.set({
					email,
					name,
				})
				.where(eq(users.id, sessionUser.id))
				.returning();

			if (updatedById) {
				return updatedById;
			}
		} catch {
			const [existingByEmailFromUpdate] = await db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (existingByEmailFromUpdate) {
				return existingByEmailFromUpdate;
			}
		}
	}

	const [existingByEmail] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existingByEmail && existingByEmail.id !== sessionUser.id) {
		const [updatedByEmail] = await db
			.update(users)
			.set({ name })
			.where(eq(users.id, existingByEmail.id))
			.returning();

		return updatedByEmail ?? existingByEmail;
	}

	await db
		.insert(users)
		.values({
			id: sessionUser.id,
			email,
			name,
			currencyCode: "INR",
			timezone: "UTC",
		})
		.onConflictDoNothing();

	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (!user) {
		throw new Response(JSON.stringify({ error: "User not found" }), {
			status: 404,
			headers: { "content-type": "application/json" },
		});
	}

	return user;
}
