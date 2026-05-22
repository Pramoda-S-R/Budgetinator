import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	toNumericString,
	transactionTypes,
} from "#/lib/transaction-ledger";
import {
	applyBalanceAdjustments,
	authorizeAccounts,
	authorizeCategory,
	fetchTransactionById,
	fetchTransactionRecord,
	normalizeTags,
	syncTransactionTags,
} from "./-helpers";

const transactionIdSchema = z.object({ id: z.string().uuid() });

const transactionDateSchema = z.coerce.date().optional();

const updateTransactionSchema = z
	.object({
		accountId: z.string().uuid().optional(),
		categoryId: z.string().uuid().optional(),
		amount: z.coerce.number().positive().optional(),
		transactionType: z.enum(transactionTypes).optional(),
		transactionDate: transactionDateSchema,
		merchant: z.string().trim().optional(),
		notes: z.string().trim().optional(),
		isRecurring: z.boolean().optional(),
		transferAccountId: z.string().uuid().optional(),
		tags: z.array(z.string().min(1)).optional(),
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

export const Route = createFileRoute("/api/transactions/$id")({
	server: {
		handlers: {
			PATCH: async ({ request, params }) => {
				const parsedParams = transactionIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid transaction id" }, 400);
				}

				const payload = await request.json();
				const parsedBody = updateTransactionSchema.safeParse(payload);

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
				const transactionId = parsedParams.data.id;
				const normalizedTags =
					parsedBody.data.tags === undefined
						? undefined
						: normalizeTags(parsedBody.data.tags);

				const updatedTransaction = await db.transaction(async (tx) => {
					const existing = await fetchTransactionRecord(
						tx,
						user.id,
						transactionId,
					);

					if (!existing) {
						return null;
					}

					const updates: Record<string, unknown> = {};

					if ("accountId" in parsedBody.data && parsedBody.data.accountId) {
						updates.accountId = parsedBody.data.accountId;
					}

					if ("categoryId" in parsedBody.data) {
						updates.categoryId = parsedBody.data.categoryId ?? null;
					}

					if (
						"amount" in parsedBody.data &&
						parsedBody.data.amount !== undefined
					) {
						updates.amount = toNumericString(parsedBody.data.amount);
					}

					if (
						"transactionType" in parsedBody.data &&
						parsedBody.data.transactionType
					) {
						updates.transactionType = parsedBody.data.transactionType;
					}

					if (
						"transactionDate" in parsedBody.data &&
						parsedBody.data.transactionDate
					) {
						updates.transactionDate = parsedBody.data.transactionDate;
					}

					if (
						"merchant" in parsedBody.data &&
						parsedBody.data.merchant !== undefined
					) {
						updates.merchant = parsedBody.data.merchant;
					}

					if (
						"notes" in parsedBody.data &&
						parsedBody.data.notes !== undefined
					) {
						updates.notes = parsedBody.data.notes;
					}

					if (
						"isRecurring" in parsedBody.data &&
						parsedBody.data.isRecurring !== undefined
					) {
						updates.isRecurring = parsedBody.data.isRecurring;
					}

					if ("transferAccountId" in parsedBody.data) {
						updates.transferAccountId =
							parsedBody.data.transferAccountId ?? null;
					}

					const merged = {
						accountId: updates.accountId ?? existing.accountId,
						transferAccountId:
							"transferAccountId" in parsedBody.data
								? (parsedBody.data.transferAccountId ?? null)
								: existing.transferAccountId,
						categoryId:
							"categoryId" in parsedBody.data
								? (parsedBody.data.categoryId ?? null)
								: existing.categoryId,
						transactionType:
							updates.transactionType ??
							(existing.transactionType as (typeof transactionTypes)[number]),
						amount: updates.amount ?? existing.amount,
					};

					if (merged.transactionType === "transfer") {
						if (!merged.transferAccountId) {
							throw new Response(
								JSON.stringify({
									error: "Transfer transactions require a destination account",
								}),
								{
									status: 400,
									headers: { "content-type": "application/json" },
								},
							);
						}

						if (merged.transferAccountId === merged.accountId) {
							throw new Response(
								JSON.stringify({
									error: "Transfer target must differ from the source account",
								}),
								{
									status: 400,
									headers: { "content-type": "application/json" },
								},
							);
						}
					}

					const accountsToAuthorize = [merged.accountId]
						.concat(merged.transferAccountId ? [merged.transferAccountId] : [])
						.filter(Boolean) as string[];

					await authorizeAccounts(tx, user.id, accountsToAuthorize);
					await authorizeCategory(tx, user.id, merged.categoryId ?? null);

					const [updated] = await tx
						.update(transactions)
						.set(updates)
						.where(
							and(
								eq(transactions.id, transactionId),
								eq(transactions.userId, user.id),
							),
						)
						.returning();

					const oldDeltas = buildTransactionDeltas({
						accountId: existing.accountId,
						amount: Number(existing.amount),
						transactionType:
							existing.transactionType as (typeof transactionTypes)[number],
						transferAccountId: existing.transferAccountId,
					});

					const newDeltas = buildTransactionDeltas({
						accountId: updated.accountId,
						amount: Number(updated.amount),
						transactionType:
							updated.transactionType as (typeof transactionTypes)[number],
						transferAccountId: updated.transferAccountId,
					});

					const deltas = combineAccountDeltas([
						...invertDeltas(oldDeltas),
						...newDeltas,
					]);
					await applyBalanceAdjustments(tx, user.id, deltas);

					if (parsedBody.data.tags !== undefined) {
						await syncTransactionTags(tx, transactionId, normalizedTags ?? []);
					}

					return fetchTransactionById(tx, user.id, transactionId);
				});

				if (!updatedTransaction) {
					return json({ error: "Transaction not found" }, 404);
				}

				return json({ transaction: updatedTransaction });
			},
			DELETE: async ({ request, params }) => {
				const parsedParams = transactionIdSchema.safeParse(params);

				if (!parsedParams.success) {
					return json({ error: "Invalid transaction id" }, 400);
				}

				const user = await requireCurrentUser(request);
				const transactionId = parsedParams.data.id;

				const deleted = await db.transaction(async (tx) => {
					const record = await fetchTransactionRecord(
						tx,
						user.id,
						transactionId,
					);

					if (!record) {
						return null;
					}

					const oldDeltas = buildTransactionDeltas({
						accountId: record.accountId,
						amount: Number(record.amount),
						transactionType:
							record.transactionType as (typeof transactionTypes)[number],
						transferAccountId: record.transferAccountId,
					});

					const adjustments = combineAccountDeltas(invertDeltas(oldDeltas));

					await applyBalanceAdjustments(tx, user.id, adjustments);

					const [removed] = await tx
						.delete(transactions)
						.where(
							and(
								eq(transactions.id, transactionId),
								eq(transactions.userId, user.id),
							),
						)
						.returning({ id: transactions.id });

					return removed ? removed.id : null;
				});

				if (!deleted) {
					return json({ error: "Transaction not found" }, 404);
				}

				return json({ success: true });
			},
		},
	},
});
