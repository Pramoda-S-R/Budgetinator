import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

export type RecurringRule = {
	id: string;
	userId: string;
	categoryId: string | null;
	accountId: string | null;
	description: string;
	amount: string;
	transactionType: "income" | "expense";
	frequency: "daily" | "weekly" | "monthly" | "yearly";
	nextRunDate: string;
	isActive: boolean;
	createdAt: string;
};

export type CreateRecurringRuleInput = {
	description: string;
	amount: number;
	transactionType: "income" | "expense";
	frequency: "daily" | "weekly" | "monthly" | "yearly";
	nextRunDate: string;
	categoryId?: string | null;
	accountId?: string | null;
};

const recurringRuleSchema = z.object({
	id: z.string(),
	userId: z.string(),
	categoryId: z.string().nullable(),
	accountId: z.string().nullable(),
	description: z.string(),
	amount: z.string(),
	transactionType: z.enum(["income", "expense"]),
	frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
	nextRunDate: z.string(),
	isActive: z.boolean(),
	createdAt: z.string(),
});

const recurringRulesEnvelopeSchema = z.object({
	rules: z.array(recurringRuleSchema),
});

const recurringRuleEnvelopeSchema = z.object({
	rule: recurringRuleSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

export function createRecurringDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchRecurringRules() {
			const result = await client.get(
				"/api/recurring-rules",
				recurringRulesEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createRecurringRule(input: CreateRecurringRuleInput) {
			const result = await client.post(
				"/api/recurring-rules",
				input,
				recurringRuleEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateRecurringRule(
			id: string,
			input: Partial<CreateRecurringRuleInput & { isActive: boolean }>,
		) {
			const result = await client.patch(
				`/api/recurring-rules/${id}`,
				input,
				recurringRuleEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteRecurringRule(id: string) {
			const result = await client.delete(
				`/api/recurring-rules/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchRecurringRules(user?: User) {
	return createRecurringDataAccess(user).fetchRecurringRules();
}

export async function createRecurringRule(
	input: CreateRecurringRuleInput,
	user?: User,
) {
	return createRecurringDataAccess(user).createRecurringRule(input);
}

export async function updateRecurringRule(
	id: string,
	input: Partial<CreateRecurringRuleInput & { isActive: boolean }>,
	user?: User,
) {
	return createRecurringDataAccess(user).updateRecurringRule(id, input);
}

export async function deleteRecurringRule(id: string, user?: User) {
	return createRecurringDataAccess(user).deleteRecurringRule(id);
}
