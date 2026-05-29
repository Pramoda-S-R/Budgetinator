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
export const budgetPresets = pgTable("budget_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const presetAllocations = pgTable("preset_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  presetId: uuid("preset_id")
    .notNull()
    .references(() => budgetPresets.id, { onDelete: "cascade" }),
  categoryGroupId: uuid("category_group_id").references(() => categoryGroups.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
  allocationPercent: numeric("allocation_percent", { precision: 5, scale: 2 }),
});

export const monthlyBudgets = pgTable("monthly_budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  presetId: uuid("preset_id").references(() => budgetPresets.id, { onDelete: "set null" }),
  expectedIncome: numeric("expected_income", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const monthlyBudgetAllocations = pgTable("monthly_budget_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  monthlyBudgetId: uuid("monthly_budget_id")
    .notNull()
    .references(() => monthlyBudgets.id, { onDelete: "cascade" }),
  categoryGroupId: uuid("category_group_id").references(() => categoryGroups.id, { onDelete: "set null" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
});

export type BudgetPreset = typeof budgetPresets.$inferSelect;
export type NewBudgetPreset = typeof budgetPresets.$inferInsert;
export type PresetAllocation = typeof presetAllocations.$inferSelect;
export type NewPresetAllocation = typeof presetAllocations.$inferInsert;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;
export type MonthlyBudgetAllocation = typeof monthlyBudgetAllocations.$inferSelect;
export type NewMonthlyBudgetAllocation = typeof monthlyBudgetAllocations.$inferInsert;

// Phase 7: Investments & SIP Tracking — each investment owns a paired
// `accounts` row (account_type='investment') whose current_balance IS the
// investment's market value.  Valuations are now plain account-balance
// updates captured in `account_balance_history`.
export const investments = pgTable("investments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  investmentType: text("investment_type").notNull(),
  symbol: text("symbol"),
  status: text("status").notNull().default("active"), // 'active' | 'liquidated'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// investment_entries keeps the unit-count metadata for each buy; the cash
// movement itself lives in `transactions` (transfer from bank → investment
// account).
export const investmentEntries = pgTable("investment_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  investmentId: uuid("investment_id").notNull().references(() => investments.id, { onDelete: "cascade" }),
  amountInvested: numeric("amount_invested", { precision: 14, scale: 2 }).notNull(),
  units: numeric("units", { precision: 14, scale: 4 }),
  investedAt: timestamp("invested_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes").notNull().default(""),
});

export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
export type InvestmentEntry = typeof investmentEntries.$inferSelect;
export type NewInvestmentEntry = typeof investmentEntries.$inferInsert;

// Phase 8: Loans, EMI & Lending — every loan/EMI also owns a paired
// `accounts` row (loan_given asset, loan_taken/emi liability with negative
// balance) so net worth and cash flow flow through the same ledger as cash.
export const contacts = pgTable("contacts", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	phone: text("phone").notNull().default(""),
	notes: text("notes").notNull().default(""),
});

export const loans = pgTable("loans", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	loanType: text("loan_type").notNull(), // 'given' | 'taken'
	interestRate: numeric("interest_rate", { precision: 5, scale: 2 }),
	startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
	expectedEndDate: timestamp("expected_end_date", { withTimezone: true }),
	status: text("status").notNull().default("active"), // 'active' | 'paid' | 'overdue'
	notes: text("notes").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loanPayments = pgTable("loan_payments", {
	id: uuid("id").defaultRandom().primaryKey(),
	loanId: uuid("loan_id")
		.notNull()
		.references(() => loans.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emis = pgTable("emis", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accountId: uuid("account_id")
		.notNull()
		.references(() => accounts.id, { onDelete: "restrict" }),
	name: text("name").notNull(),
	interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull(),
	monthlyAmount: numeric("monthly_amount", { precision: 14, scale: 2 }).notNull(),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true }).notNull(),
	nextDueDate: timestamp("next_due_date", { withTimezone: true }).notNull(),
	lenderName: text("lender_name").notNull().default(""),
	status: text("status").notNull().default("active"), // 'active' | 'completed' | 'cancelled'
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emiPayments = pgTable("emi_payments", {
	id: uuid("id").defaultRandom().primaryKey(),
	emiId: uuid("emi_id")
		.notNull()
		.references(() => emis.id, { onDelete: "cascade" }),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type NewLoanPayment = typeof loanPayments.$inferInsert;
export type Emi = typeof emis.$inferSelect;
export type NewEmi = typeof emis.$inferInsert;
export type EmiPayment = typeof emiPayments.$inferSelect;
export type NewEmiPayment = typeof emiPayments.$inferInsert;

// Phase 10: Recurring Rules & Forecasting
export const recurringRules = pgTable("recurring_rules", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
	accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
	description: text("description").notNull(),
	amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
	transactionType: text("transaction_type").notNull(), // 'income' | 'expense'
	frequency: text("frequency").notNull(), // 'daily' | 'weekly' | 'monthly' | 'yearly'
	nextRunDate: timestamp("next_run_date", { withTimezone: true }).notNull(),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const forecastSnapshots = pgTable("forecast_snapshots", {
	id: uuid("id").defaultRandom().primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	forecastMonth: timestamp("forecast_month", { withTimezone: true }).notNull(),
	predictedSpend: numeric("predicted_spend", { precision: 14, scale: 2 }).notNull(),
	predictedSavings: numeric("predicted_savings", { precision: 14, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;
export type ForecastSnapshot = typeof forecastSnapshots.$inferSelect;
export type NewForecastSnapshot = typeof forecastSnapshots.$inferInsert;
