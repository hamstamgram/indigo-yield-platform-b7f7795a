# ADR 002: Financial Column Precision

## Status
Accepted

## Context
Financial columns in the database used inconsistent precision:
- `transactions_v2.amount`: `numeric(28,10)` (correct)
- `fee_allocations.fee_amount`, `fee_allocations.fee_percentage`: unbounded `numeric`
- `investor_yield_events`: all amount/pct columns were unbounded `numeric`
- `investor_positions.aum_percentage`, `cumulative_yield_earned`: unbounded `numeric`

Unbounded `numeric` risks:
- No enforcement of precision boundaries
- Inconsistent behavior in financial calculations
- Frontend Decimal.js expects bounded precision

## Decision
All financial columns (amounts, percentages, balances, AUM values) must use `numeric(28,10)`:
- 28 total digits
- 10 decimal places
- Sufficient for crypto precision (BTC has 8 decimals, most others less)

This matches `transactions_v2.amount` which was already correct.

## Consequences
- Consistent precision across all financial columns
- `numeric(28,10)` enforced at DB level
- Views depending on these columns must be dropped/recreated during ALTER
- Future columns must follow this standard (enforced by AGENTS.md + code review)