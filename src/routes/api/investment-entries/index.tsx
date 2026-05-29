import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investmentEntries, investments, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	toNumericString,
} from "#/lib/transaction-ledger";
import {
	applyBalanceAdjustments,
	authorizeAccounts,
	authorizeCategory,
} from "../transactions/-helpers";

const createInvestmentEntrySchema = z.object({
	investmentId: z.string().uuid(),
	accountId: z.string().uuid(), // source bank account funding the buy
	categoryId: z.string().uuid().nullable().optional(),
	amountInvested: z.coerce.number().positive(),
	units: z.coerce.number().optional(),
	investedAt: z.coerce.date().optional(),
	notes: z.string().trim().optional().default(""),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investment-entries/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const entries = await db
					.select({
						id: investmentEntries.id,
						investmentId: investmentEntries.investmentId,
						amountInvested: investmentEntries.amountInvested,
						units: investmentEntries.units,
						investedAt: investmentEntries.investedAt,
						notes: investmentEntries.notes,
					})
					.from(investmentEntries)
					.innerJoin(
						investments,
						eq(investmentEntries.investmentId, investments.id),
					)
					.where(eq(investments.userId, user.id))
					.orderBy(desc(investmentEntries.investedAt));
				return json({ entries });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createInvestmentEntrySchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const {
					investmentId,
					accountId,
					categoryId,
					amountInvested,
					units,
					investedAt,
					notes,
				} = parsed.data;

				const [investment] = await db
					.select()
					.from(investments)
					.where(
						and(
							eq(investments.id, investmentId),
							eq(investments.userId, user.id),
						),
					)
					.limit(1);

				if (!investment) return json({ error: "Investment not found" }, 404);

				await authorizeAccounts(db, user.id, [accountId]);
				await authorizeCategory(db, user.id, categoryId ?? null);

				const txDate = investedAt ?? new Date();

				const created = await db.transaction(async (tx) => {
					const [entry] = await tx
						.insert(investmentEntries)
						.values({
							investmentId,
							amountInvested: toNumericString(amountInvested),
							units: units !== undefined ? units.toFixed(4) : null,
							investedAt: txDate,
							notes,
						})
						.returning();

					// Transfer FROM bank TO the investment account: bank shrinks, the
					// investment's holding (current_balance) grows by the cash invested.
					await tx.insert(transactions).values({
						userId: user.id,
						accountId,
						transferAccountId: investment.accountId,
						categoryId: categoryId ?? null,
						amount: toNumericString(amountInvested),
						transactionType: "transfer",
						transactionDate: txDate,
						merchant: `Invest: ${investment.name}`,
						notes: `investment_entry:${entry.id}`,
						isRecurring: false,
					});

					const deltas = combineAccountDeltas(
						buildTransactionDeltas({
							accountId,
							transferAccountId: investment.accountId,
							amount: amountInvested,
							transactionType: "transfer",
						}),
					);
					await applyBalanceAdjustments(tx, user.id, deltas);

					return entry;
				});

				return json({ entry: created }, 201);
			},
		},
	},
});
