import { createHash } from "node:crypto";

import {
	buildTransactionDeltas,
	combineAccountDeltas,
	invertDeltas,
	toNumericString,
} from "#/lib/transaction-ledger";

import type {
	FinancialPostingAdapter,
	FinancialPostingAdapterTx,
	FinancialPostingDomainError,
	FinancialPostingInput,
	FinancialPostingResult,
	FinancialPostingSuccess,
	TransactionCreatePayload,
	TransactionDeletePayload,
	TransactionRecord,
	TransactionSnapshot,
	TransactionUpdatePayload,
	TransactionUpdatePatch,
} from "./interface";
import {
	TRANSACTION_DELETE_OPERATION_KIND,
	TRANSACTION_CREATE_OPERATION_KIND,
	TRANSACTION_UPDATE_OPERATION_KIND,
	type OperationKind,
} from "./operation-kind";

const RESULT_SCHEMA_VERSION = 1;
type PostingFailure = Extract<FinancialPostingResult, { ok: false }>;

type CanonicalCreatePayload = {
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	amount: string;
	transactionType: TransactionCreatePayload["transactionType"];
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: string;
};

type CanonicalUpdatePayload = {
	transactionId: string;
	patch: {
		accountId?: string;
		transferAccountId?: string | null;
		categoryId?: string | null;
		amount?: string;
		transactionType?: TransactionCreatePayload["transactionType"];
		merchant?: string;
		notes?: string;
		isRecurring?: boolean;
		transactionDate?: string;
	};
};

type CanonicalDeletePayload = {
	transactionId: string;
};

function stableSerialize(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableSerialize).join(",")}]`;
	}

	if (value && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([left], [right]) => left.localeCompare(right),
		);

		return `{${entries
			.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}

function hashCanonicalPayload(payload: unknown): string {
	const canonical = stableSerialize(payload);
	return createHash("sha256").update(canonical).digest("hex");
}

function success(
	kind: FinancialPostingSuccess["kind"],
	snapshot: TransactionSnapshot,
): FinancialPostingResult {
	return {
		ok: true,
		outcome: {
			kind,
			snapshot,
			schemaVersion: RESULT_SCHEMA_VERSION,
		},
	};
}

function failure(
	kind: FinancialPostingDomainError["kind"],
	message: string,
): PostingFailure {
	return {
		ok: false,
		error: { kind, message },
	};
}

function validatePostingKey(postingKey: string): PostingFailure | null {
	if (!postingKey.trim()) {
		return failure("invariant_violation", "Posting key is required");
	}

	return null;
}

function validateOperationKind(
	received: OperationKind,
	expected: OperationKind,
): PostingFailure | null {
	if (received !== expected) {
		return failure(
			"invariant_violation",
			"Unsupported operation kind for this module",
		);
	}

	return null;
}

function normalizeCreatePayload(
	payload: TransactionCreatePayload,
): PostingFailure | { ok: true; payload: CanonicalCreatePayload } {
	if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
		return failure(
			"invariant_violation",
			"Amount must be a positive finite number",
		);
	}

	if (payload.transactionType === "transfer") {
		if (!payload.transferAccountId) {
			return failure(
				"transfer_account_invalid",
				"Transfer transactions require a destination account",
			);
		}

		if (payload.transferAccountId === payload.accountId) {
			return failure(
				"transfer_account_invalid",
				"Transfer target must differ from the source account",
			);
		}
	}

	return {
		ok: true,
		payload: {
			accountId: payload.accountId,
			transferAccountId:
				payload.transactionType === "transfer"
					? (payload.transferAccountId ?? null)
					: null,
			categoryId: payload.categoryId,
			amount: toNumericString(payload.amount),
			transactionType: payload.transactionType,
			merchant: payload.merchant.trim(),
			notes: payload.notes.trim(),
			isRecurring: payload.isRecurring,
			transactionDate: payload.transactionDate.toISOString(),
		},
	};
}

function normalizeUpdatePatch(
	patch: TransactionUpdatePatch,
): PostingFailure | { ok: true; patch: CanonicalUpdatePayload["patch"] } {
	if (!Object.keys(patch).length) {
		return failure("invariant_violation", "At least one field must be provided");
	}

	const normalized: CanonicalUpdatePayload["patch"] = {};

	if ("accountId" in patch && patch.accountId) {
		normalized.accountId = patch.accountId;
	}

	if ("transferAccountId" in patch) {
		normalized.transferAccountId = patch.transferAccountId ?? null;
	}

	if ("categoryId" in patch) {
		normalized.categoryId = patch.categoryId ?? null;
	}

	if ("amount" in patch && patch.amount !== undefined) {
		if (!Number.isFinite(patch.amount) || patch.amount <= 0) {
			return failure(
				"invariant_violation",
				"Amount must be a positive finite number",
			);
		}

		normalized.amount = toNumericString(patch.amount);
	}

	if ("transactionType" in patch && patch.transactionType) {
		normalized.transactionType = patch.transactionType;
	}

	if ("merchant" in patch && patch.merchant !== undefined) {
		normalized.merchant = patch.merchant.trim();
	}

	if ("notes" in patch && patch.notes !== undefined) {
		normalized.notes = patch.notes.trim();
	}

	if ("isRecurring" in patch && patch.isRecurring !== undefined) {
		normalized.isRecurring = patch.isRecurring;
	}

	if ("transactionDate" in patch && patch.transactionDate) {
		normalized.transactionDate = patch.transactionDate.toISOString();
	}

	if (!Object.keys(normalized).length) {
		return failure("invariant_violation", "At least one field must be provided");
	}

	return { ok: true, patch: normalized };
}

function toSnapshot(record: TransactionRecord): TransactionSnapshot {
	return {
		id: record.id,
		accountId: record.accountId,
		transferAccountId: record.transferAccountId,
		categoryId: record.categoryId,
		accountName: null,
		transferAccountName: null,
		categoryName: null,
		amount: record.amount,
		transactionType: record.transactionType,
		merchant: record.merchant,
		notes: record.notes,
		tags: [],
		isRecurring: record.isRecurring,
		transactionDate: record.transactionDate.toISOString(),
		createdAt: record.createdAt.toISOString(),
	};
}

function toPersistedSnapshot(created: {
	id: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: TransactionCreatePayload["transactionType"];
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
	createdAt: Date;
}): TransactionSnapshot {
	return {
		id: created.id,
		accountId: created.accountId,
		transferAccountId: created.transferAccountId,
		categoryId: created.categoryId,
		accountName: created.accountName,
		transferAccountName: created.transferAccountName,
		categoryName: created.categoryName,
		amount: created.amount,
		transactionType: created.transactionType,
		merchant: created.merchant,
		notes: created.notes,
		tags: [],
		isRecurring: created.isRecurring,
		transactionDate: created.transactionDate.toISOString(),
		createdAt: created.createdAt.toISOString(),
	};
}

function mergeRecord(
	record: TransactionRecord,
	patch: CanonicalUpdatePayload["patch"],
): TransactionRecord {
	return {
		...record,
		accountId: patch.accountId ?? record.accountId,
		transferAccountId:
			"transferAccountId" in patch
				? (patch.transferAccountId ?? null)
				: record.transferAccountId,
		categoryId:
			"categoryId" in patch ? (patch.categoryId ?? null) : record.categoryId,
		amount: patch.amount ?? record.amount,
		transactionType: patch.transactionType ?? record.transactionType,
		merchant: patch.merchant ?? record.merchant,
		notes: patch.notes ?? record.notes,
		isRecurring: patch.isRecurring ?? record.isRecurring,
		transactionDate: patch.transactionDate
			? new Date(patch.transactionDate)
			: record.transactionDate,
	};
}

function validateTransferState(
	record: Pick<TransactionRecord, "transactionType" | "accountId" | "transferAccountId">,
): PostingFailure | null {
	if (record.transactionType !== "transfer") {
		return null;
	}

	if (!record.transferAccountId) {
		return failure(
			"transfer_account_invalid",
			"Transfer transactions require a destination account",
		);
	}

	if (record.transferAccountId === record.accountId) {
		return failure(
			"transfer_account_invalid",
			"Transfer target must differ from the source account",
		);
	}

	return null;
}

async function ensureAccountsOwned(
	adapter: FinancialPostingAdapterTx,
	userId: string,
	accountIds: string[],
): Promise<PostingFailure | null> {
	const deduped = Array.from(new Set(accountIds));
	const owned = await adapter.loadOwnedAccountIds(userId, deduped);
	if (owned.size !== deduped.length) {
		return failure("account_not_found", "Account not found");
	}

	return null;
}

export function createFinancialPostingModule(adapter: FinancialPostingAdapter) {
	return {
		async postTransactionCreate(
			input: FinancialPostingInput<TransactionCreatePayload>,
		): Promise<FinancialPostingResult> {
			const invalidPostingKey = validatePostingKey(input.postingKey);
			if (invalidPostingKey) {
				return invalidPostingKey;
			}

			const invalidOperation = validateOperationKind(
				input.operationKind,
				TRANSACTION_CREATE_OPERATION_KIND,
			);
			if (invalidOperation) {
				return invalidOperation;
			}

			const normalized = normalizeCreatePayload(input.payload);
			if (!normalized.ok) {
				return normalized;
			}

			const payload = normalized.payload;
			const payloadHash = hashCanonicalPayload(payload);

			return adapter.withTransaction(async (transaction) => {
				const reservation = await transaction.reservePostingKey({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
				});

				if (reservation.kind === "existing") {
					if (reservation.payloadHash === payloadHash) {
						return success("replayed", reservation.snapshot);
					}
					return failure(
						"posting_key_conflict",
						"Posting key already used with a different payload",
					);
				}

				const accountCheck = await ensureAccountsOwned(
					transaction,
					input.userId,
					[payload.accountId, payload.transferAccountId].filter(
						(value): value is string => Boolean(value),
					),
				);
				if (accountCheck) {
					return accountCheck;
				}

				if (payload.categoryId) {
					const categoryExists = await transaction.categoryExists(
						input.userId,
						payload.categoryId,
					);
					if (!categoryExists) {
						return failure("category_not_found", "Category not found");
					}
				}

				const created = await transaction.createTransactionEvent({
					userId: input.userId,
					accountId: payload.accountId,
					transferAccountId: payload.transferAccountId,
					categoryId: payload.categoryId,
					amount: payload.amount,
					transactionType: payload.transactionType,
					merchant: payload.merchant,
					notes: payload.notes,
					isRecurring: payload.isRecurring,
					transactionDate: new Date(payload.transactionDate),
				});

				const deltas = combineAccountDeltas(
					buildTransactionDeltas({
						accountId: payload.accountId,
						transferAccountId: payload.transferAccountId,
						amount: Number(payload.amount),
						transactionType: payload.transactionType,
					}),
				);

				await transaction.applyBalanceAdjustments(input.userId, deltas);

				const snapshot = toPersistedSnapshot(created);
				await transaction.completePostingReservation({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
					payloadHash,
					schemaVersion: RESULT_SCHEMA_VERSION,
					snapshot,
				});

				return success("posted", snapshot);
			});
		},

		async postTransactionUpdate(
			input: FinancialPostingInput<TransactionUpdatePayload>,
		): Promise<FinancialPostingResult> {
			const invalidPostingKey = validatePostingKey(input.postingKey);
			if (invalidPostingKey) {
				return invalidPostingKey;
			}

			const invalidOperation = validateOperationKind(
				input.operationKind,
				TRANSACTION_UPDATE_OPERATION_KIND,
			);
			if (invalidOperation) {
				return invalidOperation;
			}

			const transactionId = input.payload.transactionId.trim();
			if (!transactionId) {
				return failure("invariant_violation", "Transaction id is required");
			}

			const normalizedPatch = normalizeUpdatePatch(input.payload.patch);
			if (!normalizedPatch.ok) {
				return normalizedPatch;
			}

			const payload: CanonicalUpdatePayload = {
				transactionId,
				patch: normalizedPatch.patch,
			};
			const payloadHash = hashCanonicalPayload(payload);

			return adapter.withTransaction(async (transaction) => {
				const reservation = await transaction.reservePostingKey({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
				});

				if (reservation.kind === "existing") {
					if (reservation.payloadHash === payloadHash) {
						return success("replayed", reservation.snapshot);
					}
					return failure(
						"posting_key_conflict",
						"Posting key already used with a different payload",
					);
				}

				const existing = await transaction.fetchTransactionRecord(
					input.userId,
					payload.transactionId,
				);
				if (!existing) {
					return failure("invariant_violation", "Transaction not found");
				}

				const merged = mergeRecord(existing, payload.patch);
				const invalidTransferState = validateTransferState(merged);
				if (invalidTransferState) {
					return invalidTransferState;
				}

				const accountCheck = await ensureAccountsOwned(
					transaction,
					input.userId,
					[merged.accountId, merged.transferAccountId].filter(
						(value): value is string => Boolean(value),
					),
				);
				if (accountCheck) {
					return accountCheck;
				}

				if (merged.categoryId) {
					const categoryExists = await transaction.categoryExists(
						input.userId,
						merged.categoryId,
					);
					if (!categoryExists) {
						return failure("category_not_found", "Category not found");
					}
				}

				const updated = await transaction.updateTransactionEvent({
					userId: input.userId,
					transactionId: payload.transactionId,
					updates: {
						...payload.patch,
						transactionDate: payload.patch.transactionDate
							? new Date(payload.patch.transactionDate)
							: undefined,
					},
				});
				if (!updated) {
					return failure("invariant_violation", "Transaction not found");
				}

				const oldDeltas = buildTransactionDeltas({
					accountId: existing.accountId,
					amount: Number(existing.amount),
					transactionType: existing.transactionType,
					transferAccountId: existing.transferAccountId,
				});
				const newDeltas = buildTransactionDeltas({
					accountId: merged.accountId,
					amount: Number(merged.amount),
					transactionType: merged.transactionType,
					transferAccountId: merged.transferAccountId,
				});

				const deltas = combineAccountDeltas([
					...invertDeltas(oldDeltas),
					...newDeltas,
				]);
				await transaction.applyBalanceAdjustments(input.userId, deltas);

				const snapshot = toPersistedSnapshot(updated);
				await transaction.completePostingReservation({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
					payloadHash,
					schemaVersion: RESULT_SCHEMA_VERSION,
					snapshot,
				});

				return success("posted", snapshot);
			});
		},

		async postTransactionDelete(
			input: FinancialPostingInput<TransactionDeletePayload>,
		): Promise<FinancialPostingResult> {
			const invalidPostingKey = validatePostingKey(input.postingKey);
			if (invalidPostingKey) {
				return invalidPostingKey;
			}

			const invalidOperation = validateOperationKind(
				input.operationKind,
				TRANSACTION_DELETE_OPERATION_KIND,
			);
			if (invalidOperation) {
				return invalidOperation;
			}

			const transactionId = input.payload.transactionId.trim();
			if (!transactionId) {
				return failure("invariant_violation", "Transaction id is required");
			}

			const payload: CanonicalDeletePayload = { transactionId };
			const payloadHash = hashCanonicalPayload(payload);

			return adapter.withTransaction(async (transaction) => {
				const reservation = await transaction.reservePostingKey({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
				});

				if (reservation.kind === "existing") {
					if (reservation.payloadHash === payloadHash) {
						return success("replayed", reservation.snapshot);
					}
					return failure(
						"posting_key_conflict",
						"Posting key already used with a different payload",
					);
				}

				const existing = await transaction.fetchTransactionRecord(
					input.userId,
					transactionId,
				);
				if (!existing) {
					return failure("invariant_violation", "Transaction not found");
				}

				const oldDeltas = buildTransactionDeltas({
					accountId: existing.accountId,
					amount: Number(existing.amount),
					transactionType: existing.transactionType,
					transferAccountId: existing.transferAccountId,
				});
				const adjustments = combineAccountDeltas(invertDeltas(oldDeltas));
				await transaction.applyBalanceAdjustments(input.userId, adjustments);

				const deleted = await transaction.deleteTransactionEvent(
					input.userId,
					transactionId,
				);
				if (!deleted) {
					return failure("invariant_violation", "Transaction not found");
				}

				const snapshot = toSnapshot(existing);
				await transaction.completePostingReservation({
					userId: input.userId,
					operationKind: input.operationKind,
					postingKey: input.postingKey,
					payloadHash,
					schemaVersion: RESULT_SCHEMA_VERSION,
					snapshot,
				});

				return success("posted", snapshot);
			});
		},
	};
}

export { RESULT_SCHEMA_VERSION };
