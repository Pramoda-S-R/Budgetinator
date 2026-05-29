import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

export type PresetAllocation = {
	id: string;
	categoryGroupId: string | null;
	categoryId: string | null;
	allocatedAmount: string;
	allocationPercent: string | null;
};

export type BudgetPreset = {
	id: string;
	name: string;
	description: string;
	createdAt: string;
	allocations: PresetAllocation[];
};

export type CreateBudgetPresetInput = {
	name: string;
	description?: string;
	allocations: Array<{
		categoryGroupId?: string | null;
		categoryId?: string | null;
		allocatedAmount: number;
		allocationPercent?: number | null;
	}>;
};

export type MonthlyBudgetAllocation = {
	id: string;
	categoryGroupId: string | null;
	categoryGroupName: string | null;
	categoryId: string | null;
	categoryName: string | null;
	allocatedAmount: string;
};

export type MonthlyBudget = {
	id: string;
	userId: string;
	year: number;
	month: number;
	presetId: string | null;
	expectedIncome: string;
	createdAt: string;
};

export type ApplyPresetInput = {
	presetId: string;
	year: number;
	month: number;
	expectedIncome?: number;
};

const presetAllocationSchema = z.object({
	id: z.string(),
	categoryGroupId: z.string().nullable(),
	categoryId: z.string().nullable(),
	allocatedAmount: z.string(),
	allocationPercent: z.string().nullable(),
});

const budgetPresetSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	createdAt: z.string(),
	allocations: z.array(presetAllocationSchema),
});

const monthlyBudgetAllocationSchema = z.object({
	id: z.string(),
	categoryGroupId: z.string().nullable(),
	categoryGroupName: z.string().nullable(),
	categoryId: z.string().nullable(),
	categoryName: z.string().nullable(),
	allocatedAmount: z.string(),
});

const monthlyBudgetSchema = z.object({
	id: z.string(),
	userId: z.string(),
	year: z.number(),
	month: z.number(),
	presetId: z.string().nullable(),
	expectedIncome: z.string(),
	createdAt: z.string(),
});

const budgetPresetsEnvelopeSchema = z.object({
	presets: z.array(budgetPresetSchema),
});

const budgetPresetEnvelopeSchema = z.object({
	preset: budgetPresetSchema,
});

const monthlyBudgetEnvelopeSchema = z.object({
	monthlyBudget: monthlyBudgetSchema,
	allocations: z.array(monthlyBudgetAllocationSchema),
});

const monthlyBudgetOnlyEnvelopeSchema = z.object({
	monthlyBudget: monthlyBudgetSchema,
});

const monthlyAllocationEnvelopeSchema = z.object({
	allocation: monthlyBudgetAllocationSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

export function createBudgetsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchBudgetPresets() {
			const result = await client.get(
				"/api/budget-presets",
				budgetPresetsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createBudgetPreset(input: CreateBudgetPresetInput) {
			const result = await client.post(
				"/api/budget-presets",
				input,
				budgetPresetEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async applyPresetToMonth(input: ApplyPresetInput) {
			const result = await client.post(
				"/api/monthly-budgets/apply-preset",
				input,
				monthlyBudgetEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchMonthlyBudget(monthKey?: string) {
			const result = await client.get(
				`/api/monthly-budgets/${monthKey}`,
				monthlyBudgetEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteBudgetPreset(id: string) {
			const result = await client.delete(
				`/api/budget-presets/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateMonthlyBudget(
			monthKey: string,
			input: { expectedIncome: number },
		) {
			const result = await client.patch(
				`/api/monthly-budgets/${monthKey}`,
				input,
				monthlyBudgetOnlyEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteMonthlyBudget(monthKey: string) {
			const result = await client.delete(
				`/api/monthly-budgets/${monthKey}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateMonthlyAllocation(
			id: string,
			input: { allocatedAmount: number },
		) {
			const result = await client.patch(
				`/api/monthly-budget-allocations/${id}`,
				input,
				monthlyAllocationEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteMonthlyAllocation(id: string) {
			const result = await client.delete(
				`/api/monthly-budget-allocations/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchBudgetPresets(user?: User) {
	return createBudgetsDataAccess(user).fetchBudgetPresets();
}

export async function createBudgetPreset(
	input: CreateBudgetPresetInput,
	user?: User,
) {
	return createBudgetsDataAccess(user).createBudgetPreset(input);
}

export async function applyPresetToMonth(input: ApplyPresetInput, user?: User) {
	return createBudgetsDataAccess(user).applyPresetToMonth(input);
}

export async function fetchMonthlyBudget(user?: User, monthKey?: string) {
	return createBudgetsDataAccess(user).fetchMonthlyBudget(monthKey);
}

export async function deleteBudgetPreset(id: string, user?: User) {
	return createBudgetsDataAccess(user).deleteBudgetPreset(id);
}

export async function updateMonthlyBudget(
	monthKey: string,
	input: { expectedIncome: number },
	user?: User,
) {
	return createBudgetsDataAccess(user).updateMonthlyBudget(monthKey, input);
}

export async function deleteMonthlyBudget(monthKey: string, user?: User) {
	return createBudgetsDataAccess(user).deleteMonthlyBudget(monthKey);
}

export async function updateMonthlyAllocation(
	id: string,
	input: { allocatedAmount: number },
	user?: User,
) {
	return createBudgetsDataAccess(user).updateMonthlyAllocation(id, input);
}

export async function deleteMonthlyAllocation(id: string, user?: User) {
	return createBudgetsDataAccess(user).deleteMonthlyAllocation(id);
}
