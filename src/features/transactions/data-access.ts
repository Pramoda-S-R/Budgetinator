import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

export type Transaction = {
	id: string;
	accountId: string;
	transferAccountId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryId: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: "expense" | "income" | "transfer";
	merchant: string;
	notes: string;
	tags: string[];
	isRecurring: boolean;
	transactionDate: string;
	createdAt: string;
};

export type TransactionsResponse = {
	transactions: Transaction[];
};

const transactionSchema = z.object({
	id: z.string(),
	accountId: z.string(),
	transferAccountId: z.string().nullable(),
	accountName: z.string().nullable(),
	transferAccountName: z.string().nullable(),
	categoryId: z.string().nullable(),
	categoryName: z.string().nullable(),
	amount: z.string(),
	transactionType: z.enum(["expense", "income", "transfer"]),
	merchant: z.string(),
	notes: z.string(),
	tags: z.array(z.string()),
	isRecurring: z.boolean(),
	transactionDate: z.string(),
	createdAt: z.string(),
});

const transactionsResponseSchema = z.object({
	transactions: z.array(transactionSchema),
});

const transactionEnvelopeSchema = z.object({
	transaction: transactionSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

type TransactionInput = {
	accountId: string;
	amount: number;
	transactionType: "expense" | "income" | "transfer";
	categoryId?: string | null;
	merchant?: string;
	notes?: string;
	isRecurring?: boolean;
	transactionDate?: string;
	transferAccountId?: string | null;
	tags?: string[];
};

type TransactionUpdateInput = Partial<TransactionInput>;

export function createTransactionsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchTransactions(limit = 60) {
			const params = new URLSearchParams({ limit: String(limit) });
			const result = await client.get(
				`/api/transactions?${params.toString()}`,
				transactionsResponseSchema,
			);
			return unwrapApiResult(result);
		},
		async createTransaction(input: TransactionInput) {
			const result = await client.post(
				"/api/transactions",
				input,
				transactionEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateTransaction(
			transactionId: string,
			input: TransactionUpdateInput,
		) {
			const result = await client.patch(
				`/api/transactions/${transactionId}`,
				input,
				transactionEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteTransaction(transactionId: string) {
			const result = await client.delete(
				`/api/transactions/${transactionId}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchTransactions(user?: User, limit = 60) {
	return createTransactionsDataAccess(user).fetchTransactions(limit);
}

export async function createTransaction(input: TransactionInput, user?: User) {
	return createTransactionsDataAccess(user).createTransaction(input);
}

export async function updateTransaction(
	transactionId: string,
	input: TransactionUpdateInput,
	user?: User,
) {
	return createTransactionsDataAccess(user).updateTransaction(
		transactionId,
		input,
	);
}

export async function deleteTransaction(transactionId: string, user?: User) {
	return createTransactionsDataAccess(user).deleteTransaction(transactionId);
}
