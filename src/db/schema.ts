import {
	boolean,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	currencyCode: text("currency_code").notNull().default("USD"),
	timezone: text("timezone").notNull().default("UTC"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const accounts = pgTable("accounts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	accountType: text("account_type").notNull(),
	currentBalance: numeric("current_balance", { precision: 14, scale: 2 })
		.notNull()
		.default("0"),
	includeInNetWorth: boolean("include_in_net_worth").notNull().default(true),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const accountBalanceHistory = pgTable("account_balance_history", {
	id: uuid("id").defaultRandom().primaryKey(),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const categoryGroups = pgTable("category_groups", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	type: text("type").notNull(),
	icon: text("icon").notNull().default("folder"),
	color: text("color").notNull().default("#475569"),
	sortOrder: integer("sort_order").notNull().default(0),
	isArchived: boolean("is_archived").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const categories = pgTable("categories", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	groupId: uuid("group_id")
		.notNull()
		.references(() => categoryGroups.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	icon: text("icon").notNull().default("tag"),
	color: text("color").notNull().default("#64748b"),
	transactionType: text("transaction_type").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	isArchived: boolean("is_archived").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const transactions = pgTable("transactions", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "cascade" }),
	transferAccountId: uuid("transfer_account_id").references(() => accounts.id, { onDelete: "restrict" }),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	transactionDate: timestamp("transaction_date", { withTimezone: true })
		.defaultNow()
		.notNull(),
	merchant: text("merchant").notNull().default(""),
	notes: text("notes").notNull().default(""),
	isRecurring: boolean("is_recurring").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const transactionTags = pgTable("transaction_tags", {
	id: uuid("id").defaultRandom().primaryKey(),
	transactionId: uuid("transaction_id")
		.notNull()
		.references(() => transactions.id, { onDelete: "cascade" }),
	tag: text("tag").notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type AccountBalanceHistory = typeof accountBalanceHistory.$inferSelect;
export type CategoryGroup = typeof categoryGroups.$inferSelect;
export type NewCategoryGroup = typeof categoryGroups.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionTag = typeof transactionTags.$inferSelect;
