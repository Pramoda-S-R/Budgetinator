import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

const dashboardSummaryEnvelopeSchema = z.object({
	summary: z.record(z.string(), z.unknown()),
});

const budgetStatusEnvelopeSchema = z.object({
	budgetStatus: z.array(z.record(z.string(), z.unknown())),
});

const cashflowEnvelopeSchema = z.object({
	cashflow: z.array(z.record(z.string(), z.unknown())),
});

export function createDashboardDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchDashboardSummary() {
			const result = await client.get(
				"/api/dashboard/summary",
				dashboardSummaryEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchBudgetStatus() {
			const result = await client.get(
				"/api/dashboard/budget-status",
				budgetStatusEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchCashflow() {
			const result = await client.get(
				"/api/dashboard/cashflow",
				cashflowEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchDashboardSummary(user?: User) {
	return createDashboardDataAccess(user).fetchDashboardSummary();
}

export async function fetchBudgetStatus(user?: User) {
	return createDashboardDataAccess(user).fetchBudgetStatus();
}

export async function fetchCashflow(user?: User) {
	return createDashboardDataAccess(user).fetchCashflow();
}
