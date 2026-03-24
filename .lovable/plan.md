

# Rebuild All Positions from Ledger — Full Precision Reconciliation

## Problem

8 positions have tiny current_value mismatches (largest is ~7.5e-11 BTC) caused by the old 10-decimal precision. Additionally, several cost_basis values are stale at zero for investors who have fully withdrawn. The existing `recompute_investor_position` function already recomputes both `current_value` and `cost_basis` from the ledger — we just need to run it across all positions.

## Approach

A single migration that loops through every distinct `(investor_id, fund_id)` pair in `transactions_v2` and calls the existing `recompute_investor_position()` function. This function:
- Sums all non-voided transactions for `current_value`
- Computes `cost_basis` from deposits/withdrawals/adjustments
- Sets `is_active = (current_value > 0)`
- Uses `set_config('indigo.canonical_rpc', 'true', true)` to bypass the canonical write trigger

This is safe because the function is already the canonical writer for positions — it's the same function triggered after every transaction.

## One Issue to Fix First

The `recompute_investor_position` function declares variables as `numeric(28,10)` instead of `numeric(38,18)`. This truncates to 10 decimals when recomputing — the very precision loss we're trying to fix. The migration must first `CREATE OR REPLACE` the function with `numeric(38,18)` variables before running the rebuild loop.

## Migration Steps

1. **Upgrade `recompute_investor_position`** — change variable declarations from `numeric(28,10)` to `numeric(38,18)` so the rebuild uses full precision
2. **Loop all positions** — for each distinct `(investor_id, fund_id)` in `transactions_v2`, call `recompute_investor_position(investor_id, fund_id)`
3. **Result** — all 27 positions will have `current_value` and `cost_basis` exactly matching their ledger sums at 18 decimal precision

## What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| Thomas IND-BTC | +7.5e-11 drift | 0 |
| Indigo Fees IND-BTC | -7.5e-11 drift | 0 |
| Jose IND-SOL | +4.1e-11 drift | 0 |
| All 8 value mismatches | Various ~1e-11 | Exact zero |
| Cost basis staleness | Zero for exited investors | Correct from ledger |

## Safety

- `recompute_investor_position` is the battle-tested canonical position writer
- It's the same function called by `trg_ledger_sync` after every transaction
- The migration is idempotent (running it again produces the same result)
- No transactions are modified — only position cache is refreshed
- The function upgrade is backward-compatible (wider precision, same logic)

## Files to Change

| Type | Detail |
|------|--------|
| Migration | `CREATE OR REPLACE` the function with `numeric(38,18)` variables, then loop-call it for all positions |

