import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accountBalanceHistory, accounts } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";

const accountIdSchema = z.object({ id: z.string().uuid() });

const updateAccountSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		accountType: z.string().trim().min(1).optional(),
		currentBalance: z.coerce.number().optional(),
		includeInNetWorth: z.boolean().optional(),
		isActive: z.boolean().optional(),
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

function toNumericString(value: number) {
	return value.toFixed(2);
}

export const Route = createFileRoute("/api/accounts/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = accountIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid account id" }, 400);
				}

				const payload = await request.json();
				const parsedBody = updateAccountSchema.safeParse(payload);

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
				const accountId = parsedParams.data.id;

				const updates: Partial<typeof accounts.$inferInsert> = {
					...("name" in parsedBody.data ? { name: parsedBody.data.name } : {}),
					...("accountType" in parsedBody.data
						? { accountType: parsedBody.data.accountType }
						: {}),
					...("includeInNetWorth" in parsedBody.data
						? { includeInNetWorth: parsedBody.data.includeInNetWorth }
						: {}),
					...("isActive" in parsedBody.data
						? { isActive: parsedBody.data.isActive }
						: {}),
					...("currentBalance" in parsedBody.data
						? {
								currentBalance: toNumericString(
									parsedBody.data.currentBalance as number,
								),
							}
						: {}),
				};

				const [updated] = await db
					.update(accounts)
					.set(updates)
					.where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
					.returning();

				if (!updated) {
					return json({ error: "Account not found" }, 404);
				}

				if (
					"currentBalance" in parsedBody.data &&
					typeof parsedBody.data.currentBalance === "number"
				) {
					await db.insert(accountBalanceHistory).values({
						accountId: updated.id,
						balance: updated.currentBalance,
					});
				}

				return json({ account: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = accountIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid account id" }, 400);
				}

				const user = await requireCurrentUser(request);
				const accountId = parsedParams.data.id;

				const [deleted] = await db
					.delete(accounts)
					.where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id)))
					.returning({ id: accounts.id });

				if (!deleted) {
					return json({ error: "Account not found" }, 404);
				}

				return json({ success: true });
			},
		},
	},
});
