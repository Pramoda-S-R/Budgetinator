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

export type CreateInvestmentEntryInput = {
  investmentId: string;
  amountInvested: number;
  units?: number;
  investedAt?: Date;
  notes?: string;
};
export async function createInvestmentEntry(
  input: CreateInvestmentEntryInput,
  user?: User,
) {
  return request<{ entry: any }>("/api/investment-entries", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export type CreateInvestmentValuationInput = {
  investmentId: string;
  valuationAmount: number;
  valuationDate?: Date;
};
export async function createInvestmentValuation(
  input: CreateInvestmentValuationInput,
  user?: User,
) {
  return request<{ valuation: any }>("/api/investment-valuations", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

/** Fetch a single investment by id */
export async function fetchInvestmentById(
  id: string,
  user?: User,
): Promise<{ investment: any }> {
  return request(`/api/investments/${id}`, {
    headers: createAuthHeaders(user),
  });
}

export type UpdateInvestmentInput = {
  name?: string;
  investmentType?: string;
  symbol?: string | null;
};
/** Update an existing investment */
export async function updateInvestmentById(
  id: string,
  input: UpdateInvestmentInput,
  user?: User,
): Promise<{ investment: any }> {
  return request(`/api/investments/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

/** Delete an investment */
export async function deleteInvestmentById(
  id: string,
  user?: User,
): Promise<{ success: boolean }> {
  return request(`/api/investments/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

/**
 * Create a new investment
 */
export type CreateInvestmentInput = {
  name: string;
  investmentType: string;
  symbol?: string | null;
};
export async function createInvestment(
  input: CreateInvestmentInput,
  user?: User,
): Promise<{ investment: any }> {
  return request<{ investment: any }>("/api/investments", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}
