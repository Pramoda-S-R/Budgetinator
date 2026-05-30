import { aliasedTable, and, eq, inArray, sql } from "drizzle-orm";

import type { db as database } from "#/db";
import {
	accountBalanceHistory,
	accounts,
	categories,
	financialPostingIdempotency,
	transactions,
} from "#/db/schema";

import type {
	CompletePostingReservationInput,
	CreateTransactionEventInput,
	FinancialPostingAdapter,
	FinancialPostingAdapterTx,
	PostingKeyReservation,
	ReservePostingKeyInput,
	TransactionRecord,
	TransactionSnapshot,
	UpdateTransactionEventInput,
} from "../interface";

type Database = typeof database;
type TransactionClient = Parameters<Parameters<Database["transaction"]>[0]>[0];

const PENDING_HASH = "__pending__";

const transferAccountAlias = aliasedTable(accounts, "transfer_account");

export function createPostgresFinancialPostingAdapter(
	databaseClient: Database,
): FinancialPostingAdapter {
	return {
		withTransaction<T>(
			callback: (transaction: FinancialPostingAdapterTx) => Promise<T>,
		): Promise<T> {
			return databaseClient.transaction(async (tx) =>
				callback({
					reservePostingKey: (input) => reservePostingKey(tx, input),
					loadOwnedAccountIds: (userId, accountIds) =>
						loadOwnedAccountIds(tx, userId, accountIds),
					categoryExists: (userId, categoryId) =>
						categoryExists(tx, userId, categoryId),
					createTransactionEvent: (input) => createTransactionEvent(tx, input),
					fetchTransactionRecord: (userId, transactionId) =>
						fetchTransactionRecord(tx, userId, transactionId),
					updateTransactionEvent: (input) => updateTransactionEvent(tx, input),
					deleteTransactionEvent: (userId, transactionId) =>
						deleteTransactionEvent(tx, userId, transactionId),
					applyBalanceAdjustments: (userId, deltas) =>
						applyBalanceAdjustments(tx, userId, deltas),
					completePostingReservation: (input) =>
						completePostingReservation(tx, input),
				}),
			);
		},
	};
}

async function reservePostingKey(
	tx: TransactionClient,
	input: ReservePostingKeyInput,
): Promise<PostingKeyReservation> {
	const [inserted] = await tx
		.insert(financialPostingIdempotency)
		.values({
			userId: input.userId,
			operationKind: input.operationKind,
			postingKey: input.postingKey,
			payloadHash: PENDING_HASH,
			schemaVersion: 0,
			resultSnapshot: {},
		})
		.onConflictDoNothing()
		.returning({ id: financialPostingIdempotency.id });

	if (inserted) {
		return { kind: "new" };
	}

	const [existing] = await tx
		.select({
			payloadHash: financialPostingIdempotency.payloadHash,
			schemaVersion: financialPostingIdempotency.schemaVersion,
			resultSnapshot: financialPostingIdempotency.resultSnapshot,
		})
		.from(financialPostingIdempotency)
		.where(
			and(
				eq(financialPostingIdempotency.userId, input.userId),
				eq(financialPostingIdempotency.operationKind, input.operationKind),
				eq(financialPostingIdempotency.postingKey, input.postingKey),
			),
		)
		.limit(1);

	if (!existing || existing.payloadHash === PENDING_HASH) {
		throw new Error("Posting key reservation is pending");
	}

	return {
		kind: "existing",
		payloadHash: existing.payloadHash,
		schemaVersion: existing.schemaVersion,
		snapshot: existing.resultSnapshot as TransactionSnapshot,
	};
}

async function loadOwnedAccountIds(
	tx: TransactionClient,
	userId: string,
	accountIds: string[],
): Promise<Set<string>> {
	if (!accountIds.length) {
		return new Set();
	}

	const rows = await tx
		.select({ id: accounts.id })
		.from(accounts)
		.where(and(eq(accounts.userId, userId), inArray(accounts.id, accountIds)));

	return new Set(rows.map((row) => row.id));
}

async function categoryExists(
	tx: TransactionClient,
	userId: string,
	categoryId: string,
): Promise<boolean> {
	const [row] = await tx
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.userId, userId), eq(categories.id, categoryId)))
		.limit(1);

	return Boolean(row);
}

async function createTransactionEvent(
	tx: TransactionClient,
	input: CreateTransactionEventInput,
) {
	const [created] = await tx
		.insert(transactions)
		.values({
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
		})
		.returning({ id: transactions.id });

	const [row] = await selectTransactionSnapshot(tx, created.id);

	if (!row) {
		throw new Error("Unable to serialize transaction");
	}

	return row;
}

async function fetchTransactionRecord(
	tx: TransactionClient,
	userId: string,
	transactionId: string,
): Promise<TransactionRecord | null> {
	const [row] = await tx
		.select({
			id: transactions.id,
			userId: transactions.userId,
			accountId: transactions.accountId,
			transferAccountId: transactions.transferAccountId,
			categoryId: transactions.categoryId,
			amount: transactions.amount,
			transactionType: transactions.transactionType,
			merchant: transactions.merchant,
			notes: transactions.notes,
			isRecurring: transactions.isRecurring,
			transactionDate: transactions.transactionDate,
			createdAt: transactions.createdAt,
		})
		.from(transactions)
		.where(
			and(eq(transactions.userId, userId), eq(transactions.id, transactionId)),
		)
		.limit(1);

	if (!row) {
		return null;
	}

	return {
		id: row.id,
		userId: row.userId,
		accountId: row.accountId,
		transferAccountId: row.transferAccountId,
		categoryId: row.categoryId,
		amount: row.amount,
		transactionType: row.transactionType,
		merchant: row.merchant,
		notes: row.notes,
		isRecurring: row.isRecurring,
		transactionDate: row.transactionDate,
		createdAt: row.createdAt,
	};
}

async function updateTransactionEvent(
	tx: TransactionClient,
	input: UpdateTransactionEventInput,
) {
	const [updated] = await tx
		.update(transactions)
		.set(input.updates)
		.where(
			and(
				eq(transactions.userId, input.userId),
				eq(transactions.id, input.transactionId),
			),
		)
		.returning({ id: transactions.id });

	if (!updated) {
		return null;
	}

	const [row] = await selectTransactionSnapshot(tx, updated.id);
	if (!row) {
		throw new Error("Unable to serialize transaction");
	}

	return row;
}

async function deleteTransactionEvent(
	tx: TransactionClient,
	userId: string,
	transactionId: string,
) {
	const [deleted] = await tx
		.delete(transactions)
		.where(
			and(eq(transactions.userId, userId), eq(transactions.id, transactionId)),
		)
		.returning({ id: transactions.id });

	return Boolean(deleted);
}

async function selectTransactionSnapshot(
	tx: TransactionClient,
	transactionId: string,
) {
	return tx
		.select({
			id: transactions.id,
			accountId: transactions.accountId,
			transferAccountId: transactions.transferAccountId,
			categoryId: transactions.categoryId,
			accountName: accounts.name,
			transferAccountName: transferAccountAlias.name,
			categoryName: categories.name,
			amount: transactions.amount,
			transactionType: transactions.transactionType,
			merchant: transactions.merchant,
			notes: transactions.notes,
			isRecurring: transactions.isRecurring,
			transactionDate: transactions.transactionDate,
			createdAt: transactions.createdAt,
		})
		.from(transactions)
		.leftJoin(accounts, eq(accounts.id, transactions.accountId))
		.leftJoin(
			transferAccountAlias,
			eq(transferAccountAlias.id, transactions.transferAccountId),
		)
		.leftJoin(categories, eq(categories.id, transactions.categoryId))
		.where(eq(transactions.id, transactionId))
		.limit(1);
}

async function applyBalanceAdjustments(
	tx: TransactionClient,
	userId: string,
	deltas: Array<{ accountId: string; delta: number }>,
) {
	if (!deltas.length) {
		return;
	}

	for (const delta of deltas) {
		const [updated] = await tx
			.update(accounts)
			.set({
				currentBalance: sql`${accounts.currentBalance} + ${delta.delta}`,
			})
			.where(and(eq(accounts.id, delta.accountId), eq(accounts.userId, userId)))
			.returning({
				id: accounts.id,
				currentBalance: accounts.currentBalance,
			});

		if (!updated) {
			throw new Error("Unable to adjust account balance");
		}

		await tx.insert(accountBalanceHistory).values({
			accountId: updated.id,
			balance: updated.currentBalance,
		});
	}
}

async function completePostingReservation(
	tx: TransactionClient,
	input: CompletePostingReservationInput,
) {
	await tx
		.update(financialPostingIdempotency)
		.set({
			payloadHash: input.payloadHash,
			schemaVersion: input.schemaVersion,
			resultSnapshot: input.snapshot,
		})
		.where(
			and(
				eq(financialPostingIdempotency.userId, input.userId),
				eq(financialPostingIdempotency.operationKind, input.operationKind),
				eq(financialPostingIdempotency.postingKey, input.postingKey),
			),
		);
}
