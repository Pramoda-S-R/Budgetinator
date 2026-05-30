import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { db } from "#/db";
import { createPostgresFinancialPostingAdapter } from "#/lib/financial-posting/adapters/postgres";
import { createFinancialPostingModule } from "#/lib/financial-posting/module";
import { TRANSACTION_CREATE_OPERATION_KIND } from "#/lib/financial-posting/operation-kind";
import { requireCurrentUser } from "#/lib/server-auth";
import { transactionTypes } from "#/lib/transaction-ledger";
import {
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
		postingKey: z.string().trim().min(1),
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

const financialPosting = createFinancialPostingModule(
	createPostgresFinancialPostingAdapter(db),
);

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

				const { transferAccountId, tags, postingKey, ...body } = parsed.data;
				const transactionDate = parsed.data.transactionDate ?? new Date();
				const normalizedTags = normalizeTags(tags);

				const result = await financialPosting.postTransactionCreate({
					userId: user.id,
					operationKind: TRANSACTION_CREATE_OPERATION_KIND,
					postingKey,
					payload: {
						accountId: body.accountId,
						transferAccountId: transferAccountId ?? null,
						categoryId: parsed.data.categoryId ?? null,
						amount: body.amount,
						transactionType: body.transactionType,
						transactionDate,
						merchant: body.merchant,
						notes: body.notes,
						isRecurring: body.isRecurring,
					},
				});

				if (!result.ok) {
					switch (result.error.kind) {
						case "account_not_found":
						case "category_not_found":
							return json({ error: result.error.message }, 404);
						case "posting_key_conflict":
							return json({ error: result.error.message }, 409);
						case "transfer_account_invalid":
						case "invariant_violation":
							return json({ error: result.error.message }, 400);
					}
				}

				let transaction = result.outcome.snapshot;

				if (tags !== undefined) {
					await syncTransactionTags(db, transaction.id, normalizedTags);
					transaction = {
						...transaction,
						tags: normalizedTags,
					};
				}

				return json(
					{ transaction },
					result.outcome.kind === "posted" ? 201 : 200,
				);
			},
		},
	},
});
