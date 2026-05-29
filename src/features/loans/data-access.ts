import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

export type CreateContactInput = {
	name: string;
	phone?: string;
	notes?: string;
};

export type CreateLoanInput = {
	contactId?: string | null;
	accountId: string;
	categoryId?: string | null;
	loanType: "given" | "taken";
	principalAmount: number;
	interestRate?: number | null;
	startedAt?: string;
	expectedEndDate?: string | null;
	notes?: string;
};

export type CreateLoanPaymentInput = {
	loanId: string;
	accountId: string;
	categoryId?: string | null;
	amount: number;
	paidAt?: string;
};

export type CreateEmiInput = {
	name: string;
	principal: number;
	interestRate: number;
	monthlyAmount: number;
	startDate: string;
	endDate: string;
	nextDueDate: string;
	lenderName?: string;
	disbursementAccountId?: string;
	categoryId?: string | null;
};

export type CreateEmiPaymentInput = {
	emiId: string;
	accountId: string;
	categoryId?: string | null;
	amount: number;
	paidAt?: string;
};

const contactSchema = z.object({
	id: z.string(),
	userId: z.string(),
	name: z.string(),
	phone: z.string(),
	notes: z.string(),
});

const loanSchema = z.object({
	id: z.string(),
	userId: z.string(),
	contactId: z.string().nullable(),
	accountId: z.string(),
	loanType: z.string(),
	interestRate: z.string().nullable(),
	startedAt: z.string(),
	expectedEndDate: z.string().nullable(),
	status: z.string(),
	notes: z.string(),
	createdAt: z.string(),
});

const loanListItemSchema = z.object({
	loan: loanSchema.extend({
		principalAmount: z.string(),
		remainingAmount: z.string(),
	}),
	contactName: z.string().nullable(),
	accountName: z.string(),
	totalPaid: z.string(),
});

const loanPaymentSchema = z.object({
	id: z.string(),
	loanId: z.string(),
	amount: z.string(),
	paidAt: z.string(),
});

const emiSchema = z.object({
	id: z.string(),
	userId: z.string(),
	accountId: z.string(),
	name: z.string(),
	interestRate: z.string(),
	monthlyAmount: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	nextDueDate: z.string(),
	lenderName: z.string(),
	status: z.string(),
	createdAt: z.string(),
	principal: z.string(),
	outstanding: z.string(),
});

const emiBaseSchema = z.object({
	id: z.string(),
	userId: z.string(),
	accountId: z.string(),
	name: z.string(),
	interestRate: z.string(),
	monthlyAmount: z.string(),
	startDate: z.string(),
	endDate: z.string(),
	nextDueDate: z.string(),
	lenderName: z.string(),
	status: z.string(),
	createdAt: z.string(),
});

const emiPaymentSchema = z.object({
	id: z.string(),
	emiId: z.string(),
	amount: z.string(),
	paidAt: z.string(),
});

export type Contact = z.infer<typeof contactSchema>;
export type LoanListItem = z.infer<typeof loanListItemSchema>;
export type LoanPayment = z.infer<typeof loanPaymentSchema>;
export type Emi = z.infer<typeof emiSchema>;
export type EmiPayment = z.infer<typeof emiPaymentSchema>;

const contactsEnvelopeSchema = z.object({
	contacts: z.array(contactSchema),
});

const contactEnvelopeSchema = z.object({
	contact: contactSchema,
});

const loansEnvelopeSchema = z.object({
	loans: z.array(loanListItemSchema),
});

const loanEnvelopeSchema = z.object({
	loan: loanSchema,
});

const loanPaymentsEnvelopeSchema = z.object({
	payments: z.array(loanPaymentSchema),
});

const loanPaymentEnvelopeSchema = z.object({
	payment: loanPaymentSchema,
});

const emisEnvelopeSchema = z.object({
	emis: z.array(emiSchema),
});

const emiEnvelopeSchema = z.object({
	emi: emiBaseSchema,
});

const emiPaymentsEnvelopeSchema = z.object({
	payments: z.array(emiPaymentSchema),
});

const emiPaymentEnvelopeSchema = z.object({
	payment: emiPaymentSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

export function createLoansDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchContacts() {
			const result = await client.get("/api/contacts", contactsEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async createContact(input: CreateContactInput) {
			const result = await client.post(
				"/api/contacts",
				input,
				contactEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteContact(id: string) {
			const result = await client.delete(
				`/api/contacts/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchLoans() {
			const result = await client.get("/api/loans", loansEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async createLoan(input: CreateLoanInput) {
			const result = await client.post("/api/loans", input, loanEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async updateLoan(
			id: string,
			input: Partial<
				CreateLoanInput & { status: string; remainingAmount: number }
			>,
		) {
			const result = await client.patch(
				`/api/loans/${id}`,
				input,
				loanEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteLoan(id: string) {
			const result = await client.delete(
				`/api/loans/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchLoanPayments(loanId?: string) {
			const qs = loanId ? `?loanId=${loanId}` : "";
			const result = await client.get(
				`/api/loan-payments${qs}`,
				loanPaymentsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createLoanPayment(input: CreateLoanPaymentInput) {
			const result = await client.post(
				"/api/loan-payments",
				input,
				loanPaymentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteLoanPayment(id: string) {
			const result = await client.delete(
				`/api/loan-payments/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchEmis() {
			const result = await client.get("/api/emis", emisEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async createEmi(input: CreateEmiInput) {
			const result = await client.post("/api/emis", input, emiEnvelopeSchema);
			return unwrapApiResult(result);
		},
		async updateEmi(
			id: string,
			input: { status?: string; nextDueDate?: string; monthlyAmount?: number },
		) {
			const result = await client.patch(
				`/api/emis/${id}`,
				input,
				emiEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteEmi(id: string) {
			const result = await client.delete(
				`/api/emis/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchEmiPayments(emiId?: string) {
			const qs = emiId ? `?emiId=${emiId}` : "";
			const result = await client.get(
				`/api/emi-payments${qs}`,
				emiPaymentsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createEmiPayment(input: CreateEmiPaymentInput) {
			const result = await client.post(
				"/api/emi-payments",
				input,
				emiPaymentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteEmiPayment(id: string) {
			const result = await client.delete(
				`/api/emi-payments/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchContacts(user?: User) {
	return createLoansDataAccess(user).fetchContacts();
}

export async function createContact(input: CreateContactInput, user?: User) {
	return createLoansDataAccess(user).createContact(input);
}

export async function deleteContact(id: string, user?: User) {
	return createLoansDataAccess(user).deleteContact(id);
}

export async function fetchLoans(user?: User) {
	return createLoansDataAccess(user).fetchLoans();
}

export async function createLoan(input: CreateLoanInput, user?: User) {
	return createLoansDataAccess(user).createLoan(input);
}

export async function updateLoan(
	id: string,
	input: Partial<CreateLoanInput & { status: string; remainingAmount: number }>,
	user?: User,
) {
	return createLoansDataAccess(user).updateLoan(id, input);
}

export async function deleteLoan(id: string, user?: User) {
	return createLoansDataAccess(user).deleteLoan(id);
}

export async function fetchLoanPayments(loanId?: string, user?: User) {
	return createLoansDataAccess(user).fetchLoanPayments(loanId);
}

export async function createLoanPayment(
	input: CreateLoanPaymentInput,
	user?: User,
) {
	return createLoansDataAccess(user).createLoanPayment(input);
}

export async function deleteLoanPayment(id: string, user?: User) {
	return createLoansDataAccess(user).deleteLoanPayment(id);
}

export async function fetchEmis(user?: User) {
	return createLoansDataAccess(user).fetchEmis();
}

export async function createEmi(input: CreateEmiInput, user?: User) {
	return createLoansDataAccess(user).createEmi(input);
}

export async function updateEmi(
	id: string,
	input: { status?: string; nextDueDate?: string; monthlyAmount?: number },
	user?: User,
) {
	return createLoansDataAccess(user).updateEmi(id, input);
}

export async function deleteEmi(id: string, user?: User) {
	return createLoansDataAccess(user).deleteEmi(id);
}

export async function fetchEmiPayments(emiId?: string, user?: User) {
	return createLoansDataAccess(user).fetchEmiPayments(emiId);
}

export async function createEmiPayment(
	input: CreateEmiPaymentInput,
	user?: User,
) {
	return createLoansDataAccess(user).createEmiPayment(input);
}

export async function deleteEmiPayment(id: string, user?: User) {
	return createLoansDataAccess(user).deleteEmiPayment(id);
}
