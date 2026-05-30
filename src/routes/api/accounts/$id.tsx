import { createFileRoute } from "@tanstack/react-router";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, transactions } from "#/db/schema";
import { setAccountBalance } from "#/lib/financial-posting/account-balance";
import { requireCurrentUser } from "#/lib/server-auth";

const accountIdSchema = z.object({ id: z.string().uuid() });
const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const updateAccountSchema = z
	.object({
		name: z.string().trim().min(1).optional(),
		accountType: z.string().trim().min(1).optional(),
		currentBalance: z.coerce.number().optional(),
		creditLimit: z.union([z.coerce.number().positive(), z.null()]).optional(),
		nextBillingDate: z.union([localDateSchema, z.null()]).optional(),
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

function isTransferAccountDeleteConstraintError(error: unknown): boolean {
	let current: unknown = error;

	while (current && typeof current === "object") {
		const candidate = current as {
			code?: unknown;
			constraint?: unknown;
			cause?: unknown;
		};

		if (
			candidate.code === "23503" &&
			candidate.constraint === "transactions_transfer_account_id_accounts_id_fk"
		) {
			return true;
		}

		current = candidate.cause;
	}

	return false;
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
					...("creditLimit" in parsedBody.data
						? {
								creditLimit:
									typeof parsedBody.data.creditLimit === "number"
										? toNumericString(parsedBody.data.creditLimit)
										: null,
							}
						: {}),
					...("nextBillingDate" in parsedBody.data
						? { nextBillingDate: parsedBody.data.nextBillingDate }
						: {}),
				};

				const account = await db.transaction(async (tx) => {
					let updated: typeof accounts.$inferSelect | null = null;
					if (Object.keys(updates).length > 0) {
						const [record] = await tx
							.update(accounts)
							.set(updates)
							.where(
								and(eq(accounts.id, accountId), eq(accounts.userId, user.id)),
							)
							.returning();
						updated = record ?? null;
					} else {
						const [record] = await tx
							.select()
							.from(accounts)
							.where(
								and(eq(accounts.id, accountId), eq(accounts.userId, user.id)),
							)
							.limit(1);
						updated = record ?? null;
					}

					if (!updated) {
						return null;
					}

					if (
						"currentBalance" in parsedBody.data &&
						typeof parsedBody.data.currentBalance === "number"
					) {
						const nextBalance = toNumericString(parsedBody.data.currentBalance);
						await setAccountBalance(tx, {
							userId: user.id,
							accountId: updated.id,
							balance: nextBalance,
						});
						return { ...updated, currentBalance: nextBalance };
					}

					return updated;
				});

				if (!account) {
					return json({ error: "Account not found" }, 404);
				}

				return json({ account });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = accountIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid account id" }, 400);
				}

				const user = await requireCurrentUser(request);
				const accountId = parsedParams.data.id;

				const [referenceSummary] = await db
					.select({
						transferReferencesCount: sql<number>`count(*)::int`,
					})
					.from(transactions)
					.where(
						and(
							eq(transactions.userId, user.id),
							eq(transactions.transferAccountId, accountId),
						),
					);

				if ((referenceSummary?.transferReferencesCount ?? 0) > 0) {
					return json(
						{
							error:
								"Account is used by transfer transactions. Update or remove those transfers before deleting this account.",
						},
						409,
					);
				}

				try {
					const [deleted] = await db
						.delete(accounts)
						.where(
							and(eq(accounts.id, accountId), eq(accounts.userId, user.id)),
						)
						.returning({ id: accounts.id });

					if (!deleted) {
						return json({ error: "Account not found" }, 404);
					}

					return json({ success: true });
				} catch (error) {
					if (isTransferAccountDeleteConstraintError(error)) {
						return json(
							{
								error:
									"Account is used by transfer transactions. Update or remove those transfers before deleting this account.",
							},
							409,
						);
					}

					throw error;
				}
			},
		},
	},
});
