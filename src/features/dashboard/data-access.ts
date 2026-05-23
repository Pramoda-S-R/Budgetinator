import type { User } from "#/hooks/use-current-user";

function createAuthHeaders(user?: User): Record<string, string> {
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

export async function fetchDashboardSummary(user?: User) {
  return request<{ summary: Record<string, unknown> }>("/api/dashboard/summary", {
    headers: createAuthHeaders(user),
  });
}

export async function fetchBudgetStatus(user?: User) {
  return request<{ budgetStatus: Array<Record<string, unknown>> }>("/api/dashboard/budget-status", {
    headers: createAuthHeaders(user),
  });
}

export async function fetchCashflow(user?: User) {
  return request<{ cashflow: Array<Record<string, unknown>> }>("/api/dashboard/cashflow", {
    headers: createAuthHeaders(user),
  });
}
