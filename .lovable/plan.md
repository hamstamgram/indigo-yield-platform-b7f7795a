

# Audit Report: Yield Distribution Application Failure

## Executive Summary

After a deep audit of the codebase, database schema, RPC functions, triggers, RLS policies, and error logs, I've identified **two distinct failure points** causing yield distribution to fail on Reporting mode:

1. **Primary Issue**: `ON CONFLICT` constraint mismatch in the trigger function
2. **Secondary Issue**: RLS policy cascade failures (symptom of the primary issue)

---

## Root Cause Analysis

### Issue #1: Trigger ON CONFLICT Constraint Mismatch (Critical)

**Error**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`

**Location**: Trigger function `sync_ib_allocations_from_commission_ledger`

**The Problem**:

When `apply_adb_yield_distribution_v3` inserts into `ib_commission_ledger` (for IB commissions), a trigger fires that tries to insert into `ib_allocations` with:

```sql
ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING
```

The constraint `ib_allocations_idempotency` is defined as:
```sql
UNIQUE (source_investor_id, fund_id, effective_date, ib_investor_id, distribution_id)
```

The problem occurs because the constraint includes `distribution_id` as a nullable column (`is_nullable: YES`). In PostgreSQL, **NULL values don't compare equal** in unique constraints, so when `distribution_id` contains a NULL, the ON CONFLICT clause cannot match using this constraint.

However, looking at the RPC flow, `distribution_id` is populated from `new.yield_distribution_id` (from `ib_commission_ledger`) which gets its value from the `v_distribution_id` variable in `apply_adb_yield_distribution_v3`. This should NOT be NULL since it's set by:

```sql
INSERT INTO yield_distributions (...) RETURNING id INTO v_distribution_id
```

**Deeper Investigation**: The trigger's SELECT statement joins with `yield_distributions`:
```sql
FROM public.yield_distributions yd
WHERE yd.id = new.yield_distribution_id
```

If this join returns no rows (unlikely but possible during race conditions or if `yield_distribution_id` references a voided distribution), the INSERT...SELECT produces no rows. PostgreSQL still validates the ON CONFLICT clause syntax, but the error message suggests the constraint itself cannot be matched - possibly due to partial index confusion.

**There's a conflicting partial index**:
```sql
CREATE UNIQUE INDEX ib_allocations_distribution_unique 
ON public.ib_allocations USING btree (distribution_id, fund_id, source_investor_id, ib_investor_id) 
WHERE (distribution_id IS NOT NULL)
```

This is an **index only** (not a named constraint), but it covers similar columns. PostgreSQL may be getting confused between which index/constraint to use.

---

### Issue #2: RLS Permission Cascade (Secondary)

**Error**: `permission denied for table [various tables]`

These errors occurred AFTER the ON CONFLICT error, suggesting they're secondary failures. However, I also noticed the RLS policies on key tables (`ib_allocations`, `yield_allocations`, `fee_allocations`) all require `is_admin()` to be true.

The `is_admin()` function checks `auth.uid()` against `user_roles`. In `SECURITY DEFINER` functions, while the function runs with postgres privileges, `auth.uid()` still returns the original caller's ID.

If the user calling the RPC is not in the `user_roles` table with an admin role, the RLS policy check fails. However, `SECURITY DEFINER` should bypass RLS entirely for the function owner (postgres), so this shouldn't happen unless there's a nested function call that isn't `SECURITY DEFINER`.

---

## Technical Recommendations

### Fix 1: Resolve ON CONFLICT Constraint Issue (Critical)

**Option A** (Recommended): Modify the trigger to use the partial index that explicitly handles non-null distribution_ids:

```sql
-- Change from:
ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING

-- To (use partial index condition):
ON CONFLICT (distribution_id, fund_id, source_investor_id, ib_investor_id) 
WHERE distribution_id IS NOT NULL
DO NOTHING
```

This requires creating the partial index as a proper constraint, OR using `ON CONFLICT DO NOTHING` without specifying columns (but this loses idempotency guarantees).

**Option B**: Remove the nullable `distribution_id` from the `ib_allocations_idempotency` constraint since it's always populated when the trigger fires:

```sql
-- Drop and recreate constraint without distribution_id
ALTER TABLE ib_allocations DROP CONSTRAINT ib_allocations_idempotency;
ALTER TABLE ib_allocations ADD CONSTRAINT ib_allocations_idempotency 
  UNIQUE (source_investor_id, fund_id, effective_date, ib_investor_id);
```

**Option C**: Add a guard in the trigger to skip if distribution_id would be NULL:

```sql
-- Add early return if no matching distribution
IF NOT EXISTS (SELECT 1 FROM yield_distributions WHERE id = new.yield_distribution_id) THEN
  RETURN new;
END IF;
```

### Fix 2: Consolidate Conflicting Indexes

Remove the duplicate partial index since we have a proper constraint:

```sql
DROP INDEX IF EXISTS ib_allocations_distribution_unique;
```

OR make the constraint a partial constraint that only applies when distribution_id is not null.

### Fix 3: Verify RLS Bypass for SECURITY DEFINER

Ensure all nested function calls in the yield distribution flow are also `SECURITY DEFINER`:

Verified that these are all `SECURITY DEFINER`:
- `apply_adb_yield_distribution_v3` ✓
- `apply_transaction_with_crystallization` ✓
- `calc_avg_daily_balance` ✓
- `crystallize_yield_before_flow` ✓
- `sync_ib_allocations_from_commission_ledger` ✓

---

## Implementation Steps (Ordered by Priority)

### P0: Critical (Must Fix)

1. **Modify `sync_ib_allocations_from_commission_ledger` trigger function** to either:
   - Add a guard clause to skip if the yield_distribution doesn't exist
   - Use `ON CONFLICT DO NOTHING` without constraint name (simplest)
   - Or use the matching WHERE clause for the partial index

2. **Create a migration** with the trigger fix:
```sql
CREATE OR REPLACE FUNCTION public.sync_ib_allocations_from_commission_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Guard: Skip if no valid distribution
  IF new.yield_distribution_id IS NULL THEN
    RETURN new;
  END IF;

  -- Only insert if yield_distribution exists and allocation doesn't already exist
  INSERT INTO public.ib_allocations (
    id, ib_investor_id, source_investor_id, fund_id, source_net_income,
    ib_percentage, ib_fee_amount, effective_date, created_at, created_by,
    distribution_id, period_start, period_end, purpose, source, is_voided
  )
  SELECT
    gen_random_uuid(), new.ib_id, new.source_investor_id, new.fund_id,
    new.gross_yield_amount, new.ib_percentage, new.ib_commission_amount,
    new.effective_date, COALESCE(new.created_at, now()), new.created_by,
    new.yield_distribution_id, yd.period_start, yd.period_end,
    yd.purpose, 'from_investor_yield', COALESCE(new.is_voided, false)
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id
  ON CONFLICT (source_investor_id, fund_id, effective_date, ib_investor_id, distribution_id) 
  DO NOTHING;

  RETURN new;
END;
$function$;
```

### P1: High Priority

3. **Drop the duplicate partial index** `ib_allocations_distribution_unique` since `ib_allocations_idempotency` already provides idempotency

4. **Add explicit RLS bypass** by adding policies that allow the service role, or ensure all admin operations go through `SECURITY DEFINER` functions

### P2: Verification

5. **Test the yield distribution flow** end-to-end after applying fixes
6. **Add monitoring** for the "ON CONFLICT" error pattern to catch future regressions

---

## Files to Modify

| File/Object | Type | Action |
|-------------|------|--------|
| `sync_ib_allocations_from_commission_ledger` | DB Function | Update ON CONFLICT clause |
| `ib_allocations_distribution_unique` | DB Index | Consider dropping (duplicate) |
| Migration file | New | Create `YYYYMMDDHHMMSS_fix_ib_allocations_on_conflict.sql` |

---

## Testing Plan

After applying the fix:

1. Open Yield Operations page
2. Select a fund with IB-linked investors
3. Enter a new AUM value (higher than current) 
4. Click "Preview Yield"
5. Click "Apply" with purpose = "Reporting"
6. Verify success toast appears
7. Check `yield_distributions`, `ib_allocations`, and `ib_commission_ledger` tables for new records

