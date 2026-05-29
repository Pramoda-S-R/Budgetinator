import { z } from "zod";
import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

const investmentSchema = z.object({
	id: z.string(),
	userId: z.string(),
	accountId: z.string(),
	name: z.string(),
	investmentType: z.string(),
	symbol: z.string().nullable(),
	status: z.string(),
	createdAt: z.string(),
});

const investmentListItemSchema = investmentSchema.extend({
	currentValue: z.string(),
	accountName: z.string(),
});

const investmentEntrySchema = z.object({
	id: z.string(),
	investmentId: z.string(),
	amountInvested: z.string(),
	units: z.string().nullable(),
	investedAt: z.string(),
	notes: z.string(),
});

const investmentValuationSchema = z.object({
	id: z.string(),
	investmentId: z.string(),
	valuationAmount: z.string(),
	valuationDate: z.string(),
});

export type Investment = z.infer<typeof investmentListItemSchema>;
export type InvestmentEntry = z.infer<typeof investmentEntrySchema>;
export type InvestmentValuation = z.infer<typeof investmentValuationSchema>;

export type CreateInvestmentEntryInput = {
	investmentId: string;
	accountId: string;
	categoryId?: string | null;
	amountInvested: number;
	units?: number;
	investedAt?: Date;
	notes?: string;
};

export type CreateInvestmentValuationInput = {
	investmentId: string;
	valuationAmount: number;
	valuationDate?: Date;
};

export type UpdateInvestmentInput = {
	name?: string;
	investmentType?: string;
	symbol?: string | null;
};

export type CreateInvestmentInput = {
	name: string;
	investmentType: string;
	symbol?: string | null;
};

const investmentsEnvelopeSchema = z.object({
	investments: z.array(investmentListItemSchema),
});

const investmentEntriesEnvelopeSchema = z.object({
	entries: z.array(investmentEntrySchema),
});

const investmentValuationsEnvelopeSchema = z.object({
	valuations: z.array(investmentValuationSchema),
});

const investmentEnvelopeSchema = z.object({
	investment: investmentSchema,
});

const investmentEntryEnvelopeSchema = z.object({
	entry: investmentEntrySchema,
});

const investmentValuationEnvelopeSchema = z.object({
	valuation: investmentValuationSchema,
});

const successEnvelopeSchema = z.object({
	success: z.boolean(),
});

export function createInvestmentsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async fetchInvestments() {
			const result = await client.get(
				"/api/investments",
				investmentsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchInvestmentEntries() {
			const result = await client.get(
				"/api/investment-entries",
				investmentEntriesEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchInvestmentValuations() {
			const result = await client.get(
				"/api/investment-valuations",
				investmentValuationsEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createInvestmentEntry(input: CreateInvestmentEntryInput) {
			const result = await client.post(
				"/api/investment-entries",
				input,
				investmentEntryEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createInvestmentValuation(input: CreateInvestmentValuationInput) {
			const result = await client.post(
				"/api/investment-valuations",
				input,
				investmentValuationEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async fetchInvestmentById(
			id: string,
		): Promise<{ investment: z.infer<typeof investmentSchema> }> {
			const result = await client.get(
				`/api/investments/${id}`,
				investmentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async updateInvestmentById(
			id: string,
			input: UpdateInvestmentInput,
		): Promise<{ investment: z.infer<typeof investmentSchema> }> {
			const result = await client.patch(
				`/api/investments/${id}`,
				input,
				investmentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteInvestmentById(id: string): Promise<{ success: boolean }> {
			const result = await client.delete(
				`/api/investments/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async createInvestment(
			input: CreateInvestmentInput,
		): Promise<{ investment: z.infer<typeof investmentSchema> }> {
			const result = await client.post(
				"/api/investments",
				input,
				investmentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async liquidateInvestment(
			id: string,
		): Promise<{ investment: z.infer<typeof investmentSchema> }> {
			const result = await client.patch(
				`/api/investments/${id}`,
				{ status: "liquidated" },
				investmentEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteInvestmentEntry(id: string): Promise<{ success: boolean }> {
			const result = await client.delete(
				`/api/investment-entries/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
		async deleteInvestmentValuation(id: string): Promise<{ success: boolean }> {
			const result = await client.delete(
				`/api/investment-valuations/${id}`,
				successEnvelopeSchema,
			);
			return unwrapApiResult(result);
		},
	};
}

export async function fetchInvestments(user?: User) {
	return createInvestmentsDataAccess(user).fetchInvestments();
}

export async function fetchInvestmentEntries(user?: User) {
	return createInvestmentsDataAccess(user).fetchInvestmentEntries();
}

export async function fetchInvestmentValuations(user?: User) {
	return createInvestmentsDataAccess(user).fetchInvestmentValuations();
}

export async function createInvestmentEntry(
	input: CreateInvestmentEntryInput,
	user?: User,
) {
	return createInvestmentsDataAccess(user).createInvestmentEntry(input);
}

export async function createInvestmentValuation(
	input: CreateInvestmentValuationInput,
	user?: User,
) {
	return createInvestmentsDataAccess(user).createInvestmentValuation(input);
}

export async function fetchInvestmentById(
	id: string,
	user?: User,
): Promise<{ investment: z.infer<typeof investmentSchema> }> {
	return createInvestmentsDataAccess(user).fetchInvestmentById(id);
}

export async function updateInvestmentById(
	id: string,
	input: UpdateInvestmentInput,
	user?: User,
): Promise<{ investment: z.infer<typeof investmentSchema> }> {
	return createInvestmentsDataAccess(user).updateInvestmentById(id, input);
}

export async function deleteInvestmentById(
	id: string,
	user?: User,
): Promise<{ success: boolean }> {
	return createInvestmentsDataAccess(user).deleteInvestmentById(id);
}

export async function createInvestment(
	input: CreateInvestmentInput,
	user?: User,
): Promise<{ investment: z.infer<typeof investmentSchema> }> {
	return createInvestmentsDataAccess(user).createInvestment(input);
}

export async function liquidateInvestment(
	id: string,
	user?: User,
): Promise<{ investment: z.infer<typeof investmentSchema> }> {
	return createInvestmentsDataAccess(user).liquidateInvestment(id);
}

export async function deleteInvestmentEntry(
	id: string,
	user?: User,
): Promise<{ success: boolean }> {
	return createInvestmentsDataAccess(user).deleteInvestmentEntry(id);
}

export async function deleteInvestmentValuation(
	id: string,
	user?: User,
): Promise<{ success: boolean }> {
	return createInvestmentsDataAccess(user).deleteInvestmentValuation(id);
}
