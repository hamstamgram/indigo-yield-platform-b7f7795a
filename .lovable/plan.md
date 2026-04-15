

# Fix: `chk_correction_has_parent` Constraint Violation

## Root Cause

In the `apply_segmented_yield_distribution_v5` RPC (line 109), when `p_purpose = 'reporting'`, the `distribution_type` is set to `'month_end'`. However, the database constraint only allows these values when `parent_distribution_id` is NULL:

```
original, daily, deposit, withdrawal, transaction
```

`'month_end'` is not in this list, so the INSERT fails.

## Fix

**Single migration** to update the RPC function — change line 109 from:

```sql
CASE WHEN p_purpose = 'reporting' THEN 'month_end' ELSE p_purpose::text END
```

to:

```sql
CASE WHEN p_purpose = 'reporting' THEN 'original' ELSE p_purpose::text END
```

`'original'` is semantically correct — a reporting yield is the initial (non-correction) distribution for that period. No other code references `'month_end'` as a distribution type, so this is a safe change with no downstream impact.

## Technical Details

- The `yield_distributions_distribution_type_check` constraint additionally restricts to: `original, correction, daily, deposit, withdrawal, transaction` — so `'month_end'` fails this constraint too.
- The `chk_correction_has_reason` constraint uses the same allowed list, so this fix resolves that potential failure as well.
- No frontend code changes needed — the client reads `distribution_type` but never filters on `