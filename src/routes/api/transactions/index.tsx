import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { db } from "#/db";
import { transactions } from "#/db/schema";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	toNumericString,
	transactionTypes,
} from "#/lib/transaction-ledger";
import {
	applyBalanceAdjustments,
	authorizeAccounts,
	authorizeCategory,
	fetchTransactionById,
	listTransactions,
	normalizeTags,
	syncTransactionTags,
} from "./-helpers";

const transactionDateSchema = z.coerce.date().optional();

const createTransactionSchema = z
	.object({
		accountId: z.string().uuid(),
		categoryId: z.string().uuid().optional(),
		amount: z.coerce.number().positive(),
		transactionType: z.enum(transactionTypes),
		transactionDate: transactionDateSchema,
		merchant: z.string().trim().optional().default(""),
		notes: z.string().trim().optional().default(""),
		isRecurring: z.boolean().optional().default(false),
		transferAccountId: z.string().uuid().optional(),
		tags: z.array(z.string().min(1)).optional(),
	})
	.superRefine((value, ctx) => {
		if (value.transactionType === "transfer") {
			if (!value.transferAccountId) {
				ctx.addIssue({
					code: "custom",
					path: ["transferAccountId"],
					message: "Transfer transactions require a destination account",
				});
				return;
			}

			if (value.transferAccountId === value.accountId) {
				ctx.addIssue({
					code: "custom",
					path: ["transferAccountId"],
					message: "Transfer target must differ from the source account",
				});
			}
		}
	});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

export const Route = createFileRoute("/api/transactions/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const { searchParams } = new URL(request.url);
				const limit = Math.max(
					1,
					Math.min(200, Number(searchParams.get("limit") ?? "60")),
				);
				const transactions = await listTransactions(db, user.id, limit);

				return json({ transactions });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createTransactionSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const { transferAccountId, tags, ...body } = parsed.data;
				const transactionDate = parsed.data.transactionDate ?? new Date();
				const normalizedTags = normalizeTags(tags);
				const accountsToAuthorize = [body.accountId, transferAccountId].filter(
					(value): value is string => Boolean(value),
				);

				const transaction = await db.transaction(async (tx) => {
					await authorizeAccounts(tx, user.id, accountsToAuthorize);
					await authorizeCategory(tx, user.id, parsed.data.categoryId ?? null);

					const [created] = await tx
						.insert(transactions)
						.values({
							userId: user.id,
							accountId: body.accountId,
							transferAccountId: transferAccountId ?? null,
							categoryId: parsed.data.categoryId ?? null,
							amount: toNumericString(body.amount),
							transactionType: body.transactionType,
							transactionDate,
							merchant: body.merchant,
							notes: body.notes,
							isRecurring: body.isRecurring,
						})
						.returning();

					const deltas = combineAccountDeltas(
						buildTransactionDeltas({
							accountId: body.accountId,
							amount: body.amount,
							transactionType: body.transactionType,
							transferAccountId: transferAccountId ?? null,
						}),
					);

					await applyBalanceAdjustments(tx, user.id, deltas);
					await syncTransactionTags(tx, created.id, normalizedTags);

					const detailed = await fetchTransactionById(tx, user.id, created.id);

					if (!detailed) {
						throw new Error("Unable to serialize transaction");
					}

					return detailed;
				});

				return json({ transaction }, 201);
			},
		},
	},
});
