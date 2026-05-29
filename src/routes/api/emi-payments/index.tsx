import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { emiPayments, emis, transactions } from "#/db/schema";
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
} from "../transactions/-helpers";

const createPaymentSchema = z.object({
	emiId: z.string().uuid(),
	accountId: z.string().uuid(), // source bank account for the EMI payment
	categoryId: z.string().uuid().nullable().optional(),
	amount: z.coerce.number().positive(),
	paidAt: z.string().optional(),
});

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function advanceNextDueDate(current: Date | string): Date {
	const d = new Date(current);
	d.setMonth(d.getMonth() + 1);
	return d;
}

export const Route = createFileRoute("/api/emi-payments/")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const url = new URL(request.url);
				const emiId = url.searchParams.get("emiId");

				const rows = emiId
					? await db
							.select({ payment: emiPayments })
							.from(emiPayments)
							.innerJoin(emis, eq(emiPayments.emiId, emis.id))
							.where(
								and(eq(emis.userId, user.id), eq(emiPayments.emiId, emiId)),
							)
							.orderBy(desc(emiPayments.paidAt))
					: await db
							.select({ payment: emiPayments })
							.from(emiPayments)
							.innerJoin(emis, eq(emiPayments.emiId, emis.id))
							.where(eq(emis.userId, user.id))
							.orderBy(desc(emiPayments.paidAt));

				return json({ payments: rows.map((r) => r.payment) });
			},
			POST: async ({ request }) => {
				const user = await requireCurrentUser(request);
				const payload = await request.json();
				const parsed = createPaymentSchema.safeParse(payload);

				if (!parsed.success) {
					return json(
						{ error: "Invalid request body", issues: parsed.error.flatten() },
						400,
					);
				}

				const [emi] = await db
					.select()
					.from(emis)
					.where(and(eq(emis.id, parsed.data.emiId), eq(emis.userId, user.id)))
					.limit(1);

				if (!emi) return json({ error: "EMI not found" }, 404);

				await authorizeAccounts(db, user.id, [parsed.data.accountId]);
				await authorizeCategory(db, user.id, parsed.data.categoryId ?? null);

				const paidAt = parsed.data.paidAt
					? new Date(parsed.data.paidAt)
					: new Date();
				const newNextDue = advanceNextDueDate(emi.nextDueDate);
				const isPastEnd = newNextDue > new Date(emi.endDate);

				const created = await db.transaction(async (tx) => {
					const [payment] = await tx
						.insert(emiPayments)
						.values({
							emiId: parsed.data.emiId,
							amount: toNumericString(parsed.data.amount),
							paidAt,
						})
						.returning();

					// Transfer FROM bank TO the EMI liability account — bank shrinks, the
					// negative liability balance moves toward zero.
					await tx.insert(transactions).values({
						userId: user.id,
						accountId: parsed.data.accountId,
						transferAccountId: emi.accountId,
						categoryId: parsed.data.categoryId ?? null,
						amount: toNumericString(parsed.data.amount),
						transactionType: "transfer",
						transactionDate: paidAt,
						merchant: `EMI: ${emi.name}`,
						notes: `emi_payment:${payment.id}`,
						isRecurring: false,
					});

					const deltas = combineAccountDeltas(
						buildTransactionDeltas({
							accountId: parsed.data.accountId,
							transferAccountId: emi.accountId,
							amount: parsed.data.amount,
							transactionType: "transfer",
						}),
					);
					await applyBalanceAdjustments(tx, user.id, deltas);

					await tx
						.update(emis)
						.set({
							nextDueDate: newNextDue,
							...(isPastEnd ? { status: "completed" } : {}),
						})
						.where(eq(emis.id, emi.id));

					return payment;
				});

				return json({ payment: created }, 201);
			},
		},
	},
});
