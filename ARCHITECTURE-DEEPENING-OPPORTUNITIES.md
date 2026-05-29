# Architecture Deepening Opportunities

Date: 2026-05-29

This document captures deepening opportunities so they can be targeted later.

Vocabulary note: this uses the project terms from `PLAN.md` and the architecture terms Module, Interface, Implementation, Depth, Seam, Adapter, Leverage, and Locality.

## 1) Authenticated transport Module (selected now)

- **Files**
  - `src/features/accounts/data-access.ts`
  - `src/features/categories/data-access.ts`
  - `src/features/transactions/data-access.ts`
  - `src/features/budgets/data-access.ts`
  - `src/features/investments/data-access.ts`
  - `src/features/loans/data-access.ts`
  - `src/features/analytics/data-access.ts`
  - `src/features/dashboard/data-access.ts`
  - `src/features/recurring/data-access.ts`
- **Problem**
  - Each Module repeats auth header and request logic; several Interfaces expose weak typing (`any`, `Record<string, unknown>`).
  - The Seam is hypothetical because each Adapter is copy-pasted per feature.
- **Solution**
  - Deepen one transport Module with a stable Interface for auth, error modes, and decoding.
  - Keep per-domain Adapter Modules for accounts, categories, transactions, budgets, investments, loans, analytics, dashboard, recurring rules.
- **Benefits**
  - **Locality:** auth/error behavior changes in one Implementation.
  - **Leverage:** typed call patterns reused by all feature callers.
  - **Tests:** Interface contract tests replace duplicated request tests.
- **Deletion test**
  - Deleting one current data-access Module mostly moves `fetch` calls into callers, indicating shallow Depth.

## 2) Loans/EMI/Investments workflow Module

- **Files**
  - `src/routes/api/loans/index.tsx`
  - `src/routes/api/loans/$id.tsx`
  - `src/routes/api/emis/index.tsx`
  - `src/routes/api/emis/$id.tsx`
  - `src/routes/api/investments/index.tsx`
  - `src/routes/api/investments/$id.tsx`
- **Problem**
  - Similar Implementation is duplicated for paired account lifecycle and unwind logic.
  - Route-level Modules own too much orchestration and leak the Seam.
- **Solution**
  - Deepen a shared workflow Module for paired-account lifecycle.
  - Keep instrument-specific Adapter Modules for loan/EMI/investment differences.
- **Benefits**
  - **Locality:** lifecycle invariants live in one place.
  - **Leverage:** one fix applies across loan, EMI, and investment flows.
  - **Tests:** Interface tests can assert lifecycle outcomes instead of route details.
- **Deletion test**
  - Deleting one flow forces copy/edit from sibling Modules, indicating missing Depth.

## 3) Ledger linkage Module (replace notes convention)

- **Files**
  - `src/routes/api/investment-entries/$id.tsx`
  - `src/routes/api/loan-payments/$id.tsx`
  - `src/routes/api/emi-payments/$id.tsx`
  - `src/db/schema.ts`
- **Problem**
  - Linkage relies on `transactions.notes` prefixes and `like(...)` matching.
  - The Interface guarantee is weak and the Seam is implicit.
- **Solution**
  - Deepen a linkage Module with explicit relational linkage.
  - Use Adapter writes from investment entry, loan payment, and EMI payment paths.
- **Benefits**
  - **Locality:** one Implementation owns reversal linkage behavior.
  - **Leverage:** all event producers use one reliable mechanism.
  - **Tests:** Interface tests verify linkage integrity and unwind completeness.
- **Deletion test**
  - If notes format changes, reversal behavior can fail across callers, showing shallow linkage Depth.

## 4) Budget month/time policy Module

- **Files**
  - `src/routes/api/dashboard/summary.tsx`
  - `src/routes/api/dashboard/budget-status.tsx`
  - `src/routes/api/analytics/category-breakdown.tsx`
  - `src/routes/api/monthly-budgets/$month.tsx`
- **Problem**
  - Month/time semantics are spread across Modules with mixed UTC/local behavior.
  - Callers must understand too much Implementation detail.
- **Solution**
  - Deepen a single month/time policy Module as the Seam for window derivation.
  - Use Adapter calls from dashboard analytics and budget Modules.
- **Benefits**
  - **Locality:** date policy changes happen once.
  - **Leverage:** one policy powers dashboard and budget calculations.
  - **Tests:** deterministic Interface tests for rollover/timezone behavior.
- **Deletion test**
  - Deleting one local helper causes date-window logic to reappear in many callers.

## 5) Protected page orchestration Module split

- **Files**
  - `src/routes/_protected/loans/index.tsx`
  - `src/routes/_protected/categories/index.tsx`
  - `src/routes/_protected/transactions/index.tsx`
  - `src/routes/_protected/budgets/index.tsx`
  - `src/routes/_protected/investments/index.tsx`
- **Problem**
  - Large Modules mix query orchestration, form behavior, domain shaping, and view logic.
  - The practical Interface for maintainers is entire files, reducing AI navigability.
- **Solution**
  - Deepen workflow Modules behind explicit Seams and keep page shell Modules thin.
  - Add Adapter hooks per workflow.
- **Benefits**
  - **Locality:** change scope shrinks to focused Modules.
  - **Leverage:** reusable workflow logic across pages.
  - **Tests:** Interface tests target workflow behavior without page-wide setup.
- **Deletion test**
  - Deleting one workflow path currently requires edits across mixed concerns in big files.

## 6) Domain vocabulary + archive policy Module

- **Files**
  - `src/db/schema.ts`
  - `src/routes/api/accounts/$id.tsx`
  - `src/routes/api/categories/$id.tsx`
  - `src/routes/api/category-groups/$id.tsx`
  - `PLAN.md`
- **Problem**
  - Core vocabulary fields are free-text in schema and some delete behavior bypasses archive intent.
  - Policy knowledge is spread across route Implementations.
- **Solution**
  - Deepen schema/policy Modules so vocabulary invariants and archive behavior are centralized at the Seam.
  - Keep route Modules as Adapters that call that policy.
- **Benefits**
  - **Locality:** one place to evolve domain policy.
  - **Leverage:** safer assumptions for analytics and ledger behavior.
  - **Tests:** policy Interface tests assert allowed vocabulary and archive semantics.
- **Deletion test**
  - Removing route checks allows invalid vocabulary/policy drift to reappear across callers.

## Notes

- No ADR files were found in this repository at the time of review.
- No `CONTEXT.md` or `LANGUAGE.md` were found in this repository at the time of review.
