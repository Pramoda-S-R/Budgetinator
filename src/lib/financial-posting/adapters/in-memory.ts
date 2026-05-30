import { toNumericString } from "#/lib/transaction-ledger";

import type {
	CompletePostingReservationInput,
	FinancialPostingAdapter,
	FinancialPostingAdapterTx,
	PostingKeyReservation,
	ReservePostingKeyInput,
	TransactionRecord,
	TransactionSnapshot,
	UpdateTransactionEventInput,
} from "../interface";

type InMemoryAccount = {
	id: string;
	userId: string;
	name: string;
	currentBalance: number;
};

type InMemoryCategory = {
	id: string;
	userId: string;
	name: string;
};

type IdempotencyRecord = {
	payloadHash: string;
	schemaVersion: number;
	snapshot: TransactionSnapshot;
};

export type InMemoryFinancialPostingState = {
	accounts: Map<string, InMemoryAccount>;
	categories: Map<string, InMemoryCategory>;
	idempotency: Map<string, IdempotencyRecord>;
	transactions: Map<string, TransactionRecord>;
	accountBalanceHistory: Array<{
		accountId: string;
		balance: string;
		recordedAt: Date;
	}>;
};

export type InMemoryFinancialPostingAdapter = FinancialPostingAdapter & {
	inspectState(): InMemoryFinancialPostingState;
};

type InitialState = {
	accounts?: InMemoryAccount[];
	categories?: InMemoryCategory[];
};

const PENDING_HASH = "__pending__";

function idempotencyKey(input: ReservePostingKeyInput): string {
	return `${input.userId}:${input.operationKind}:${input.postingKey}`;
}

function createState(initial?: InitialState): InMemoryFinancialPostingState {
	return {
		accounts: new Map(
			(initial?.accounts ?? []).map((account) => [account.id, account]),
		),
		categories: new Map(
			(initial?.categories ?? []).map((category) => [category.id, category]),
		),
		idempotency: new Map(),
		transactions: new Map(),
		accountBalanceHistory: [],
	};
}

export function createInMemoryFinancialPostingAdapter(
	initial?: InitialState,
): InMemoryFinancialPostingAdapter {
	let state = createState(initial);

	const tx: FinancialPostingAdapterTx = {
		async reservePostingKey(input): Promise<PostingKeyReservation> {
			const key = idempotencyKey(input);
			const existing = state.idempotency.get(key);

			if (existing) {
				if (existing.payloadHash === PENDING_HASH) {
					throw new Error("Posting key reservation is pending");
				}

				return {
					kind: "existing",
					payloadHash: existing.payloadHash,
					schemaVersion: existing.schemaVersion,
					snapshot: existing.snapshot,
				};
			}

			state.idempotency.set(key, {
				payloadHash: PENDING_HASH,
				schemaVersion: 0,
				snapshot: {
					id: "",
					accountId: "",
					transferAccountId: null,
					categoryId: null,
					accountName: null,
					transferAccountName: null,
					categoryName: null,
					amount: "0.00",
					transactionType: "expense",
					merchant: "",
					notes: "",
					tags: [],
					isRecurring: false,
					transactionDate: new Date(0).toISOString(),
					createdAt: new Date(0).toISOString(),
				},
			});

			return { kind: "new" };
		},

		async loadOwnedAccountIds(userId, accountIds) {
			const found = new Set<string>();
			for (const accountId of accountIds) {
				const account = state.accounts.get(accountId);
				if (account && account.userId === userId) {
					found.add(accountId);
				}
			}

			return found;
		},

		async categoryExists(userId, categoryId) {
			const category = state.categories.get(categoryId);
			return Boolean(category && category.userId === userId);
		},

		async createTransactionEvent(input) {
			const id = crypto.randomUUID();
			const createdAt = new Date();

			state.transactions.set(id, {
				id,
				userId: input.userId,
				accountId: input.accountId,
				transferAccountId: input.transferAccountId,
				categoryId: input.categoryId,
				amount: input.amount,
				transactionType: input.transactionType,
				merchant: input.merchant,
				notes: input.notes,
				isRecurring: input.isRecurring,
				transactionDate: input.transactionDate,
				createdAt,
			});

			const account = state.accounts.get(input.accountId) ?? null;
			const transferAccount = input.transferAccountId
				? (state.accounts.get(input.transferAccountId) ?? null)
				: null;
			const category = input.categoryId
				? (state.categories.get(input.categoryId) ?? null)
				: null;

			return {
				id,
				accountId: input.accountId,
				transferAccountId: input.transferAccountId,
				categoryId: input.categoryId,
				accountName: account?.name ?? null,
				transferAccountName: transferAccount?.name ?? null,
				categoryName: category?.name ?? null,
				amount: input.amount,
				transactionType: input.transactionType,
				merchant: input.merchant,
				notes: input.notes,
				isRecurring: input.isRecurring,
				transactionDate: input.transactionDate,
				createdAt,
			};
		},

		async fetchTransactionRecord(userId, transactionId) {
			const record = state.transactions.get(transactionId);
			if (!record || record.userId !== userId) {
				return null;
			}

			return { ...record };
		},

		async updateTransactionEvent(input: UpdateTransactionEventInput) {
			const record = state.transactions.get(input.transactionId);
			if (!record || record.userId !== input.userId) {
				return null;
			}

			const filteredUpdates = Object.fromEntries(
				Object.entries(input.updates).filter(
					([, value]) => value !== undefined,
				),
			);

			const updated: TransactionRecord = {
				...record,
				...filteredUpdates,
			};

			state.transactions.set(input.transactionId, updated);

			const account = state.accounts.get(updated.accountId) ?? null;
			const transferAccount = updated.transferAccountId
				? (state.accounts.get(updated.transferAccountId) ?? null)
				: null;
			const category = updated.categoryId
				? (state.categories.get(updated.categoryId) ?? null)
				: null;

			return {
				id: updated.id,
				accountId: updated.accountId,
				transferAccountId: updated.transferAccountId,
				categoryId: updated.categoryId,
				accountName: account?.name ?? null,
				transferAccountName: transferAccount?.name ?? null,
				categoryName: category?.name ?? null,
				amount: updated.amount,
				transactionType: updated.transactionType,
				merchant: updated.merchant,
				notes: updated.notes,
				isRecurring: updated.isRecurring,
				transactionDate: updated.transactionDate,
				createdAt: updated.createdAt,
			};
		},

		async deleteTransactionEvent(userId, transactionId) {
			const record = state.transactions.get(transactionId);
			if (!record || record.userId !== userId) {
				return false;
			}

			state.transactions.delete(transactionId);
			return true;
		},

		async applyBalanceAdjustments(_userId, deltas) {
			for (const delta of deltas) {
				const account = state.accounts.get(delta.accountId);
				if (!account) {
					throw new Error("Unable to adjust account balance");
				}

				account.currentBalance += delta.delta;
				state.accounts.set(delta.accountId, account);

				state.accountBalanceHistory.push({
					accountId: account.id,
					balance: toNumericString(account.currentBalance),
					recordedAt: new Date(),
				});
			}
		},

		async completePostingReservation(input: CompletePostingReservationInput) {
			const key = idempotencyKey(input);
			const existing = state.idempotency.get(key);

			if (!existing) {
				throw new Error("Posting key reservation not found");
			}

			state.idempotency.set(key, {
				payloadHash: input.payloadHash,
				schemaVersion: input.schemaVersion,
				snapshot: input.snapshot,
			});
		},
	};

	return {
		async withTransaction<T>(
			callback: (transaction: FinancialPostingAdapterTx) => Promise<T>,
		): Promise<T> {
			const rollbackState = structuredClone(state);

			try {
				return await callback(tx);
			} catch (error) {
				state = rollbackState;
				throw error;
			}
		},
		inspectState() {
			return state;
		},
	};
}
