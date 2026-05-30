import { describe, expect, it } from "vitest";

import { createInMemoryFinancialPostingAdapter } from "./adapters/in-memory";
import { createFinancialPostingModule } from "./module";
import {
	TRANSACTION_CREATE_OPERATION_KIND,
	TRANSACTION_DELETE_OPERATION_KIND,
	TRANSACTION_UPDATE_OPERATION_KIND,
} from "./operation-kind";

function createPayload(
	overrides?: Partial<{
		accountId: string;
		transferAccountId: string | null;
		categoryId: string | null;
		amount: number;
		transactionType: "expense" | "income" | "transfer";
		merchant: string;
		notes: string;
		isRecurring: boolean;
		transactionDate: Date;
	}>,
) {
	return {
		accountId: "acct-1",
		transferAccountId: null,
		categoryId: "cat-1",
		amount: 125.5,
		transactionType: "expense" as const,
		merchant: "Store",
		notes: "Monthly spend",
		isRecurring: false,
		transactionDate: new Date("2026-05-30T10:00:00.000Z"),
		...overrides,
	};
}

function buildCreateInput(payload = createPayload()) {
	return {
		userId: "user-1",
		operationKind: TRANSACTION_CREATE_OPERATION_KIND,
		postingKey: "pk-create-1",
		payload,
	} as const;
}

function buildUpdateInput(payload: {
	transactionId: string;
	patch: {
		amount?: number;
		merchant?: string;
		transferAccountId?: string | null;
		transactionType?: "expense" | "income" | "transfer";
	};
}) {
	return {
		userId: "user-1",
		operationKind: TRANSACTION_UPDATE_OPERATION_KIND,
		postingKey: "pk-update-1",
		payload,
	} as const;
}

function buildDeleteInput(payload: { transactionId: string }) {
	return {
		userId: "user-1",
		operationKind: TRANSACTION_DELETE_OPERATION_KIND,
		postingKey: "pk-delete-1",
		payload,
	} as const;
}

describe("financial posting module", () => {
	it("posts once and replays with the same posting key", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 500 },
			],
			categories: [{ id: "cat-1", userId: "user-1", name: "Food" }],
		});
		const module = createFinancialPostingModule(adapter);

		const first = await module.postTransactionCreate(buildCreateInput());
		expect(first.ok).toBe(true);
		if (!first.ok) {
			return;
		}

		expect(first.outcome.kind).toBe("posted");
		expect(first.outcome.snapshot.amount).toBe("125.50");

		const replay = await module.postTransactionCreate(buildCreateInput());
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}

		expect(replay.outcome.kind).toBe("replayed");
		expect(replay.outcome.snapshot.id).toBe(first.outcome.snapshot.id);

		const state = adapter.inspectState();
		expect(state.transactions.size).toBe(1);
		expect(state.accountBalanceHistory).toHaveLength(1);
		expect(state.accounts.get("acct-1")?.currentBalance).toBe(374.5);
	});

	it("returns posting_key_conflict for payload mismatch with the same key", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 500 },
			],
			categories: [{ id: "cat-1", userId: "user-1", name: "Food" }],
		});
		const module = createFinancialPostingModule(adapter);

		await module.postTransactionCreate(buildCreateInput());

		const conflict = await module.postTransactionCreate(
			buildCreateInput(createPayload({ amount: 100 })),
		);

		expect(conflict).toEqual({
			ok: false,
			error: {
				kind: "posting_key_conflict",
				message: "Posting key already used with a different payload",
			},
		});
	});

	it("rejects transfer when transfer target equals source", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 500 },
			],
		});
		const module = createFinancialPostingModule(adapter);

		const result = await module.postTransactionCreate(
			buildCreateInput(
				createPayload({
					transactionType: "transfer",
					transferAccountId: "acct-1",
					categoryId: null,
				}),
			),
		);

		expect(result).toEqual({
			ok: false,
			error: {
				kind: "transfer_account_invalid",
				message: "Transfer target must differ from the source account",
			},
		});
	});

	it("updates a transaction and replays with the same posting key", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 500 },
			],
			categories: [{ id: "cat-1", userId: "user-1", name: "Food" }],
		});
		const module = createFinancialPostingModule(adapter);

		const created = await module.postTransactionCreate(buildCreateInput());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const updated = await module.postTransactionUpdate(
			buildUpdateInput({
				transactionId: created.outcome.snapshot.id,
				patch: { amount: 100, merchant: "Updated Store" },
			}),
		);
		expect(updated.ok).toBe(true);
		if (!updated.ok) {
			return;
		}

		expect(updated.outcome.kind).toBe("posted");
		expect(updated.outcome.snapshot.amount).toBe("100.00");
		expect(updated.outcome.snapshot.merchant).toBe("Updated Store");

		const replay = await module.postTransactionUpdate(
			buildUpdateInput({
				transactionId: created.outcome.snapshot.id,
				patch: { amount: 100, merchant: "Updated Store" },
			}),
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}
		expect(replay.outcome.kind).toBe("replayed");
	});

	it("deletes a transaction and replays with the same posting key", async () => {
		const adapter = createInMemoryFinancialPostingAdapter({
			accounts: [
				{ id: "acct-1", userId: "user-1", name: "Wallet", currentBalance: 500 },
			],
			categories: [{ id: "cat-1", userId: "user-1", name: "Food" }],
		});
		const module = createFinancialPostingModule(adapter);

		const created = await module.postTransactionCreate(buildCreateInput());
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const deleted = await module.postTransactionDelete(
			buildDeleteInput({ transactionId: created.outcome.snapshot.id }),
		);
		expect(deleted.ok).toBe(true);
		if (!deleted.ok) {
			return;
		}
		expect(deleted.outcome.kind).toBe("posted");

		const replay = await module.postTransactionDelete(
			buildDeleteInput({ transactionId: created.outcome.snapshot.id }),
		);
		expect(replay.ok).toBe(true);
		if (!replay.ok) {
			return;
		}
		expect(replay.outcome.kind).toBe("replayed");

		const state = adapter.inspectState();
		expect(state.transactions.size).toBe(0);
	});
});
