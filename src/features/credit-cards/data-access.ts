import { z } from "zod";

import { createApiClient, unwrapApiResult } from "#/features/shared/api-client";
import type { User } from "#/hooks/use-current-user";

const paymentResponseSchema = z.object({
	payment: z.object({
		action: z.enum(["pay_full", "pay_custom", "convert_to_emi"]),
		paymentAmount: z.string(),
		outstandingBefore: z.string(),
		outstandingAfter: z.string(),
		transactionId: z.string(),
		emiAccountId: z.string().nullable().optional(),
	}),
});

type PayCreditCardBillInput = {
	creditCardAccountId: string;
	action: "pay_full" | "pay_custom" | "convert_to_emi";
	sourceAccountId?: string;
	customAmount?: number;
	categoryId?: string;
	emiAmount?: number;
	emiLabel?: string;
	notes?: string;
	transactionDate?: string;
};

export function createCreditCardsDataAccess(user?: User) {
	const client = createApiClient(user);

	return {
		async payCreditCardBill(input: PayCreditCardBillInput) {
			const result = await client.post(
				"/api/credit-cards/payments",
				input,
				paymentResponseSchema,
			);
			return unwrapApiResult(result);
		},
	};
}
