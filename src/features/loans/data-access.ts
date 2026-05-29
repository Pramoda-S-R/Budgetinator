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

// --- Contacts ---

export async function fetchContacts(user?: User) {
  return request<{ contacts: any[] }>("/api/contacts", { headers: createAuthHeaders(user) });
}

export type CreateContactInput = { name: string; phone?: string; notes?: string };
export async function createContact(input: CreateContactInput, user?: User) {
  return request<{ contact: any }>("/api/contacts", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteContact(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/contacts/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

// --- Loans ---

export async function fetchLoans(user?: User) {
  return request<{ loans: any[] }>("/api/loans", { headers: createAuthHeaders(user) });
}

export type CreateLoanInput = {
  contactId?: string | null;
  accountId: string; // source bank account is now required (where the principal moves through)
  categoryId?: string | null; // optional category applied to the underlying transfer transaction
  loanType: "given" | "taken";
  principalAmount: number;
  interestRate?: number | null;
  startedAt?: string;
  expectedEndDate?: string | null;
  notes?: string;
};
export async function createLoan(input: CreateLoanInput, user?: User) {
  return request<{ loan: any }>("/api/loans", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function updateLoan(id: string, input: Partial<CreateLoanInput & { status: string; remainingAmount: number }>, user?: User) {
  return request<{ loan: any }>(`/api/loans/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteLoan(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/loans/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

// --- Loan Payments ---

export async function fetchLoanPayments(loanId?: string, user?: User) {
  const qs = loanId ? `?loanId=${loanId}` : "";
  return request<{ payments: any[] }>(`/api/loan-payments${qs}`, { headers: createAuthHeaders(user) });
}

export type CreateLoanPaymentInput = {
  loanId: string;
  accountId: string; // source bank: where the payment debits from (or credits to, for repayments received)
  categoryId?: string | null;
  amount: number;
  paidAt?: string;
};
export async function createLoanPayment(input: CreateLoanPaymentInput, user?: User) {
  return request<{ payment: any }>("/api/loan-payments", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteLoanPayment(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/loan-payments/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

// --- EMIs ---

export async function fetchEmis(user?: User) {
  return request<{ emis: any[] }>("/api/emis", { headers: createAuthHeaders(user) });
}

export type CreateEmiInput = {
  name: string;
  principal: number;
  interestRate: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  nextDueDate: string;
  lenderName?: string;
  // Optional: if supplied, this EMI is treated as a *new* disbursement —
  // the principal arrives in this bank account.  Omit to register an
  // already-running EMI for tracking only.
  disbursementAccountId?: string;
  categoryId?: string | null;
};
export async function createEmi(input: CreateEmiInput, user?: User) {
  return request<{ emi: any }>("/api/emis", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function updateEmi(id: string, input: { status?: string; nextDueDate?: string; monthlyAmount?: number }, user?: User) {
  return request<{ emi: any }>(`/api/emis/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteEmi(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/emis/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}

// --- EMI Payments ---

export async function fetchEmiPayments(emiId?: string, user?: User) {
  const qs = emiId ? `?emiId=${emiId}` : "";
  return request<{ payments: any[] }>(`/api/emi-payments${qs}`, { headers: createAuthHeaders(user) });
}

export type CreateEmiPaymentInput = {
  emiId: string;
  accountId: string; // source bank
  categoryId?: string | null;
  amount: number;
  paidAt?: string;
};
export async function createEmiPayment(input: CreateEmiPaymentInput, user?: User) {
  return request<{ payment: any }>("/api/emi-payments", {
    method: "POST",
    headers: { "content-type": "application/json", ...createAuthHeaders(user) },
    body: JSON.stringify(input),
  });
}

export async function deleteEmiPayment(id: string, user?: User) {
  return request<{ success: boolean }>(`/api/emi-payments/${id}`, {
    method: "DELETE",
    headers: createAuthHeaders(user),
  });
}
