export { accountBalanceHistory } from "./account-balance-history";
export { accounts } from "./accounts";
export { budgetPresets } from "./budget-presets";
export { categories } from "./categories";
export { categoryGroups } from "./category-groups";
export { contacts } from "./contacts";
export { emiPayments } from "./emi-payments";
export { emis } from "./emis";
export { forecastSnapshots } from "./forecast-snapshots";
export { investmentEntries } from "./investment-entries";
export { investments } from "./investments";
export { loanPayments } from "./loan-payments";
export { loans } from "./loans";
export { monthlyBudgetAllocations } from "./monthly-budget-allocations";
export { monthlyBudgets } from "./monthly-budgets";
export { presetAllocations } from "./preset-allocations";
export { recurringRules } from "./recurring-rules";
export { transactionTags } from "./transaction-tags";
export { transactions } from "./transactions";
export { users } from "./users";

import type { accountBalanceHistory } from "./account-balance-history";
import type { accounts } from "./accounts";
import type { budgetPresets } from "./budget-presets";
import type { categories } from "./categories";
import type { categoryGroups } from "./category-groups";
import type { contacts } from "./contacts";
import type { emiPayments } from "./emi-payments";
import type { emis } from "./emis";
import type { forecastSnapshots } from "./forecast-snapshots";
import type { investmentEntries } from "./investment-entries";
import type { investments } from "./investments";
import type { loanPayments } from "./loan-payments";
import type { loans } from "./loans";
import type { monthlyBudgetAllocations } from "./monthly-budget-allocations";
import type { monthlyBudgets } from "./monthly-budgets";
import type { presetAllocations } from "./preset-allocations";
import type { recurringRules } from "./recurring-rules";
import type { transactionTags } from "./transaction-tags";
import type { transactions } from "./transactions";
import type { users } from "./users";

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

export type BudgetPreset = typeof budgetPresets.$inferSelect;
export type NewBudgetPreset = typeof budgetPresets.$inferInsert;

export type PresetAllocation = typeof presetAllocations.$inferSelect;
export type NewPresetAllocation = typeof presetAllocations.$inferInsert;

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;

export type MonthlyBudgetAllocation =
	typeof monthlyBudgetAllocations.$inferSelect;
export type NewMonthlyBudgetAllocation =
	typeof monthlyBudgetAllocations.$inferInsert;

export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;

export type InvestmentEntry = typeof investmentEntries.$inferSelect;
export type NewInvestmentEntry = typeof investmentEntries.$inferInsert;

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

export type RecurringRule = typeof recurringRules.$inferSelect;
export type NewRecurringRule = typeof recurringRules.$inferInsert;

export type ForecastSnapshot = typeof forecastSnapshots.$inferSelect;
export type NewForecastSnapshot = typeof forecastSnapshots.$inferInsert;
