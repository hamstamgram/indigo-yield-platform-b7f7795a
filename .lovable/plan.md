

## Deep Audit: `fund_daily_aum` Duplicate Key Violation — RESOLVED

### Root Cause

Trigger-RPC race: `trg_sync_yield_to_aum` on `yield_distributions` inserted into `fund_daily_aum` with purpose='transaction', then the RPC did a raw INSERT (no ON CONFLICT) for the same row.

### Fixes Applied

1. **Migration**: Replaced the raw INSERT in `apply_segmented_yield_distribution_v5` with safe UPDATE-then-INSERT pattern for both reporting and transaction purposes.
2. **Migration**: Dropped redundant `trg_sync_yield_to_aum` trigger on `yield_distributions`.
3. **TS fix**: Corrected `merge_duplicate_profiles` RPC params from `p_keep_profile_id` to `p_keep_id` to match DB schema.

## Fix: `yield_allocations` Column Name Mismatch — RESOLVED

### Problem
The `apply_segmented_yield_distribution_v5` RPC used wrong column names for `yield_allocations` INSERT.

### Fix Applied
Migration corrected 5 column names (`gross_yield->gross_amount`, `net_yield->net_amount`, `fee_percentage->fee_pct`, `ib_percentage->ib_pct`, `opening_balance->position_value_at_calc`), removed non-existent columns (`purpose`, `created_by`), and added `ownership_pct`.
