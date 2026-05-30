import { pgTable, foreignKey, uuid, numeric, timestamp, unique, text, index, boolean, integer } from "drizzle-orm/pg-core"



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

export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	accountType: text("account_type").notNull(),
	currentBalance: numeric("current_balance", { precision: 14, scale:  2 }).default('0').notNull(),
	includeInNetWorth: boolean("include_in_net_worth").default(true).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	creditLimit: numeric("credit_limit", { precision: 14, scale:  2 }),
	nextBillingDate: text("next_billing_date"),
}, (table) => [
	index("idx_accounts_type").using("btree", table.accountType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}).onDelete("cascade"),
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

export const budgetPresets = pgTable("budget_presets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	description: text().default('').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "budget_presets_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const monthlyBudgets = pgTable("monthly_budgets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	presetId: uuid("preset_id"),
	expectedIncome: numeric("expected_income", { precision: 14, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "monthly_budgets_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.presetId],
			foreignColumns: [budgetPresets.id],
			name: "monthly_budgets_preset_id_budget_presets_id_fk"
		}).onDelete("set null"),
]);

export const monthlyBudgetAllocations = pgTable("monthly_budget_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	monthlyBudgetId: uuid("monthly_budget_id").notNull(),
	categoryGroupId: uuid("category_group_id"),
	categoryId: uuid("category_id"),
	allocatedAmount: numeric("allocated_amount", { precision: 14, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.monthlyBudgetId],
			foreignColumns: [monthlyBudgets.id],
			name: "monthly_budget_allocations_monthly_budget_id_monthly_budgets_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryGroupId],
			foreignColumns: [categoryGroups.id],
			name: "monthly_budget_allocations_category_group_id_category_groups_id"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "monthly_budget_allocations_category_id_categories_id_fk"
		}).onDelete("set null"),
]);

export const presetAllocations = pgTable("preset_allocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	presetId: uuid("preset_id").notNull(),
	categoryGroupId: uuid("category_group_id"),
	categoryId: uuid("category_id"),
	allocatedAmount: numeric("allocated_amount", { precision: 14, scale:  2 }).notNull(),
	allocationPercent: numeric("allocation_percent", { precision: 5, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.presetId],
			foreignColumns: [budgetPresets.id],
			name: "preset_allocations_preset_id_budget_presets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryGroupId],
			foreignColumns: [categoryGroups.id],
			name: "preset_allocations_category_group_id_category_groups_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "preset_allocations_category_id_categories_id_fk"
		}).onDelete("set null"),
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

export const investments = pgTable("investments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	investmentType: text("investment_type").notNull(),
	symbol: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: text().default('active').notNull(),
	accountId: uuid("account_id").notNull(),
}, (table) => [
	index("idx_investments_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "investments_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "investments_account_id_accounts_id_fk"
		}).onDelete("restrict"),
]);

export const investmentEntries = pgTable("investment_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	investmentId: uuid("investment_id").notNull(),
	amountInvested: numeric("amount_invested", { precision: 14, scale:  2 }).notNull(),
	units: numeric({ precision: 14, scale:  4 }),
	investedAt: timestamp("invested_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text().default('').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.investmentId],
			foreignColumns: [investments.id],
			name: "investment_entries_investment_id_investments_id_fk"
		}).onDelete("cascade"),
]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	phone: text().default('').notNull(),
	notes: text().default('').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contacts_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const emiPayments = pgTable("emi_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	emiId: uuid("emi_id").notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.emiId],
			foreignColumns: [emis.id],
			name: "emi_payments_emi_id_emis_id_fk"
		}).onDelete("cascade"),
]);

export const forecastSnapshots = pgTable("forecast_snapshots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	forecastMonth: timestamp("forecast_month", { withTimezone: true, mode: 'string' }).notNull(),
	predictedSpend: numeric("predicted_spend", { precision: 14, scale:  2 }).notNull(),
	predictedSavings: numeric("predicted_savings", { precision: 14, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "forecast_snapshots_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const loanPayments = pgTable("loan_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	loanId: uuid("loan_id").notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.loanId],
			foreignColumns: [loans.id],
			name: "loan_payments_loan_id_loans_id_fk"
		}).onDelete("cascade"),
]);

export const recurringRules = pgTable("recurring_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	categoryId: uuid("category_id"),
	accountId: uuid("account_id"),
	description: text().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	transactionType: text("transaction_type").notNull(),
	frequency: text().notNull(),
	nextRunDate: timestamp("next_run_date", { withTimezone: true, mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "recurring_rules_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "recurring_rules_category_id_categories_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "recurring_rules_account_id_accounts_id_fk"
		}).onDelete("set null"),
]);

export const loans = pgTable("loans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	contactId: uuid("contact_id"),
	loanType: text("loan_type").notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale:  2 }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expectedEndDate: timestamp("expected_end_date", { withTimezone: true, mode: 'string' }),
	status: text().default('active').notNull(),
	notes: text().default('').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accountId: uuid("account_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "loans_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "loans_contact_id_contacts_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "loans_account_id_accounts_id_fk"
		}).onDelete("restrict"),
]);

export const emis = pgTable("emis", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale:  2 }).notNull(),
	monthlyAmount: numeric("monthly_amount", { precision: 14, scale:  2 }).notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }).notNull(),
	nextDueDate: timestamp("next_due_date", { withTimezone: true, mode: 'string' }).notNull(),
	lenderName: text("lender_name").default('').notNull(),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	accountId: uuid("account_id").notNull(),
}, (table) => [
	index("idx_emis_account").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "emis_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [accounts.id],
			name: "emis_account_id_accounts_id_fk"
		}).onDelete("restrict"),
]);
