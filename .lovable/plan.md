

# Fix: Drop Duplicate Function Overloads Before Recreating

## Problem
The migration failed because there are **two overloads** of `apply_segmented_yield_distribution_v5` with different parameter orders:

1. `(p_fund_id uuid, p_period_end date, p_recorded_aum numeric, p_created_by uuid, p_purpose aum_purpose, p_distribution_date date)`
2. `(p_fund_id uuid, p_recorded_aum numeric, p_distribution_date date, p_period_end date, p_purpose aum_purpose, p_created_by uuid)`

`CREATE OR REPLACE FUNCTION` only replaces a function with the **exact same signature**. Since our new function has a different parameter order than one or both existing overloads, PostgreSQL raises a conflict.

## Fix

A single SQL migration that:

1. Drops both existing overloads explicitly using their full signatures
2. Re-creates the fixed function (with transaction creation logic) using the canonical signature

```sql
DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date);
DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution_v5(uuid, numeric, date, date, aum_purpose, uuid);
```

Then the full `CREATE OR REPLACE FUNCTION` from the previous migration (with YIELD/FEE_CREDIT/IB_CREDIT transaction inserts, back-linking, closing_aum update, and upsert_fund_aum_after_yield call).

The data cleanup (voiding 10 phantom distributions) will also be included since the previous migration was never applied.

## Technical Details

**File**: New SQL migration

The canonical parameter order will be:
`(p_fund_id uuid, p_period_end date, p_recorded_aum numeric, p_created_by uuid, p_purpose aum_purpose DEFAULT 'reporting', p_distribution_date date DEFAULT NULL)`

This matches what the frontend `callRPC` in `yieldApplyService.ts` sends.
