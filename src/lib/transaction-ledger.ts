export const transactionTypes = ["expense", "income", "transfer"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export type TransactionDeltaInput = {
	transactionType: TransactionType;
	amount: number;
	accountId: string;
	transferAccountId?: string | null;
};

export type AccountDelta = {
	accountId: string;
	delta: number;
};

export function toNumericString(value: number) {
	if (!Number.isFinite(value)) {
		throw new Error("Amount must be a finite number");
	}

	return value.toFixed(2);
}

export function validateTransferTarget(input: TransactionDeltaInput) {
	if (input.transactionType !== "transfer") {
		return;
	}

	if (!input.transferAccountId) {
		throw new Error("Transfer transactions require a destination account");
	}

	if (input.transferAccountId === input.accountId) {
		throw new Error("Transfer account must differ from the source account");
	}
}

export function buildTransactionDeltas(
	input: TransactionDeltaInput,
): AccountDelta[] {
	validateTransferTarget(input);

	const amount = Math.abs(input.amount);

	if (amount === 0) {
		return [];
	}

	if (input.transactionType === "income") {
		return [{ accountId: input.accountId, delta: amount }];
	}

	if (input.transactionType === "expense") {
		return [{ accountId: input.accountId, delta: -amount }];
	}

	return [
		{ accountId: input.accountId, delta: -amount },
		{ accountId: input.transferAccountId as string, delta: amount },
	];
}

export function invertDeltas(deltas: AccountDelta[]): AccountDelta[] {
	return deltas.map((delta) => ({
		accountId: delta.accountId,
		delta: -delta.delta,
	}));
}

export function combineAccountDeltas(deltas: AccountDelta[]): AccountDelta[] {
	const map = new Map<string, number>();

	for (const delta of deltas) {
		if (!map.has(delta.accountId)) {
			map.set(delta.accountId, 0);
		}

		map.set(delta.accountId, (map.get(delta.accountId) ?? 0) + delta.delta);
	}

	return Array.from(map.entries())
		.map(([accountId, delta]) => ({ accountId, delta }))
		.filter((delta) => delta.delta !== 0);
}
