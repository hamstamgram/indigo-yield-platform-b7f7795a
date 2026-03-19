

## Deep Audit: `fund_daily_aum` Duplicate Key Violation — RESOLVED

### Root Cause

Trigger-RPC race: `trg_sync_yield_to_aum` on `yield_distributions` inserted into `fund_daily_aum` with purpose='transaction', then the RPC did a raw INSERT (no ON CONFLICT) for the same row.

### Fixes Applied

1. **Migration**: Replaced the raw INSERT in `apply_segmented_yield_distribution_v5` with safe UPDATE-then-INSERT pattern for both reporting and transaction purposes.
2. **Migration**: Dropped redundant `trg_sync_yield_to_aum` trigger on `yield_distributions`.
3. **TS fix**: Corrected `merge_duplicate_profiles` RPC params from `p_keep_profile_id` to `p_keep_id` to match DB schema.

## Fix: `yield_allocations` Column Name Mismatch — RESOLVED

### Fix Applied
Migration corrected 5 column names (`gross_yield->gross_amount`, `net_yield->net_amount`, `fee_percentage->fee_pct`, `ib_percentage->ib_pct`, `opening_balance->position_value_at_calc`), removed non-existent columns (`purpose`, `created_by`), and added `ownership_pct`.

## Fix: "Amount must be positive" blocks zero/negative yield — RESOLVED

### Fix Applied
Updated `apply_investor_transaction` with type-aware amount guard. Zero/negative amounts now allowed for yield-family types (`YIELD`, `FEE_CREDIT`, `IB_CREDIT`, `DUST`, `FEE`). Capital flow types (`DEPOSIT`, `WITHDRAWAL`) retain strict positive-only check. Also expanded the tx_type whitelist to include all valid types (`ADJUSTMENT`).

## Fix: Fee percentages used as decimals instead of percentages — RESOLVED

### Fix Applied
Updated `apply_segmented_yield_distribution_v5` to divide fee_pct and ib_rate by 100 before multiplying against gross yield. Changed `v_fee := ROUND(v_gross * v_fee_pct, 10)` to `v_fee := ROUND(v_gross * (v_fee_pct / 100.0), 10)` and same for IB. The `calculate_yield_allocations` function (used by preview) already had the correct `/100` division.

## Fix: IB commission not subtracted from investor net yield — RESOLVED

### Fix Applied
Updated `apply_segmented_yield_distribution_v5` net calculation from `v_net := v_gross - v_fee` to `v_net := v_gross - v_fee - v_ib`. The IB commission was being credited to the IB account but not deducted from the investor's net yield, creating value from nothing. Conservation identity now holds: `net + fee_credit + ib_credit = gross`.

## Fix: Double fee deduction in yield distribution — RESOLVED

### Fix Applied
Removed the redundant `apply_investor_transaction(..., 'FEE', ...)` call on the investor from `apply_segmented_yield_distribution_v5`. The YIELD transaction already records the NET amount (gross - fee), so the separate FEE transaction was subtracting the fee a second time. Kept `fee_allocations` (audit, with `debit_transaction_id = NULL`), `platform_fee_ledger` (tracking), `FEE_CREDIT` to fees account, and `IB_CREDIT` to IB parent. Conservation identity: `net + fee_credit + ib_credit = gross`.
