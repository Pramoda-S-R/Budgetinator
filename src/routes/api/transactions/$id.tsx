import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { db } from "#/db";
import {
	createPostgresFinancialPostingAdapter,
} from "#/lib/financial-posting/adapters/postgres";
import { createFinancialPostingModule } from "#/lib/financial-posting/module";
import {
	TRANSACTION_DELETE_OPERATION_KIND,
	TRANSACTION_UPDATE_OPERATION_KIND,
} from "#/lib/financial-posting/operation-kind";
import { requireCurrentUser } from "#/lib/server-auth";
import { transactionTypes } from "#/lib/transaction-ledger";
import { normalizeTags, syncTransactionTags } from "./-helpers";

const transactionIdSchema = z.object({ id: z.string().uuid() });
const transactionDateSchema = z.coerce.date().optional();

const updateTransactionSchema = z
	.object({
		postingKey: z.string().trim().min(1),
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
	.refine((value) => Object.keys(value).length > 1, {
		message: "At least one field must be provided",
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

function mapPostingErrorToHttp(result: { kind: string; message: string }) {
	if (
		result.kind === "invariant_violation" &&
		result.message === "Transaction not found"
	) {
		return { status: 404, body: { error: "Transaction not found" } };
	}

	switch (result.kind) {
		case "account_not_found":
		case "category_not_found":
			return { status: 404, body: { error: result.message } };
		case "posting_key_conflict":
			return { status: 409, body: { error: result.message } };
		case "transfer_account_invalid":
		case "invariant_violation":
			return { status: 400, body: { error: result.message } };
		default:
			return { status: 400, body: { error: result.message } };
	}
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
						{ error: "Invalid request body", issues: parsedBody.error.flatten() },
						400,
					);
				}

				const user = await requireCurrentUser(request);
				const { postingKey, tags, ...patch } = parsedBody.data;
				const normalizedTags = tags === undefined ? undefined : normalizeTags(tags);

				const result = await financialPosting.postTransactionUpdate({
					userId: user.id,
					operationKind: TRANSACTION_UPDATE_OPERATION_KIND,
					postingKey,
					payload: {
						transactionId: parsedParams.data.id,
						patch: {
							...patch,
							categoryId: "categoryId" in patch ? (patch.categoryId ?? null) : undefined,
							transferAccountId:
								"transferAccountId" in patch
									? (patch.transferAccountId ?? null)
									: undefined,
						},
					},
				});

				if (!result.ok) {
					const mapped = mapPostingErrorToHttp(result.error);
					return json(mapped.body, mapped.status);
				}

				let transaction = result.outcome.snapshot;
				if (tags !== undefined) {
					await syncTransactionTags(db, transaction.id, normalizedTags ?? []);
					transaction = { ...transaction, tags: normalizedTags ?? [] };
				}

				return json({ transaction });
			},

			DELETE: async ({ request, params }) => {
				const parsedParams = transactionIdSchema.safeParse(params);
				if (!parsedParams.success) {
					return json({ error: "Invalid transaction id" }, 400);
				}

				const postingKey = new URL(request.url).searchParams.get("postingKey") ?? "";
				if (!postingKey.trim()) {
					return json({ error: "postingKey query parameter is required" }, 400);
				}

				const user = await requireCurrentUser(request);
				const result = await financialPosting.postTransactionDelete({
					userId: user.id,
					operationKind: TRANSACTION_DELETE_OPERATION_KIND,
					postingKey,
					payload: { transactionId: parsedParams.data.id },
				});

				if (!result.ok) {
					const mapped = mapPostingErrorToHttp(result.error);
					return json(mapped.body, mapped.status);
				}

				return json({ success: true });
			},
		},
	},
});
