import { pgTable, foreignKey, uuid, text, numeric, boolean, timestamp, unique, integer } from "drizzle-orm/pg-core"



export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	accountType: text("account_type").notNull(),
	currentBalance: numeric("current_balance", { precision: 14, scale:  2 }).default('0').notNull(),
	includeInNetWorth: boolean("include_in_net_worth").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const accountBalanceHistory = pgTable("account_balance_history", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	balance: numeric({ precision: 14, scale:  2 }).notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "account_balance_history_account_id_accounts_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text().notNull(),
	currencyCode: text("currency_code").default('USD').notNull(),
	timezone: text().default('UTC').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const categoryGroups = pgTable("category_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	type: text().notNull(),
	icon: text().default('folder').notNull(),
	color: text().default('#475569').notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "category_groups_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	groupId: uuid("group_id").notNull(),
	name: text().notNull(),
	icon: text().default('tag').notNull(),
	color: text().default('#64748b').notNull(),
	transactionType: text("transaction_type").notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "categories_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [categoryGroups.id],
			name: "categories_group_id_category_groups_id_fk"
		}).onDelete("cascade"),
]);

export const transactions = pgTable("transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	accountId: uuid("account_id").notNull(),
	transferAccountId: uuid("transfer_account_id"),
	categoryId: uuid("category_id"),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	transactionDate: timestamp("transaction_date", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
 	merchant: text().default('').notNull(),
 	notes: text().default('').notNull(),
	isRecurring: boolean("is_recurring").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "transactions_account_id_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transferAccountId],
			foreignColumns: [accounts.id],
			name: "transactions_transfer_account_id_accounts_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "transactions_category_id_categories_id_fk"
		}).onDelete("set null"),
]);

export const transactionTags = pgTable("transaction_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transactionId: uuid("transaction_id").notNull(),
	tag: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_tags_transaction_id_transactions_id_fk"
		}).onDelete("cascade"),
]);
