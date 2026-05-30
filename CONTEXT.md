# Budgetinator Context

Core language for Budgetinator's financial domain. This file keeps naming stable so module seams and tests map to the same concepts.

## Language

**Financial Event**:
An immutable record of money movement, such as income, expense, transfer, EMI payment, loan payment, or investment entry.
_Avoid_: Balance update, adjustment row

**Financial Posting**:
The domain operation that applies a Financial Event to account balances and balance history while enforcing posting invariants.
_Avoid_: Helper call, route-side balance write

**Paired Account**:
An account created to represent the non-cash side of a Financial Event, such as loan, EMI, or investment tracking.
_Avoid_: Shadow account, synthetic account

**Posting Key**:
A caller-supplied dedupe key used to make retries of a Financial Posting safe and idempotent.
_Avoid_: Request id, retry token

**Operation Kind**:
A fixed operation label used with Posting Key to scope idempotency for a Financial Posting, such as `transaction.create` or `loan.payment.delete`.
_Avoid_: Action name, endpoint name
