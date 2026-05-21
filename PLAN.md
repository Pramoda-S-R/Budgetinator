# Target Stack

* Fullstack: Tanstack Start
* ORM: Drizzle ORM
* Database: PostgreSQL on [Neon](https://neon.tech?utm_source=chatgpt.com)
* Auth: NeonAuth

The best approach here is:

```text
Feature slices
+
Database-first development
+
Incremental migrations
+
Strict testing after every phase
```

Do NOT build analytics or ML first.

Build:

1. financial primitives
2. budgeting engine
3. dashboard math
4. analytics layer

in that order.

---

# Guiding Architecture

## Core principle

Everything financial is an event.

Examples:

* salary credited
* EMI paid
* SIP invested
* friend repayment
* electricity bill

The app should derive:

* balances
* insights
* trends
* overspending

from immutable records.

---

# 10-Phase Incremental Build Plan

---

# Phase 1 — Foundation & Authentication

## Goal

Get:

* app bootstrapped
* auth working
* Neon + Drizzle connected
* migrations working
* protected routes working

---

## Deliverables

* Neon database setup
* Drizzle setup
* auth
* user session
* environment config
* migration pipeline
* seed script

---

# Tables

## users

```ts
users
```

| column       | type        |
| ------------ | ----------- |
| id           | uuid pk     |
| email        | text unique |
| name         | text        |
| currencyCode | text        |
| timezone     | text        |
| createdAt    | timestamp   |

---

# APIs

```text
POST /auth/signup
POST /auth/login
POST /auth/logout
GET  /me
```

---

# Tests

## Must verify

* user can signup/login
* migrations run cleanly
* auth protected routes work

---

# Commit

```text
feat: initialize auth and database foundation
```

---

# Phase 2 — Accounts & Net Worth Core

## Goal

Track:

* bank balances
* wallets
* liabilities
* net worth

---

# Tables

## accounts

```ts
accounts
```

| column            | type      |
| ----------------- | --------- |
| id                | uuid pk   |
| userId            | fk        |
| name              | text      |
| accountType       | text      |
| currentBalance    | numeric   |
| includeInNetWorth | boolean   |
| isActive          | boolean   |
| createdAt         | timestamp |

---

## account_balance_history

```ts
accountBalanceHistory
```

| column     | type      |
| ---------- | --------- |
| id         | uuid pk   |
| accountId  | fk        |
| balance    | numeric   |
| recordedAt | timestamp |

---

# APIs

```text
GET    /accounts
POST   /accounts
PATCH  /accounts/:id
DELETE /accounts/:id
```

---

# UI

## Pages

```text
/accounts
```

Features:

* add account
* edit balance
* see total wealth

---

# Tests

* balance updates properly
* net worth calculation correct

---

# Commit

```text
feat: add accounts and net worth tracking
```

---

# Phase 3 — Fully Customizable Categories System

CRITICAL PHASE.

Everything depends on this.

---

# Goal

User can:

* create groups
* create categories
* reorder
* archive
* customize colors/icons

---

# Tables

## category_groups

```ts
categoryGroups
```

| column     | type      |
| ---------- | --------- |
| id         | uuid pk   |
| userId     | fk        |
| name       | text      |
| type       | text      |
| icon       | text      |
| color      | text      |
| sortOrder  | int       |
| isArchived | boolean   |
| createdAt  | timestamp |

---

## categories

```ts
categories
```

| column          | type      |
| --------------- | --------- |
| id              | uuid pk   |
| userId          | fk        |
| groupId         | fk        |
| name            | text      |
| icon            | text      |
| color           | text      |
| transactionType | text      |
| sortOrder       | int       |
| isArchived      | boolean   |
| createdAt       | timestamp |

---

# APIs

## Category Groups

```text
GET    /category-groups
POST   /category-groups
PATCH  /category-groups/:id
DELETE /category-groups/:id
```

---

## Categories

```text
GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id
```

---

# Important Constraint

Never hardcode:

* Essential
* Lifestyle
* Investments

They should be seed presets only.

---

# Tests

* CRUD works
* sorting persists
* archived items hidden
* categories belong to user only

---

# Commit

```text
feat: implement customizable category system
```

---

# Phase 4 — Transactions Engine

MOST IMPORTANT PHASE.

---

# Goal

Financial ledger system.

---

# Tables

## transactions

```ts
transactions
```

| column          | type        |
| --------------- | ----------- |
| id              | uuid pk     |
| userId          | fk          |
| accountId       | fk          |
| categoryId      | fk nullable |
| amount          | numeric     |
| transactionType | text        |
| transactionDate | timestamp   |
| merchant        | text        |
| notes           | text        |
| isRecurring     | boolean     |
| createdAt       | timestamp   |

---

## transaction_tags

```ts
transactionTags
```

| column        | type    |
| ------------- | ------- |
| id            | uuid pk |
| transactionId | fk      |
| tag           | text    |

---

# APIs

```text
GET    /transactions
POST   /transactions
PATCH  /transactions/:id
DELETE /transactions/:id
```

---

# Rules

## On transaction creation:

* expense → deduct balance
* income → increase balance
* transfer → move between accounts

Use database transaction wrappers.

---

# UI

Transaction entry modal:

* quick add
* keyboard-first UX
* recent categories

---

# Tests

* balances update correctly
* deletion reverses balance
* transfer integrity works

---

# Commit

```text
feat: implement transaction ledger system
```

---

# Phase 5 — Budget Presets & Monthly Budgets

---

# Goal

Reusable monthly planning system.

---

# Tables

## budget_presets

```ts
budgetPresets
```

| column      | type      |
| ----------- | --------- |
| id          | uuid pk   |
| userId      | fk        |
| name        | text      |
| description | text      |
| createdAt   | timestamp |

---

## preset_allocations

```ts
presetAllocations
```

| column            | type             |
| ----------------- | ---------------- |
| id                | uuid pk          |
| presetId          | fk               |
| categoryGroupId   | fk nullable      |
| categoryId        | fk nullable      |
| allocatedAmount   | numeric          |
| allocationPercent | numeric nullable |

---

## monthly_budgets

```ts
monthlyBudgets
```

| column         | type        |
| -------------- | ----------- |
| id             | uuid pk     |
| userId         | fk          |
| year           | int         |
| month          | int         |
| presetId       | fk nullable |
| expectedIncome | numeric     |
| createdAt      | timestamp   |

---

## monthly_budget_allocations

```ts
monthlyBudgetAllocations
```

| column          | type        |
| --------------- | ----------- |
| id              | uuid pk     |
| monthlyBudgetId | fk          |
| categoryGroupId | fk nullable |
| categoryId      | fk nullable |
| allocatedAmount | numeric     |

---

# Important Logic

When applying preset:

* COPY allocations into monthly snapshot

Never reference live preset dynamically.

---

# APIs

```text
POST /budget-presets
POST /monthly-budgets/apply-preset
GET  /monthly-budgets/:month
```

---

# Tests

* presets reusable
* old months unaffected
* budget calculations correct

---

# Commit

```text
feat: add reusable budget preset engine
```

---

# Phase 6 — Dashboard & Insights Engine

---

# Goal

Realtime financial awareness.

---

# Derived Metrics

* remaining budget
* burn rate
* overspending
* savings rate
* category utilization
* investment ratio

---

# Tables

No major tables needed.

Use:

* SQL aggregations
* materialized views later

---

# APIs

```text
GET /dashboard/summary
GET /dashboard/budget-status
GET /dashboard/cashflow
```

---

# Dashboard Widgets

## Top cards

* net worth
* current cash
* remaining budget
* monthly savings

---

## Budget utilization

```text
Groceries 72%
Lifestyle 120%
```

---

## Overspend alerts

```text
You exceeded Lifestyle by ₹4,200
```

---

# Tests

* calculations accurate
* month switching works
* edge cases handled

---

# Commit

```text
feat: build dashboard insights engine
```

---

# Phase 7 — Investments & SIP Tracking

---

# Goal

Manual portfolio management.

---

# Tables

## investments

```ts
investments
```

| column         | type          |
| -------------- | ------------- |
| id             | uuid pk       |
| userId         | fk            |
| name           | text          |
| investmentType | text          |
| symbol         | text nullable |
| createdAt      | timestamp     |

---

## investment_entries

```ts
investmentEntries
```

| column         | type             |
| -------------- | ---------------- |
| id             | uuid pk          |
| investmentId   | fk               |
| amountInvested | numeric          |
| units          | numeric nullable |
| investedAt     | timestamp        |
| notes          | text             |

---

## investment_valuations

```ts
investmentValuations
```

| column          | type      |
| --------------- | --------- |
| id              | uuid pk   |
| investmentId    | fk        |
| valuationAmount | numeric   |
| valuationDate   | timestamp |

---

# Features

* SIP tracking
* gain/loss
* portfolio allocation
* manual valuation updates

---

# Tests

* gain calculations accurate
* charts update correctly

---

# Commit

```text
feat: add investment and sip tracking
```

---

# Phase 8 — Lending, Borrowing, EMI & Loans

This becomes your liabilities module.

---

# Tables

## contacts

```ts
contacts
```

| column | type    |
| ------ | ------- |
| id     | uuid pk |
| userId | fk      |
| name   | text    |
| phone  | text    |
| notes  | text    |

---

## loans

```ts
loans
```

| column          | type             |
| --------------- | ---------------- |
| id              | uuid pk          |
| userId          | fk               |
| contactId       | fk nullable      |
| loanType        | text             |
| principalAmount | numeric          |
| remainingAmount | numeric          |
| interestRate    | numeric nullable |
| startedAt       | timestamp        |
| expectedEndDate | timestamp        |
| status          | text             |

---

## loan_payments

```ts
loanPayments
```

| column | type      |
| ------ | --------- |
| id     | uuid pk   |
| loanId | fk        |
| amount | numeric   |
| paidAt | timestamp |

---

## emis

```ts
emis
```

| column        | type      |
| ------------- | --------- |
| id            | uuid pk   |
| userId        | fk        |
| name          | text      |
| principal     | numeric   |
| interestRate  | numeric   |
| monthlyAmount | numeric   |
| startDate     | timestamp |
| endDate       | timestamp |
| nextDueDate   | timestamp |
| lenderName    | text      |
| status        | text      |

---

## emi_payments

```ts
emiPayments
```

| column | type      |
| ------ | --------- |
| id     | uuid pk   |
| emiId  | fk        |
| amount | numeric   |
| paidAt | timestamp |

---

# Features

* outstanding debt
* due reminders
* repayment history
* liability tracking

---

# Tests

* remaining balance correct
* overdue detection works

---

# Commit

```text
feat: add loans emi and lending tracker
```

---

# Phase 9 — Analytics & Interactive Charts

---

# Goal

Deep financial insight layer.

---

# Tables

Optional analytics cache.

## monthly_category_summary

```ts
monthlyCategorySummary
```

| column     | type    |
| ---------- | ------- |
| userId     | fk      |
| year       | int     |
| month      | int     |
| categoryId | fk      |
| totalSpent | numeric |

---

# Charts

* category trends
* moving averages
* seasonal spikes
* savings rate
* sankey flow
* investment growth

---

# APIs

```text
GET /analytics/spending-trends
GET /analytics/category-breakdown
GET /analytics/cashflow
GET /analytics/networth
```

---

# Tests

* aggregation accuracy
* chart filtering
* performance under large datasets

---

# Commit

```text
feat: implement analytics and visualization layer
```

---

# Phase 10 — Forecasting, Automation & Production Hardening

---

# Goal

Prepare for intelligent finance assistant features.

---

# Tables

## recurring_rules

```ts
recurringRules
```

| column      | type      |
| ----------- | --------- |
| id          | uuid pk   |
| userId      | fk        |
| categoryId  | fk        |
| amount      | numeric   |
| frequency   | text      |
| nextRunDate | timestamp |

---

## forecast_snapshots

```ts
forecastSnapshots
```

| column           | type      |
| ---------------- | --------- |
| id               | uuid pk   |
| userId           | fk        |
| forecastMonth    | timestamp |
| predictedSpend   | numeric   |
| predictedSavings | numeric   |
| createdAt        | timestamp |

---

# Future ML Inputs

Store:

* weekday
* month
* salary cycle
* recurring patterns
* category seasonality

---

# Features

* recurring transaction suggestions
* projected overspending
* cashflow forecasting
* anomaly alerts

---

# Production Hardening

Add:

* optimistic UI
* pagination
* audit logs
* rate limiting
* caching
* indexes
* db backups

---

# Critical PostgreSQL Indexes

You WILL need these.

---

# Transactions

```sql
(user_id, transaction_date)
(user_id, category_id)
(account_id, transaction_date)
```

---

# Budgets

```sql
(user_id, year, month)
```

---

# Investments

```sql
(investment_id, valuation_date)
```

---

# Loans

```sql
(user_id, status)
(next_due_date)
```

---

# Important Drizzle Recommendations

## Use enums

```ts
pgEnum()
```

For:

* transaction types
* account types
* loan status
* EMI status

---

# Use numeric()

Never float for money.

```ts
numeric("amount", {
  precision: 12,
  scale: 2
})
```

---

# Use soft deletes selectively

Prefer:

* `isArchived`
  instead of delete

for:

* categories
* groups
* accounts

---

# Recommended Testing Strategy

Every phase should include:

## 1. DB tests

* constraints
* cascade behavior
* integrity

## 2. API tests

* auth
* validation
* business logic

## 3. UI tests

* forms
* optimistic updates
* loading states

---

# Recommended Commit Discipline

Each phase:

```text
feat(scope): concise description
```

Example:

```text
feat(budgets): implement preset snapshot system
```

Never combine:

* schema
* analytics
* UI redesign
  in one commit.

---

# Final Recommendation

Your most important engineering decision is this:

## Build derived state, not stored state

Meaning:

Store:

* transactions
* valuations
* loan payments

Derive:

* totals
* insights
* remaining budgets
* forecasts

This prevents synchronization bugs later.
