import type { User } from "#/hooks/use-current-user";

type AuthHeaders = Record<string, string>;
function createAuthHeaders(user?: User): AuthHeaders {
  if (!user?.id) return {};
  return {
    "x-budgetinator-user-id": user.id,
    "x-budgetinator-user-email": user.email,
    "x-budgetinator-user-name": user.name,
  };
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchSpendingTrends(months = 6, user?: User) {
  return request<{ trends: any[] }>(`/api/analytics/spending-trends?months=${months}`, {
    headers: createAuthHeaders(user),
  });
}

export async function fetchCategoryBreakdown(year?: number, month?: number, user?: User) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  return request<{ breakdown: any[]; grandTotal: string; year: number; month: number }>(
    `/api/analytics/category-breakdown?${params}`,
    { headers: createAuthHeaders(user) },
  );
}

export async function fetchAnalyticsCashflow(months = 12, user?: User) {
  return request<{ cashflow: any[] }>(`/api/analytics/cashflow?months=${months}`, {
    headers: createAuthHeaders(user),
  });
}

export async function fetchNetworthHistory(months = 12, user?: User) {
  return request<{ history: any[] }>(`/api/analytics/networth?months=${months}`, {
    headers: createAuthHeaders(user),
  });
}
