import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { accountBalanceHistory, accounts } from "#/db/schema";

function parseIsoDate(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

function toIsoDate(value: Date): string {
	const year = value.getUTCFullYear();
	const month = String(value.getUTCMonth() + 1).padStart(2, "0");
	const day = String(value.getUTCDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function addMonth(date: Date): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	const day = date.getUTCDate();

	const targetMonth = month === 11 ? 0 : month + 1;
	const targetYear = month === 11 ? year + 1 : year;
	const lastDayOfTargetMonth = new Date(
		Date.UTC(targetYear, targetMonth + 1, 0),
	).getUTCDate();
	const clampedDay = Math.min(day, lastDayOfTargetMonth);

	return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

function getNextBillingDate(currentDate: Date, today: Date): Date {
	let nextDate = new Date(currentDate.getTime());

	while (nextDate.getTime() <= today.getTime()) {
		nextDate = addMonth(nextDate);
	}

	return nextDate;
}

export async function settleDueCreditCardCycles(userId: string) {
	const today = new Date();
	const todayUtc = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
	);

	const creditCards = await db
		.select({
			id: accounts.id,
			currentBalance: accounts.currentBalance,
			nextBillingDate: accounts.nextBillingDate,
		})
		.from(accounts)
		.where(
			and(eq(accounts.userId, userId), eq(accounts.accountType, "credit_card")),
		);

	for (const card of creditCards) {
		if (!card.nextBillingDate) {
			continue;
		}

		const billingDate = parseIsoDate(card.nextBillingDate);
		if (!billingDate || billingDate.getTime() > todayUtc.getTime()) {
			continue;
		}

		const nextBillingDate = getNextBillingDate(billingDate, todayUtc);

		await db
			.update(accounts)
			.set({
				currentBalance: "0.00",
				nextBillingDate: toIsoDate(nextBillingDate),
				includeInNetWorth: false,
			})
			.where(and(eq(accounts.id, card.id), eq(accounts.userId, userId)));

		if (card.currentBalance !== "0.00") {
			await db.insert(accountBalanceHistory).values({
				accountId: card.id,
				balance: "0.00",
			});
		}
	}
}
