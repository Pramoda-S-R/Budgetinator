import { aliasedTable, and, desc, eq, inArray, sql } from "drizzle-orm";
import type { db } from "#/db";
import {
	accountBalanceHistory,
	accounts,
	categories,
	transactions,
	transactionTags,
} from "#/db/schema";
import type {
	combineAccountDeltas,
	TransactionType,
} from "#/lib/transaction-ledger";

type TransactionClient =
	| typeof db
	| Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

const transferAccountAlias = aliasedTable(accounts, "transfer_account");

export type TransactionResponse = {
	id: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	tags: string[];
	isRecurring: boolean;
	transactionDate: string;
	createdAt: string;
};

type TransactionRow = {
	id: string;
	userId: string;
	accountId: string;
	transferAccountId: string | null;
	categoryId: string | null;
	accountName: string | null;
	transferAccountName: string | null;
	categoryName: string | null;
	amount: string;
	transactionType: TransactionType;
	merchant: string;
	notes: string;
	isRecurring: boolean;
	transactionDate: Date;
	createdAt: Date;
};

function buildTransactionSelect(client: TransactionClient) {
	return client
		.select({
			id: transactions.id,
			userId: transactions.userId,
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
		.leftJoin(categories, eq(categories.id, transactions.categoryId));
}

async function loadTags(client: TransactionClient, ids: string[]) {
	if (!ids.length) {
		return new Map<string, string[]>();
	}

	const rows = await client
		.select({
			transactionId: transactionTags.transactionId,
			tag: transactionTags.tag,
		})
		.from(transactionTags)
		.where(inArray(transactionTags.transactionId, ids));

	const map = new Map<string, string[]>();

	for (const row of rows) {
		const next = map.get(row.transactionId) ?? [];
		next.push(row.tag);
		map.set(row.transactionId, next);
	}

	return map;
}

export function serializeTransaction(
	row: TransactionRow,
	tags: string[],
): TransactionResponse {
	return {
		id: row.id,
		accountId: row.accountId,
		transferAccountId: row.transferAccountId,
		categoryId: row.categoryId,
		accountName: row.accountName,
		transferAccountName: row.transferAccountName,
		categoryName: row.categoryName,
		amount: row.amount,
		transactionType: row.transactionType,
		merchant: row.merchant,
		notes: row.notes,
		tags,
		isRecurring: row.isRecurring,
		transactionDate: row.transactionDate.toISOString(),
		createdAt: row.createdAt.toISOString(),
	};
}

export async function listTransactions(
	client: TransactionClient,
	userId: string,
	limit = 60,
) {
	const rows = await buildTransactionSelect(client)
		.where(eq(transactions.userId, userId))
		.orderBy(desc(transactions.transactionDate))
		.limit(limit);

	const tags = await loadTags(
		client,
		rows.map((row) => row.id),
	);

	return rows.map((row) =>
		serializeTransaction(row as TransactionRow, tags.get(row.id) ?? []),
	);
}

export async function fetchTransactionById(
	client: TransactionClient,
	userId: string,
	transactionId: string,
) {
	const rows = await buildTransactionSelect(client).where(
		and(eq(transactions.userId, userId), eq(transactions.id, transactionId)),
	);

	const row = rows[0];

	if (!row) {
		return null;
	}

	const tags = await loadTags(client, [transactionId]);
	return serializeTransaction(
		row as TransactionRow,
		tags.get(transactionId) ?? [],
	);
}

export async function syncTransactionTags(
	client: TransactionClient,
	transactionId: string,
	tags: string[],
) {
	await client
		.delete(transactionTags)
		.where(eq(transactionTags.transactionId, transactionId));

	if (!tags.length) {
		return;
	}

	await client
		.insert(transactionTags)
		.values(tags.map((tag) => ({ transactionId, tag })));
}

export async function applyBalanceAdjustments(
	client: TransactionClient,
	userId: string,
	deltas: ReturnType<typeof combineAccountDeltas>,
) {
	if (!deltas.length) {
		return;
	}

	for (const delta of deltas) {
		const [updated] = await client
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

		await client.insert(accountBalanceHistory).values({
			accountId: updated.id,
			balance: updated.currentBalance,
		});
	}
}

export async function authorizeAccounts(
	client: TransactionClient,
	userId: string,
	accountIds: string[],
) {
	const ids = Array.from(new Set(accountIds));
	if (!ids.length) {
		return;
	}

	const rows = await client
		.select({ id: accounts.id })
		.from(accounts)
		.where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));

	if (rows.length !== ids.length) {
		throw new Error("Account not found");
	}
}

export async function authorizeCategory(
	client: TransactionClient,
	userId: string,
	categoryId: string | null,
) {
	if (!categoryId) {
		return;
	}

	const [category] = await client
		.select({ id: categories.id })
		.from(categories)
		.where(and(eq(categories.userId, userId), eq(categories.id, categoryId)));

	if (!category) {
		throw new Error("Category not found");
	}
}

export async function fetchTransactionRecord(
	client: TransactionClient,
	userId: string,
	transactionId: string,
) {
	const [row] = await client
		.select()
		.from(transactions)
		.where(
			and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
		)
		.limit(1);

	return row ?? null;
}

export function normalizeTags(tags?: string[]) {
	return Array.from(new Set((tags ?? []).map((tag) => tag.trim()))).filter(
		Boolean,
	);
}
