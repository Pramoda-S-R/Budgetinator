import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

export type Account = {
	id: string;
	name: string;
	accountType: string;
	currentBalance: string;
	creditLimit: string | null;
	nextBillingDate: string | null;
	includeInNetWorth: boolean;
	isActive: boolean;
	createdAt: string;
};

export type AccountsResponse = {
	accounts: Account[];
	totalNetWorth: string;
};

const accountSchema = z.object({
	id: z.string(),
	name: z.string(),
	accountType: z.string(),
	currentBalance: z.string(),
	creditLimit: z.string().nullable(),
	nextBillingDate: z.string().nullable(),
	includeInNetWorth: z.boolean(),
	isActive: z.boolean(),
	createdAt: z.string(),
});

const accountsResponseSchema = z.object({
	accounts: z.array(accountSchema),
	totalNetWorth: z.string(),
});

const accountEnvelopeSchema = z.object({
	account: accountSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

type CreateAccountInput = {
	name: string;
	accountType: string;
	currentBalance: number;
	creditLimit?: number;
	nextBillingDate?: string;
	recordedAt?: string;
	includeInNetWorth?: boolean;
	isActive?: boolean;
};

type UpdateAccountInput = {
	name?: string;
	accountType?: string;
	currentBalance?: number;
	creditLimit?: number | null;
	nextBillingDate?: string | null;
	includeInNetWorth?: boolean;
	isActive?: boolean;
};

export function createAccountsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchAccounts() {
			const result = await client.get("/api/accounts", accountsResponseSchema);
			return unwrapApiResult(result);
		},
		async createAccount(input: CreateAccountInput) {
			const result = await client.post(
				"/api/accounts",
				input,
				accountEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateAccount(accountId: string, input: UpdateAccountInput) {
			const result = await client.patch(
				`/api/accounts/${accountId}`,
				input,
				accountEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteAccount(accountId: string) {
			const result = await client.delete(
				`/api/accounts/${accountId}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchAccounts(user?: User) {
	return createAccountsDataAccess(user).fetchAccounts();
}

export async function createAccount(input: CreateAccountInput, user?: User) {
	return createAccountsDataAccess(user).createAccount(input);
}

export async function updateAccount(
	accountId: string,
	input: UpdateAccountInput,
	user?: User,
) {
	return createAccountsDataAccess(user).updateAccount(accountId, input);
}

export async function deleteAccount(accountId: string, user?: User) {
	return createAccountsDataAccess(user).deleteAccount(accountId);
}
