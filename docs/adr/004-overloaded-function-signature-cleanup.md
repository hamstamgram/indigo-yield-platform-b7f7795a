# ADR 004: Overloaded Function Signature Cleanup

## Status
Accepted

## Context
Several functions had multiple signatures on remote (old + new) with different parameter orderings and types:
- `apply_investor_transaction`: old `(p_fund_id, p_investor_id, p_tx_type tx_type, ...)` vs new `(p_investor_id, p_fund_id, p_tx_type text, ...)`
- `adjust_investor_position`: old `(p_fund_id, p_investor_id, p_amount, p_tx_date, p_reason, p_admin_id)` vs new `(p_investor_id, p_fund_id, p_amount, p_reason, p_tx_date, p_admin_id)`
- `check_aum_reconciliation`: old `(p_as_of_date, p_fund_id, p_tolerance_pct)` vs new `(p_fund_id, p_tolerance, p_as_of_date)`
- `set_account_type_for_ib`: 1-arg version (hardcoded 'ib') vs 2-arg version (flexible)

The old signatures were wrappers that delegate to the new ones, creating confusion and maintenance burden.

## Decision
Drop old overloaded signatures, keep only the canonical versions:
1. `apply_investor_transaction(p_investor_id, p_fund_id, p_tx_type text, ...)` — matches frontend
2. `adjust_investor_position(p_investor_id, p_fund_id, p_amount, p_reason, p_tx_date, p_admin_id)` — consistent parameter ordering
3. `check_aum_reconciliation(p_fund_id, p_tolerance, p_as_of_date)` — fund-first is more natural
4. `set_account_type_for_ib(p_user_id, p_account_type text)` — flexible, covers single-arg use case

## Consequences
- Single canonical signature per function
- No silent delegation through wrapper functions
- Frontend already uses the new signatures — no breaking changes
- Any code using old signatures must update (the old ones were simple pass-throughs)