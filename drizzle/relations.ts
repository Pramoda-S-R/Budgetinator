import { relations } from "drizzle-orm/relations";
import { users, accounts, accountBalanceHistory, categoryGroups, categories, transactions, transactionTags } from "./schema";

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
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	categoryGroups: many(categoryGroups),
	categories: many(categories),
	transactions: many(transactions),
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
	transactions: many(transactions),
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