import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts } from "#/db/schema";
import { settleDueCreditCardCycles } from "#/lib/credit-card-billing.server";
import { setAccountBalance } from "#/lib/financial-posting/account-balance";
import { requireCurrentUser } from "#/lib/server-auth";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createAccountSchema = z.object({
	name: z.string().trim().min(1),
	accountType: z.string().trim().min(1),
	currentBalance: z.coerce.number(),
	creditLimit: z.coerce.number().positive().optional(),
	nextBillingDate: localDateSchema.optional(),
	recordedAt: z.coerce.date().optional(),
	includeInNetWorth: z.boolean().optional(),
	isActive: z.boolean().optional(),
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

export const Route = createFileRoute("/api/accounts/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				await settleDueCreditCardCycles(user.id);

				const userAccounts = await db
					.select()
					.from(accounts)
					.where(eq(accounts.userId, user.id))
					.orderBy(desc(accounts.createdAt));

				const [summary] = await db
					.select({
						totalNetWorth: sql<string>`COALESCE(SUM(CASE WHEN ${accounts.includeInNetWorth} THEN ${accounts.currentBalance} ELSE 0 END), 0)`,
					})
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, user.id),
							eq(accounts.isActive, true),
							sql`${accounts.accountType} <> 'credit_card'`,
						),
					);

				return json({
					accounts: userAccounts,
					totalNetWorth: summary?.totalNetWorth ?? "0",
				});
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createAccountSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const values = parsed.data;
				const includeInNetWorth =
					values.accountType === "credit_card"
						? false
						: (values.includeInNetWorth ?? true);

				const created = await db.transaction(async (tx) => {
					const [account] = await tx
						.insert(accounts)
						.values({
							userId: user.id,
							name: values.name,
							accountType: values.accountType,
							currentBalance: "0.00",
							...(typeof values.creditLimit === "number"
								? { creditLimit: toNumericString(values.creditLimit) }
								: {}),
							...(values.nextBillingDate
								? { nextBillingDate: values.nextBillingDate }
								: {}),
							includeInNetWorth,
							isActive: values.isActive ?? true,
						})
						.returning();

					if (!account) {
						throw new Error("Unable to create account");
					}

					const balance = toNumericString(values.currentBalance);
					await setAccountBalance(tx, {
						userId: user.id,
						accountId: account.id,
						balance,
						...(values.recordedAt ? { recordedAt: values.recordedAt } : {}),
					});

					return {
						...account,
						currentBalance: balance,
					};
				});

				return json({ account: created }, 201);
			},
		},
	},
});
