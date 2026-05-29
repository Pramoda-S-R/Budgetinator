import { createFileRoute } from "@tanstack/react-router";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accounts, investments } from "#/db/schema";
import { pairedAccountName } from "#/lib/account-class";
import { requireCurrentUser } from "#/lib/server-auth";

const createInvestmentSchema = z.object({
	name: z.string().trim().min(1),
	investmentType: z.string().trim().min(1),
	symbol: z.string().trim().nullable().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investments/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const rows = await db
					.select({
						investment: investments,
						accountBalance: accounts.currentBalance,
						accountName: accounts.name,
					})
					.from(investments)
					.innerJoin(accounts, eq(accounts.id, investments.accountId))
					.where(eq(investments.userId, user.id))
					.orderBy(desc(investments.createdAt));

				return json({
					investments: rows.map((r) => ({
						...r.investment,
						currentValue: r.accountBalance,
						accountName: r.accountName,
					})),
				});
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createInvestmentSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const values = parsed.data;

				const created = await db.transaction(async (tx) => {
					const [pairedAccount] = await tx
						.insert(accounts)
						.values({
							userId: user.id,
							name: pairedAccountName({
								kind: "investment",
								label: values.name,
							}),
							accountType: "investment",
							currentBalance: "0",
							includeInNetWorth: true,
							isActive: true,
						})
						.returning();

					// Seed account_balance_history with the opening zero so net-worth
					// queries that JOIN the history table find a row.
					await tx.execute(sql`
						INSERT INTO account_balance_history (account_id, balance)
						VALUES (${pairedAccount.id}, 0)
					`);

					const [inv] = await tx
						.insert(investments)
						.values({
							userId: user.id,
							accountId: pairedAccount.id,
							name: values.name,
							investmentType: values.investmentType,
							symbol: values.symbol ?? null,
						})
						.returning();

					return inv;
				});

				return json({ investment: created }, 201);
			},
		},
	},
});
