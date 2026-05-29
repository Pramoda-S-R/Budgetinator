import { createFileRoute } from "@tanstack/react-router";
import { and, eq, like } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { investmentEntries, investments, transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	type TransactionType,
} from "#/lib/transaction-ledger";
import { applyBalanceAdjustments } from "../transactions/-helpers";

const entryIdSchema = z.object({ id: z.string().uuid() });

const updateEntrySchema = z
	.object({
		units: z.coerce.number().optional(),
		notes: z.string().trim().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field must be provided",
	});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/investment-entries/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				// Money-side fields (amountInvested, investedAt) are derived from the
				// linked transaction and are no longer editable here — delete and
				// re-create the entry to change the cash movement.  Only the
				// investment-specific metadata (units, notes) can be patched.
				const parsedParams = entryIdSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid entry id" }, 400);

				const payload = await request.json();
				const parsedBody = updateEntrySchema.safeParse(payload);
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
				const id = parsedParams.data.id;

				const existing = await db
					.select()
					.from(investmentEntries)
					.innerJoin(
						investments,
						eq(investmentEntries.investmentId, investments.id),
					)
					.where(
						and(eq(investmentEntries.id, id), eq(investments.userId, user.id)),
					)
					.limit(1);

				if (!existing.length) return json({ error: "Entry not found" }, 404);

				const updates: Partial<typeof investmentEntries.$inferInsert> = {};
				if ("units" in parsedBody.data) {
					updates.units =
						parsedBody.data.units !== undefined
							? parsedBody.data.units.toFixed(4)
							: null;
				}
				if ("notes" in parsedBody.data) {
					updates.notes = parsedBody.data.notes ?? "";
				}

				const [updated] = await db
					.update(investmentEntries)
					.set(updates)
					.where(eq(investmentEntries.id, id))
					.returning();

				return json({ entry: updated });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = entryIdSchema.safeParse(params);
				if (!parsedParams.success)
					return json({ error: "Invalid entry id" }, 400);

				const user = await requireCurrentUser(request);
				const id = parsedParams.data.id;

				const existing = await db
					.select({ entry: investmentEntries, investment: investments })
					.from(investmentEntries)
					.innerJoin(
						investments,
						eq(investmentEntries.investmentId, investments.id),
					)
					.where(
						and(eq(investmentEntries.id, id), eq(investments.userId, user.id)),
					)
					.limit(1);

				if (!existing.length) return json({ error: "Entry not found" }, 404);

				await db.transaction(async (tx) => {
					const linkedTxs = await tx
						.select()
						.from(transactions)
						.where(
							and(
								eq(transactions.userId, user.id),
								like(transactions.notes, `investment_entry:${id}`),
							),
						);

					for (const t of linkedTxs) {
						const deltas = combineAccountDeltas(
							buildTransactionDeltas({
								accountId: t.accountId,
								transferAccountId: t.transferAccountId,
								amount: Number(t.amount),
								transactionType: t.transactionType as TransactionType,
							}),
						);
						await applyBalanceAdjustments(tx, user.id, invertDeltas(deltas));
						await tx.delete(transactions).where(eq(transactions.id, t.id));
					}

					await tx
						.delete(investmentEntries)
						.where(eq(investmentEntries.id, id));
				});

				return json({ success: true });
			},
		},
	},
});
