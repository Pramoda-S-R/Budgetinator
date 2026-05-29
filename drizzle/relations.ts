import { relations } from "drizzle-orm/relations";
import { users, accounts, accountBalanceHistory, categoryGroups, categories, budgetPresets, monthlyBudgets, monthlyBudgetAllocations, presetAllocations, transactions, transactionTags, investments, investmentEntries, contacts, emis, emiPayments, forecastSnapshots, loans, loanPayments, recurringRules } from "./schema";

export const accountsRelations = relations(accounts, ({one, many}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
	accountBalanceHistories: many(accountBalanceHistory),
	transactions_accountId: many(transactions, {
		relationName: "transactions_accountId_accounts_id"
	}),
	transactions_transferAccountId: many(transactions, {
		relationName: "transactions_transferAccountId_accounts_id"
	}),
	investments: many(investments),
	recurringRules: many(recurringRules),
	loans: many(loans),
	emis: many(emis),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	categoryGroups: many(categoryGroups),
	categories: many(categories),
	budgetPresets: many(budgetPresets),
	monthlyBudgets: many(monthlyBudgets),
	transactions: many(transactions),
	investments: many(investments),
	contacts: many(contacts),
	forecastSnapshots: many(forecastSnapshots),
	recurringRules: many(recurringRules),
	loans: many(loans),
	emis: many(emis),
}));

export const accountBalanceHistoryRelations = relations(accountBalanceHistory, ({one}) => ({
	account: one(accounts, {
		fields: [accountBalanceHistory.accountId],
		references: [accounts.id]
	}),
}));

export const categoryGroupsRelations = relations(categoryGroups, ({one, many}) => ({
	user: one(users, {
		fields: [categoryGroups.userId],
		references: [users.id]
	}),
	categories: many(categories),
	monthlyBudgetAllocations: many(monthlyBudgetAllocations),
	presetAllocations: many(presetAllocations),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
	categoryGroup: one(categoryGroups, {
		fields: [categories.groupId],
		references: [categoryGroups.id]
	}),
	monthlyBudgetAllocations: many(monthlyBudgetAllocations),
	presetAllocations: many(presetAllocations),
	transactions: many(transactions),
	recurringRules: many(recurringRules),
}));

export const budgetPresetsRelations = relations(budgetPresets, ({one, many}) => ({
	user: one(users, {
		fields: [budgetPresets.userId],
		references: [users.id]
	}),
	monthlyBudgets: many(monthlyBudgets),
	presetAllocations: many(presetAllocations),
}));

export const monthlyBudgetsRelations = relations(monthlyBudgets, ({one, many}) => ({
	user: one(users, {
		fields: [monthlyBudgets.userId],
		references: [users.id]
	}),
	budgetPreset: one(budgetPresets, {
		fields: [monthlyBudgets.presetId],
		references: [budgetPresets.id]
	}),
	monthlyBudgetAllocations: many(monthlyBudgetAllocations),
}));

export const monthlyBudgetAllocationsRelations = relations(monthlyBudgetAllocations, ({one}) => ({
	monthlyBudget: one(monthlyBudgets, {
		fields: [monthlyBudgetAllocations.monthlyBudgetId],
		references: [monthlyBudgets.id]
	}),
	categoryGroup: one(categoryGroups, {
		fields: [monthlyBudgetAllocations.categoryGroupId],
		references: [categoryGroups.id]
	}),
	category: one(categories, {
		fields: [monthlyBudgetAllocations.categoryId],
		references: [categories.id]
	}),
}));

export const presetAllocationsRelations = relations(presetAllocations, ({one}) => ({
	budgetPreset: one(budgetPresets, {
		fields: [presetAllocations.presetId],
		references: [budgetPresets.id]
	}),
	categoryGroup: one(categoryGroups, {
		fields: [presetAllocations.categoryGroupId],
		references: [categoryGroups.id]
	}),
	category: one(categories, {
		fields: [presetAllocations.categoryId],
		references: [categories.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	account_accountId: one(accounts, {
		fields: [transactions.accountId],
		references: [accounts.id],
		relationName: "transactions_accountId_accounts_id"
	}),
	account_transferAccountId: one(accounts, {
		fields: [transactions.transferAccountId],
		references: [accounts.id],
		relationName: "transactions_transferAccountId_accounts_id"
	}),
	category: one(categories, {
		fields: [transactions.categoryId],
		references: [categories.id]
	}),
	transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({one}) => ({
	transaction: one(transactions, {
		fields: [transactionTags.transactionId],
		references: [transactions.id]
	}),
}));

export const investmentsRelations = relations(investments, ({one, many}) => ({
	user: one(users, {
		fields: [investments.userId],
		references: [users.id]
	}),
	account: one(accounts, {
		fields: [investments.accountId],
		references: [accounts.id]
	}),
	investmentEntries: many(investmentEntries),
}));

export const investmentEntriesRelations = relations(investmentEntries, ({one}) => ({
	investment: one(investments, {
		fields: [investmentEntries.investmentId],
		references: [investments.id]
	}),
}));

export const contactsRelations = relations(contacts, ({one, many}) => ({
	user: one(users, {
		fields: [contacts.userId],
		references: [users.id]
	}),
	loans: many(loans),
}));

export const emiPaymentsRelations = relations(emiPayments, ({one}) => ({
	emi: one(emis, {
		fields: [emiPayments.emiId],
		references: [emis.id]
	}),
}));

export const emisRelations = relations(emis, ({one, many}) => ({
	emiPayments: many(emiPayments),
	user: one(users, {
		fields: [emis.userId],
		references: [users.id]
	}),
	account: one(accounts, {
		fields: [emis.accountId],
		references: [accounts.id]
	}),
}));

export const forecastSnapshotsRelations = relations(forecastSnapshots, ({one}) => ({
	user: one(users, {
		fields: [forecastSnapshots.userId],
		references: [users.id]
	}),
}));

export const loanPaymentsRelations = relations(loanPayments, ({one}) => ({
	loan: one(loans, {
		fields: [loanPayments.loanId],
		references: [loans.id]
	}),
}));

export const loansRelations = relations(loans, ({one, many}) => ({
	loanPayments: many(loanPayments),
	user: one(users, {
		fields: [loans.userId],
		references: [users.id]
	}),
	contact: one(contacts, {
		fields: [loans.contactId],
		references: [contacts.id]
	}),
	account: one(accounts, {
		fields: [loans.accountId],
		references: [accounts.id]
	}),
}));

export const recurringRulesRelations = relations(recurringRules, ({one}) => ({
	user: one(users, {
		fields: [recurringRules.userId],
		references: [users.id]
	}),
	category: one(categories, {
		fields: [recurringRules.categoryId],
		references: [categories.id]
	}),
	account: one(accounts, {
		fields: [recurringRules.accountId],
		references: [accounts.id]
	}),
}));