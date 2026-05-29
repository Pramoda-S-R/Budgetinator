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

export async function fetchBudgetPresets(user?: User) {
  return request<{ presets: BudgetPreset[] }>("/api/budget-presets", {
    headers: createAuthHeaders(user),
  });
}

export async function createBudgetPreset(
  input: CreateBudgetPresetInput,
  user?: User
) {
  return request<{ preset: BudgetPreset }>("/api/budget-presets", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...createAuthHeaders(user),
    },
    body: JSON.stringify(input),
  });
}

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

export async function applyPresetToMonth(
  input: ApplyPresetInput,
  user?: User
) {
  return request<{
    monthlyBudget: MonthlyBudget;
    allocations: MonthlyBudgetAllocation[];
  }>("/api/monthly-budgets/apply-preset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...createAuthHeaders(user),
    },
    body: JSON.stringify(input),
  });
}

export async function fetchMonthlyBudget(
  user?: User,
  monthKey?: string
) {
  return request<{
    monthlyBudget: MonthlyBudget;
    allocations: MonthlyBudgetAllocation[];
  }>(`/api/monthly-budgets/${monthKey}`, {
    headers: createAuthHeaders(user),
  });
}

export async function deleteBudgetPreset(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/budget-presets/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

export async function updateMonthlyBudget(monthKey: string, input: { expectedIncome: number }, user?: User) {
  return request<{ monthlyBudget: MonthlyBudget }>(`/api/monthly-budgets/${monthKey}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteMonthlyBudget(monthKey: string, user?: User) {
  return request<{ success: boolean }>(`/api/monthly-budgets/${monthKey}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

export async function updateMonthlyAllocation(id: string, input: { allocatedAmount: number }, user?: User) {
  return request<{ allocation: MonthlyBudgetAllocation }>(`/api/monthly-budget-allocations/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteMonthlyAllocation(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/monthly-budget-allocations/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}
