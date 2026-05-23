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

export async function fetchInvestments(user?: User) {
  return request<{ investments: any[] }>("/api/investments", {
    headers: createAuthHeaders(user),
  });
}

export async function fetchInvestmentEntries(user?: User) {
  return request<{ entries: any[] }>("/api/investment-entries", {
    headers: createAuthHeaders(user),
  });
}

export async function fetchInvestmentValuations(user?: User) {
  return request<{ valuations: any[] }>("/api/investment-valuations", {
    headers: createAuthHeaders(user),
  });
}
