import type { User } from "#/hooks/use-current-user";

export type Account = {
	id: string;
	name: string;
	accountType: string;
	currentBalance: string;
	includeInNetWorth: boolean;
	isActive: boolean;
	createdAt: string;
};

export type AccountsResponse = {
	accounts: Account[];
	totalNetWorth: string;
};

type CreateAccountInput = {
	name: string;
	accountType: string;
	currentBalance: number;
	includeInNetWorth?: boolean;
	isActive?: boolean;
};

type UpdateAccountInput = {
	name?: string;
	accountType?: string;
	currentBalance?: number;
	includeInNetWorth?: boolean;
	isActive?: boolean;
};

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

export async function fetchAccounts(user?: User) {
	return request<AccountsResponse>("/api/accounts", {
		headers: createAuthHeaders(user),
	});
}

export async function createAccount(input: CreateAccountInput, user?: User) {
	return request<{ account: Account }>("/api/accounts", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function updateAccount(
	accountId: string,
	input: UpdateAccountInput,
	user?: User,
) {
	return request<{ account: Account }>(`/api/accounts/${accountId}`, {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
			...createAuthHeaders(user),
		},
		body: JSON.stringify(input),
	});
}

export async function deleteAccount(accountId: string, user?: User) {
	return request<{ success: boolean }>(`/api/accounts/${accountId}`, {
		method: "DELETE",
		headers: createAuthHeaders(user),
	});
}
