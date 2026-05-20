# Expense Tracker + Financial Analytics App — Handoff Specification

## Project Goal

Build a modern personal finance dashboard and expense tracker focused on:

* Fast expense logging
* Budget allocation tracking
* Investment tracking
* Chit fund tracking
* Monthly financial analytics
* Future extensibility with minimal code changes
* Clear visual insights
* Mobile-first usability

The app should feel closer to a lightweight personal finance operating system rather than a simple expense logger.

---

# Core User Profile

Target user:

* Young salaried professional
* Actively investing monthly
* Tracks SIPs, savings, family support, lifestyle spending
* Wants financial discipline without excessive friction
* Wants analytics and budgeting insights
* Wants to understand spending behavior over time

---

# Primary Features

## 1. Dashboard

The dashboard is the central screen.

### Dashboard Cards

Show:

* Current month income
* Total spent this month
* Total invested this month
* Remaining buffer
* Emergency fund status
* Current savings balance
* Chit fund progress
* Budget usage percentage
* Net worth estimate

### Dashboard Graphs

Include:

* Spending by category
* Investments over time
* Cash flow graph
* Budget utilization graph
* Monthly comparison graph
* Savings rate trend
* Expense heatmap/calendar

---

# 2. Quick Allocation References

The user wants quick access references to planned allocations.

Create a dedicated "Financial Allocation" section.

## Monthly Allocation Reference

Display:

| Category                | Planned Amount |
| ----------------------- | -------------- |
| Essential Expenses      | ₹10,000        |
| Chit Fund               | ₹10,000        |
| SIP Investments         | ₹18,000        |
| Emergency Reserve       | ₹5,000         |
| Lifestyle               | ₹7,000         |
| Family Support          | ₹3,000         |
| Travel/Future Purchases | ₹1,500         |

These should be editable from settings/admin.

---

## SIP Allocation Reference

The app should also include a dedicated SIP allocation reference section.

Display:

| SIP Type                 | Planned Amount |
| ------------------------ | -------------- |
| Nifty 50 Index Fund      | ₹7,000         |
| Nifty Next 50 Index Fund | ₹4,000         |
| Flexi Cap Fund           | ₹4,000         |
| Mid Cap Fund             | ₹3,000         |

Requirements:

* Editable from settings/admin
* Track planned vs actual SIP investments
* Show SIP consistency streaks
* Show missed SIP months
* Show monthly and yearly investment totals
* Future-proof for adding additional investment instruments later
* Allow tagging SIPs under broader investment categories
* Include charts for SIP growth and contribution history

---

# 3. Expense Tracking

Core functionality.

## Add Expense Modal

Fields:

* Amount
* Category
* Subcategory
* Notes
* Date
* Payment method
* Tags
* Recurring toggle
* Attachment/image upload (optional)
* Linked budget allocation

## Categories

Default categories:

* Food
* Transport
* Rent
* Utilities
* Entertainment
* Shopping
* Health
* Investments
* Family
* Travel
* Education
* Gadgets
* Subscriptions
* Miscellaneous

Must support dynamic category creation.

---

# 4. Investment Tracking

## Investment Types

Support:

* SIPs
* Mutual funds
* Stocks
* Gold
* Chit funds
* Fixed deposits
* Emergency fund
* Savings account balances

## Investment Fields

* Name
* Investment type
* Amount invested
* Current value
* Expected maturity
* ROI estimate
* Monthly contribution
* Notes

---

# 5. Chit Fund Tracking

This is a special requirement.

## Chit Dashboard

Track:

* Total chit value
* Amount already invested
* Remaining contribution
* Monthly contribution
* Expected maturity amount
* Remaining months
* Effective profit
* ROI estimate

## Chit Visualization

Progress bar:

Example:

₹90k invested of ₹130k total obligation
Expected maturity: ₹150k

---

# 6. Budget Intelligence System

This is one of the most important features.

The app should not just track expenses.
It should provide financial insights.

## Analytics Engine

The app should calculate:

* Over-budget categories
* Underused allocations
* Monthly savings rate
* Lifestyle inflation trend
* Spending spikes
* Subscription leakage
* Investment consistency
* Emergency reserve health
* Spending prediction
* Average daily spend
* Weekend vs weekday spending
* Recurring purchase patterns

---

# 7. Budget Variance Analysis

Example insights:

* "You exceeded Lifestyle budget by ₹2,100"
* "Food expenses increased 18% vs last month"
* "Investment rate dropped below target"
* "You saved 42% of income this month"
* "Subscriptions consumed 9% of discretionary budget"

---

# 8. Monthly Financial Review Screen

Generate automated summaries.

## Example

### April 2026 Summary

* Income: ₹54,749
* Total Expenses: ₹26,300
* Investments: ₹28,000
* Savings Rate: 51%
* Highest Spend Category: Gadgets
* Most Efficient Category: Food
* Net Positive Cash Flow: ₹13,200

Add a visual monthly report.

Potential future feature:

* PDF export

---

# 9. Future-Proof Data Architecture

VERY IMPORTANT.

The application should be designed so new financial instruments and expense types can be added without major rewrites.

## Use Generic Models

Avoid hardcoded logic.

Prefer:

* transaction types
* allocation types
* configurable categories
* metadata-driven structures
* dynamic analytics

---

# Suggested Data Models

## User

Fields:

* id
* name
* email
* currency
* preferences

---

## Transaction

Fields:

* id
* amount
* type
* categoryId
* subcategoryId
* notes
* tags
* paymentMethod
* transactionDate
* recurring
* linkedAllocationId
* createdAt
* updatedAt

Types:

* expense
* income
* investment
* transfer
* savings

---

## BudgetAllocation

Fields:

* id
* name
* monthlyLimit
* color
* icon
* active
* carryForward

---

## Investment

Fields:

* id
* name
* type
* investedAmount
* currentValue
* monthlyContribution
* maturityDate
* roi
* notes

---

## ChitFund

Fields:

* id
* totalValue
* totalContribution
* investedAmount
* monthlyContribution
* maturityAmount
* monthsRemaining
* expectedProfit

---

# Tech Stack Recommendation

## Frontend

Preferred:

* Tanstack ecosystem
* TypeScript
* Tailwind CSS
* shadcn/ui
* Recharts
* Framer Motion

---

## Backend

Preferred:

* Tanstack Start
* Drizzle ORM
* Neon PostgreSQL

---

## Authentication

Use:

* Clerk

---

## Database

PostgreSQL preferred.

Reason:

* relational structure
* analytics queries
* scalable
* future-proof

---

# Analytics Requirements

## Must Include

### Spending Analytics

* Monthly totals
* Yearly totals
* Category breakdowns
* Top spending categories
* Moving averages

### Investment Analytics

* Monthly invested amount
* Portfolio allocation
* Growth tracking
* Investment consistency

### Budget Analytics

* Planned vs actual
* Variance percentages
* Historical trends

### Predictive Analytics (Future Scope)

Potential future modules:

* ML spending prediction
* Cash flow forecasting
* Investment growth simulation
* Smart alerts

---

# UI/UX Requirements

## Design Goals

* Clean
* Minimal
* Premium feel
* Fast interactions
* Mobile-first
* Financial dashboard aesthetic

Avoid:

* clutter
* excessive gradients
* enterprise-looking UI
* overcomplicated navigation

---

# Navigation Structure

## Sidebar / Bottom Nav

Sections:

* Dashboard
* Expenses
* Investments
* Budgets
* Analytics
* Chit Funds
* Reports
* Settings

---

# Quick Add System

The app should prioritize speed.

## Quick Add Bar

Examples:

* * Expense
* * Investment
* * SIP
* * Family Support
* * Chit Payment

Should work in under 3 taps.

---

# Smart Features

## Recommended Enhancements

### 1. Auto Categorization

Detect categories from notes.

Example:

"Swiggy" → Food
"Uber" → Transport

---

### 2. Recurring Expense Detection

Detect:

* subscriptions
* rent
* SIPs
* recurring utility bills

---

### 3. Budget Warnings

Examples:

* "Lifestyle budget at 85%"
* "Food expenses unusually high this week"

---

### 4. Investment Milestones

Examples:

* First ₹1L invested
* 6 months SIP streak
* Emergency fund complete

---

# Reporting System

## Export Support

Future-ready:

* CSV export
* PDF reports
* Monthly summary reports
* Investment reports

---

# Notifications

Optional future module:

* SIP reminders
* Budget warnings
* Chit due dates
* Savings milestones
* Weekly summaries

---

# Suggested Architecture Principles

## Use:

* reusable components
* centralized transaction engine
* modular analytics system
* configurable categories
* abstraction layers

Avoid:

* hardcoded categories
* hardcoded allocation logic
* tightly coupled analytics
* duplicated financial calculations

---

# MVP Requirements

## Phase 1

Must have:

* Dashboard
* Expense tracking
* Budget allocations
* Investment tracking
* Chit tracking
* Analytics basics
* Monthly summaries

---

# Phase 2

Add:

* predictive analytics
* AI insights
* smart categorization
* notifications
* report exports
* portfolio tracking APIs

---

# Stretch Features

Potential future features:

* Bank sync integrations
* UPI SMS parsing
* AI financial assistant
* Voice expense entry
* Shared family budgeting
* Goal planning
* FIRE calculator
* Net worth forecasting

---

# Important Product Philosophy

The app should help the user:

* understand financial behavior
* improve spending decisions
* increase investment consistency
* reduce financial anxiety
* make intentional purchases
* visualize long-term progress

The app should feel:

"analytical but motivating"

not:

"punishing or restrictive"

---

# Suggested Development Priority

1. Data models
2. Transaction engine
3. Dashboard
4. Budget system
5. Analytics layer
6. Investment tracking
7. Chit tracking
8. Reporting
9. Automation features

---

# Deliverables Expected From OpenCode

* Full stack application
* Modular architecture
* Clean reusable components
* Responsive UI
* Database schema
* Seed/demo data
* Analytics engine
* Setup instructions
* Environment variable template
* Deployment guide

---

# Final Note

This app is intended to scale from:

"simple personal expense tracker"

to:

"full personal financial intelligence dashboard"

without requiring major rewrites in the future.
