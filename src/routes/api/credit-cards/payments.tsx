import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { accountBalanceHistory, accounts, transactions } from "#/db/schema";
import { pairedAccountName } from "#/lib/account-class";
import { settleDueCreditCardCycles } from "#/lib/credit-card-billing.server";
import { requireCurrentUser } from "#/lib/server-auth";
import {
	buildTransactionDeltas,
	combineAccountDeltas,
	toNumericString,
} from "#/lib/transaction-ledger";
import {
	applyBalanceAdjustments,
	authorizeAccounts,
	authorizeCategory,
	fetchTransactionById,
} from "#/routes/api/transactions/-helpers";

const payCreditCardSchema = z
	.object({
		creditCardAccountId: z.string().uuid(),
		action: z.enum(["pay_full", "pay_custom", "convert_to_emi"]),
		sourceAccountId: z.string().uuid().optional(),
		customAmount: z.coerce.number().positive().optional(),
		categoryId: z.string().uuid().optional(),
		emiAmount: z.coerce.number().positive().optional(),
		emiLabel: z.string().trim().min(1).optional(),
		notes: z.string().trim().optional().default(""),
		transactionDate: z.coerce.date().optional(),
	})
	.superRefine((value, ctx) => {
		if (
			(value.action === "pay_full" || value.action === "pay_custom") &&
			!value.sourceAccountId
		) {
			ctx.addIssue({
				code: "custom",
				path: ["sourceAccountId"],
				message: "A source account is required for payments",
			});
		}

		if (value.action === "pay_custom" && !value.customAmount) {
			ctx.addIssue({
				code: "custom",
				path: ["customAmount"],
				message: "Custom amount is required",
			});
		}

		if (value.action === "convert_to_emi" && !value.emiAmount) {
			ctx.addIssue({
				code: "custom",
				path: ["emiAmount"],
				message: "EMI amount is required for conversion",
			});
		}
	});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function toAmountNumber(value: string): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return 0;
	}

	return parsed;
}

function toOutstanding(value: string): number {
	return Math.abs(toAmountNumber(value));
}

export const Route = createFileRoute("/api/credit-cards/payments")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				await settleDueCreditCardCycles(user.id);

				const payload = await request.json();
				const parsed = payCreditCardSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				try {
					const response = await db.transaction(async (tx) => {
						const input = parsed.data;

						await authorizeAccounts(
							tx,
							user.id,
							[input.creditCardAccountId, input.sourceAccountId].filter(
								(value): value is string => Boolean(value),
							),
						);
						await authorizeCategory(tx, user.id, input.categoryId ?? null);

						const [creditCard] = await tx
							.select({
								id: accounts.id,
								name: accounts.name,
								currentBalance: accounts.currentBalance,
								accountType: accounts.accountType,
							})
							.from(accounts)
							.where(
								and(
									eq(accounts.id, input.creditCardAccountId),
									eq(accounts.userId, user.id),
								),
							)
							.limit(1);

						if (!creditCard || creditCard.accountType !== "credit_card") {
							throw new Error("Credit card account not found");
						}

						const outstandingBefore = toOutstanding(creditCard.currentBalance);
						if (outstandingBefore <= 0) {
							throw new Error("No outstanding balance to process");
						}

						const normalizedCardBalance = -outstandingBefore;
						if (
							toAmountNumber(creditCard.currentBalance) !==
							normalizedCardBalance
						) {
							await tx
								.update(accounts)
								.set({ currentBalance: toNumericString(normalizedCardBalance) })
								.where(
									and(
										eq(accounts.id, creditCard.id),
										eq(accounts.userId, user.id),
									),
								);
							await tx.insert(accountBalanceHistory).values({
								accountId: creditCard.id,
								balance: toNumericString(normalizedCardBalance),
							});
						}

						let paymentAmount = 0;
						let transactionAccountId = "";
						let transferAccountId = "";
						let emiAccountId: string | null = null;

						switch (input.action) {
							case "pay_full": {
								paymentAmount = outstandingBefore;
								transactionAccountId = input.sourceAccountId as string;
								transferAccountId = creditCard.id;
								break;
							}
							case "pay_custom": {
								const customAmount = input.customAmount as number;
								if (customAmount > outstandingBefore) {
									throw new Error(
										"Custom amount cannot exceed outstanding balance",
									);
								}

								paymentAmount = customAmount;
								transactionAccountId = input.sourceAccountId as string;
								transferAccountId = creditCard.id;
								break;
							}
							case "convert_to_emi": {
								const requested = input.emiAmount as number;
								if (requested > outstandingBefore) {
									throw new Error(
										"EMI amount cannot exceed outstanding balance",
									);
								}

								const [emiAccount] = await tx
									.insert(accounts)
									.values({
										userId: user.id,
										name:
											input.emiLabel ??
											pairedAccountName({
												kind: "emi",
												label: creditCard.name,
											}),
										accountType: "emi",
										currentBalance: "0.00",
										includeInNetWorth: true,
										isActive: true,
									})
									.returning({ id: accounts.id });

								paymentAmount = requested;
								transactionAccountId = emiAccount.id;
								transferAccountId = creditCard.id;
								emiAccountId = emiAccount.id;
								break;
							}
						}

						const transactionDate = input.transactionDate ?? new Date();

						const [created] = await tx
							.insert(transactions)
							.values({
								userId: user.id,
								accountId: transactionAccountId,
								transferAccountId,
								categoryId: input.categoryId ?? null,
								amount: toNumericString(paymentAmount),
								transactionType: "transfer",
								transactionDate,
								merchant: `Credit card ${input.action.replaceAll("_", " ")}`,
								notes: input.notes,
								isRecurring: false,
							})
							.returning({ id: transactions.id });

						const deltas = combineAccountDeltas(
							buildTransactionDeltas({
								accountId: transactionAccountId,
								transferAccountId,
								amount: paymentAmount,
								transactionType: "transfer",
							}),
						);
						await applyBalanceAdjustments(tx, user.id, deltas);

						const detailed = await fetchTransactionById(
							tx,
							user.id,
							created.id,
						);
						if (!detailed) {
							throw new Error("Unable to load created transaction");
						}

						const [afterCard] = await tx
							.select({ currentBalance: accounts.currentBalance })
							.from(accounts)
							.where(
								and(
									eq(accounts.id, creditCard.id),
									eq(accounts.userId, user.id),
								),
							)
							.limit(1);

						return {
							payment: {
								action: input.action,
								paymentAmount: toNumericString(paymentAmount),
								outstandingBefore: toNumericString(outstandingBefore),
								outstandingAfter: toNumericString(
									toOutstanding(afterCard?.currentBalance ?? "0"),
								),
								transactionId: detailed.id,
								emiAccountId,
							},
						};
					});

					return json(response, 201);
				} catch (error) {
					return json(
						{
							error:
								error instanceof Error
									? error.message
									: "Unable to process payment",
						},
						400,
					);
				}
			},
		},
	},
});
