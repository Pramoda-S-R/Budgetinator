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

import { accountBalanceHistory } from "./account-balance-history";
import { accounts } from "./accounts";
import { budgetPresets } from "./budget-presets";
import { categories } from "./categories";
import { categoryGroups } from "./category-groups";
import { contacts } from "./contacts";
import { emiPayments } from "./emi-payments";
import { emis } from "./emis";
import { forecastSnapshots } from "./forecast-snapshots";
import { investmentEntries } from "./investment-entries";
import { investments } from "./investments";
import { loanPayments } from "./loan-payments";
import { loans } from "./loans";
import { monthlyBudgetAllocations } from "./monthly-budget-allocations";
import { monthlyBudgets } from "./monthly-budgets";
import { presetAllocations } from "./preset-allocations";
import { recurringRules } from "./recurring-rules";
import { transactionTags } from "./transaction-tags";
import { transactions } from "./transactions";
import { users } from "./users";

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

export type MonthlyBudgetAllocation = typeof monthlyBudgetAllocations.$inferSelect;
export type NewMonthlyBudgetAllocation = typeof monthlyBudgetAllocations.$inferInsert;

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
