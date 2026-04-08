

# Fix: `recalculate_fund_aum_for_date` Signature Mismatch

## Root Cause

The `void_yield_distribution` function (deployed in the last migration) calls `recalculate_fund_aum_for_date` with **3 arguments** `(uuid, date, aum_purpose)`, but the live database only has the **2-argument version** `(uuid, date)`. The 4-parameter version from the baseline was replaced by a simplified 2-parameter version in a subsequent migration.

Affected lines in `20260408153659`:
```sql
-- Line 86: 3 args — CRASHES
PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date, 'transaction'::aum_purpose);
-- Line 88: 3 args — CRASHES
PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date, 'reporting'::aum_purpose);
```

## Fix

One migration that patches `void_yield_distribution` to use the correct 2-argument signature:

```sql
PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
```

Remove the separate `IF v_dist.purpose = 'reporting'` branch — the 2-param version handles it internally.

Also scan the same migration's `edit_transaction` and `delete_transaction` functions for any 3/4-arg calls to the same function and fix those too.

## Scope

- **1 migration file** — `CREATE OR REPLACE FUNCTION void_yield_distribution` with corrected AUM call
- **No frontend changes**
- **No other functions affected** — `edit_transaction` and `delete_transaction` in this migration don't call `recalculate_fund_aum_for_date`

## Verification

After deploying: retry the void operation — it should succeed.

