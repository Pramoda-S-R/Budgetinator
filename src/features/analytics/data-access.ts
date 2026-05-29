import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

const analyticsRowSchema = z.record(z.string(), z.unknown());

const spendingTrendsEnvelopeSchema = z.object({
	trends: z.array(analyticsRowSchema),
});

const categoryBreakdownEnvelopeSchema = z.object({
	breakdown: z.array(analyticsRowSchema),
	grandTotal: z.string(),
	year: z.number(),
	month: z.number(),
});

const analyticsCashflowEnvelopeSchema = z.object({
	cashflow: z.array(analyticsRowSchema),
});

const networthHistoryEnvelopeSchema = z.object({
	history: z.array(analyticsRowSchema),
});

export function createAnalyticsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchSpendingTrends(months = 6) {
			const result = await client.get(
				`/api/analytics/spending-trends?months=${months}`,
				spendingTrendsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchCategoryBreakdown(year?: number, month?: number) {
			const params = new URLSearchParams();
			if (year) {
				params.set("year", String(year));
			}
			if (month) {
				params.set("month", String(month));
			}

			const result = await client.get(
				`/api/analytics/category-breakdown?${params}`,
				categoryBreakdownEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchAnalyticsCashflow(months = 12) {
			const result = await client.get(
				`/api/analytics/cashflow?months=${months}`,
				analyticsCashflowEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchNetworthHistory(months = 12) {
			const result = await client.get(
				`/api/analytics/networth?months=${months}`,
				networthHistoryEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchSpendingTrends(months = 6, user?: User) {
	return createAnalyticsDataAccess(user).fetchSpendingTrends(months);
}

export async function fetchCategoryBreakdown(
	year?: number,
	month?: number,
	user?: User,
) {
	return createAnalyticsDataAccess(user).fetchCategoryBreakdown(year, month);
}

export async function fetchAnalyticsCashflow(months = 12, user?: User) {
	return createAnalyticsDataAccess(user).fetchAnalyticsCashflow(months);
}

export async function fetchNetworthHistory(months = 12, user?: User) {
	return createAnalyticsDataAccess(user).fetchNetworthHistory(months);
}
