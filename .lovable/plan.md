
# Fix: yield_distributions.is_voided Not Being Set in void_fund_daily_aum

## Problem Identified

When voiding an AUM record, the yield distribution still appears in the UI because:

| Field | Current Value | Expected |
|-------|---------------|----------|
| `status` | `'voided'` | `'voided'` |
| `is_voided` | **`false`** | **`true`** |

The `void_fund_daily_aum` function only sets `status = 'voided'` but the UI (`YieldDistributionsPage.tsx` line 149) filters by `.eq("is_voided", false)`.

## Root Cause

In the migration I just deployed, line 63 is missing `is_voided = true`:

```sql
-- Current (broken):
UPDATE yield_distributions
SET status = 'voided', voided_at = NOW(), voided_by = p_admin_id,
    void_reason = 'Cascade from fund_daily_aum: ' || p_reason

-- Should be:
UPDATE yield_distributions
SET status = 'voided', is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    void_reason = 'Cascade from fund_daily_aum: ' || p_reason
```

## Solution

### Part 1: Fix the RPC Function

Create a migration to update `void_fund_daily_aum` to also set `is_voided = true` on `yield_distributions`.

### Part 2: Fix Existing Data

The Sep 4, 2025 yield distribution needs to be fixed in the database:

```sql
UPDATE yield_distributions 
SET is_voided = true 
WHERE id = '10219dae-0083-45a6-a0f4-bfb5db17c0dc';
```

## Technical Changes

**Migration: Add `is_voided = true` to yield_distributions UPDATE**

The UPDATE statement for `yield_distributions` changes from:

```sql
UPDATE yield_distributions
SET status = 'voided', voided_at = NOW(), voided_by = p_admin_id,
    void_reason = 'Cascade from fund_daily_aum: ' || p_reason
```

To:

```sql
UPDATE yield_distributions
SET status = 'voided', is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    void_reason = 'Cascade from fund_daily_aum: ' || p_reason
```

**Data Fix: Correct the existing broken record**

```sql
UPDATE yield_distributions 
SET is_voided = true 
WHERE status = 'voided' AND is_voided = false;
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Voided distribution still shows in UI | `is_voided` not set to `true` | Add `is_voided = true` to the UPDATE statement |
| Existing Sep 4 record broken | Previous void ran with bug | Data fix to set `is_voided = true` |

## Testing After Implementation

1. Refresh the Yield Distributions page
2. Verify Sep 4, 2025 distribution no longer appears
3. Test voiding another yield record
4. Verify it disappears from both Recorded Yields and Yield Distributions pages
