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

export async function fetchRecurringRules(user?: User) {
  return request<{ rules: any[] }>("/api/recurring-rules", { headers: createAuthHeaders(user) });
}

export type CreateRecurringRuleInput = {
  description: string;
  amount: number;
  transactionType: "income" | "expense";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  categoryId?: string | null;
  accountId?: string | null;
};
export async function createRecurringRule(input: CreateRecurringRuleInput, user?: User) {
  return request<{ rule: any }>("/api/recurring-rules", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function updateRecurringRule(
  id: string,
  input: Partial<CreateRecurringRuleInput & { isActive: boolean }>,
  user?: User,
) {
  return request<{ rule: any }>(`/api/recurring-rules/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteRecurringRule(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/recurring-rules/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}
