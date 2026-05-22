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

function createAuthHeaders(user?: User): Record<string, string> {
	if (!user?.id) {
		return {};
	}

	return {
		"x-budgetinator-user-id": user.id,
		"x-budgetinator-user-email": user.email,
		"x-budgetinator-user-name": user.name,
	};
}

async function request<T>(url: string, init: RequestInit = {}) {
	const response = await fetch(url, init);

	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	return (await response.json()) as T;
}

export async function fetchTransactions(user?: User, limit = 60) {
	const params = new URLSearchParams({ limit: String(limit) });

	return request<TransactionsResponse>(
		`/api/transactions?${params.toString()}`,
		{
			headers: createAuthHeaders(user),
		},
	);
}

export async function createTransaction(input: TransactionInput, user?: User) {
	return request<{ transaction: Transaction }>("/api/transactions", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function updateTransaction(
	transactionId: string,
	input: TransactionUpdateInput,
	user?: User,
) {
	return request<{ transaction: Transaction }>(
		`/api/transactions/${transactionId}`,
		{
			method: "PATCH",
			headers: {
				"content-type": "application/json",
				...createAuthHeaders(user),
			},
			body: JSON.stringify(input),
		},
	);
}

export async function deleteTransaction(transactionId: string, user?: User) {
	return request<{ success: boolean }>(`/api/transactions/${transactionId}`, {
		method: "DELETE",
		headers: createAuthHeaders(user),
	});
}
