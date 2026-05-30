import { and, eq } from "drizzle-orm";

import type { db } from "#/db";
import { accountBalanceHistory, accounts } from "#/db/schema";

type BalanceClient =
	| typeof db
	| Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

type SetAccountBalanceInput = {
	userId: string;
	accountId: string;
	balance: string;
	recordedAt?: Date;
};

export type SetAccountBalanceResult = {
	accountId: string;
	balance: string;
	historyId: string;
	recordedAt: Date;
};

export async function setAccountBalance(
	client: BalanceClient,
	input: SetAccountBalanceInput,
): Promise<SetAccountBalanceResult> {
	const [updated] = await client
		.update(accounts)
		.set({ currentBalance: input.balance })
		.where(
			and(eq(accounts.id, input.accountId), eq(accounts.userId, input.userId)),
		)
		.returning({ id: accounts.id, currentBalance: accounts.currentBalance });

	if (!updated) {
		throw new Error("Account not found");
	}

	const [history] = await client
		.insert(accountBalanceHistory)
		.values({
			accountId: updated.id,
			balance: updated.currentBalance,
			...(input.recordedAt ? { recordedAt: input.recordedAt } : {}),
		})
		.returning({
			id: accountBalanceHistory.id,
			balance: accountBalanceHistory.balance,
			recordedAt: accountBalanceHistory.recordedAt,
		});

	if (!history) {
		throw new Error("Unable to append account balance history");
	}

	return {
		accountId: updated.id,
		balance: history.balance,
		historyId: history.id,
		recordedAt: history.recordedAt,
	};
}
