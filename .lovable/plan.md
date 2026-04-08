

# Fix: Withdrawal RPC Uses Truncated Precision (numeric(28,10) + 3dp default)

## Problem

Two precision violations in the current `approve_and_complete_withdrawal` RPC:

1. **Variable declarations use `numeric(28,10)`** — all internal variables (`v_final_amount`, `v_balance`, `v_dust`, `v_closing_aum`) are declared as `numeric(28,10)`, which silently truncates values to 10 decimal places. The platform standard is `numeric(38,18)`.

2. **`p_send_precision` defaults to 3** — when no amount is provided for a full exit, the auto-truncate path uses `TRUNC(v_balance, 3)`, which chops the withdrawal amount to 3 decimal places and makes the dust artificially small (e.g., 0.0006 instead of the full 18dp remainder).

3. **Frontend never sends `p_send_precision`** — `withdrawalService.ts` does not pass this parameter, so it always falls back to the default of 3.

## Fix (1 migration, no frontend changes)

Rebuild `approve_and_complete_withdrawal` with two changes:

- **All variable declarations**: `numeric(28,10)` → `numeric(38,18)` (6 variables)
- **Default `p_send_precision`**: `3` → `18` — matching the platform's numeric(38,18) storage precision. This means the auto-truncate path preserves all 18 decimal places, and dust is only the sub-attoscale residual (effectively zero unless the admin provides a specific amount).

This aligns the withdrawal RPC with the precision upgrade applied to the yield engine, position recomputation, and all other financial RPCs.

### Why not remove `p_send_precision` entirely?
It's still useful as an override for blockchain send limits (e.g., BTC on-chain only supports 8dp). But the default should be 18 (store full precision), not 3.

