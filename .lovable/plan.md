

# Rebuild All Positions with Full 18-Decimal Precision

## Problem
8 positions have tiny value mismatches (up to ~7.5e-11) because `recompute_investor_position` declares internal variables as `numeric(28,10)`, truncating at 10 decimals during computation.

## What the Migration Does

**Single SQL migration with two parts:**

### Part 1: Upgrade the Function
`CREATE OR REPLACE` the `recompute_investor_position` function, changing:
```
v_current_value numeric(28,10)  →  numeric(38,18)
v_cost_basis    numeric(28,10)  →  numeric(38,18)
```
Logic stays identical. Only the variable precision changes.

### Part 2: Rebuild All Positions
Loop through every distinct `(investor_id, fund_id)` pair in `transactions_v2` and call the upgraded function. This recalculates `current_value`, `cost_basis`, and `is_active` from the ledger at full 18-decimal precision.

## What Gets Fixed

| Position | Current Drift | After |
|----------|--------------|-------|
| Thomas IND-BTC | +7.5e-11 | 0 |
| Indigo Fees IND-BTC | -7.5e-11 | 0 |
| Jose IND-SOL | +4.1e-11 | 0 |
| All 8 mismatches | Various ~1e-11 | Exact zero |

Withdrawal positions (Ryan IND-XRP, completed full exits, etc.) are included -- the function handles WITHDRAWAL type transactions and the dust amounts will reflect exact ledger sums.

## Safety
- Same function already called by `trg_recompute_position_on_tx` after every transaction
- Idempotent -- running again produces identical results
- No transactions modified, only position cache refreshed
- Wider precision is backward-compatible

## Files to Change

| Type | Detail |
|------|--------|
| Migration | `CREATE OR REPLACE` function with `numeric(38,18)` vars, then loop-rebuild all positions |

