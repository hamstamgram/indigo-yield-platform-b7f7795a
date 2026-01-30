
# Comprehensive Database & Codebase Audit Report

## Summary

I've performed an extensive audit of the database integrity and codebase. Here are the findings:

---

## P0: Critical Bug Found

### Missing `yield_allocations` Void in `void_fund_daily_aum`

**Issue:** The `void_fund_daily_aum` function does NOT void `yield_allocations` records when voiding an AUM record.

**Evidence:**
```
yield_allocations with is_voided=false linked to voided distributions: 2 records
```

These 2 orphaned `yield_allocations` are:
- Distribution `35b7cf0a-f42c-4c10-b6c4-c76523af197b` (period_end: 2026-09-04)
- Distribution `10219dae-0083-45a6-a0f4-bfb5db17c0dc` (period_end: 2025-09-04)

**Impact:** UI may show incorrect allocation data if querying yield_allocations without joining to check distribution status.

**Root Cause:** The `void_fund_daily_aum` function (updated in migration `20260130125614`) includes steps for:
1. yield_distributions ✅
2. transactions_v2 ✅
3. investor_yield_events ✅
4. fee_allocations ✅
5. ib_allocations ✅
6. fund_daily_aum ✅

But is **missing yield_allocations** voiding!

---

## Fix Required

### Part 1: Update RPC Function

Add step to void `yield_allocations` in `void_fund_daily_aum`:

```sql
-- Add after fee_allocations voiding (step 5):

-- Void yield_allocations
UPDATE yield_allocations
SET is_voided = true
WHERE distribution_id IN (
  SELECT id FROM yield_distributions
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND purpose::text = v_record.purpose::text
);
```

### Part 2: Data Fix

Fix the 2 existing orphaned records:

```sql
UPDATE yield_allocations
SET is_voided = true
WHERE distribution_id IN (
  SELECT id FROM yield_distributions
  WHERE is_voided = true
)
AND is_voided = false;
```

---

## Other Findings (Clean)

| Check | Status | Details |
|-------|--------|---------|
| yield_distributions status/is_voided sync | ✅ Clean | No mismatches after previous fix |
| fee_allocations cascade | ✅ Clean | All voided correctly |
| ib_allocations cascade | ✅ Clean | All voided correctly |
| transactions_v2 cascade | ✅ Clean | All yield-related txs voided |
| investor_yield_events cascade | ✅ Clean | All voided correctly |
| Position ledger drift | ✅ Clean | No drift detected |
| Duplicate positions | ✅ Clean | No duplicates |
| Orphaned positions | ✅ Clean | All investors exist |

---

## Security Linter Warnings

The Supabase linter detected 5 issues:

| Type | Count | Severity |
|------|-------|----------|
| Security Definer View | 3 | ERROR |
| Function Search Path Mutable | 2 | WARN |

These are pre-existing security warnings and should be addressed separately, but are not data integrity issues.

---

## Migration Plan

### File: `supabase/migrations/20260130_fix_void_fund_daily_aum_yield_allocations.sql`

1. Add canonical flag bypass for data fix
2. Fix existing orphaned `yield_allocations`
3. Update `void_fund_daily_aum` to include `yield_allocations` voiding

---

## Technical Implementation

```sql
-- Part 1: Fix existing data
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  
  UPDATE yield_allocations
  SET is_voided = true
  WHERE distribution_id IN (
    SELECT id FROM yield_distributions WHERE is_voided = true
  )
  AND is_voided = false;
END;
$$;

-- Part 2: Update void_fund_daily_aum function
-- Add yield_allocations voiding step after fee_allocations (step 5)
-- Uses same distribution matching logic
```

---

## Testing After Fix

1. Refresh Yield Distributions page - all allocation breakdowns should be accurate
2. Void another AUM record and verify `yield_allocations` are voided
3. Run integrity check: `SELECT * FROM yield_allocations ya JOIN yield_distributions yd ON ya.distribution_id = yd.id WHERE ya.is_voided = false AND yd.is_voided = true;` should return 0 rows
