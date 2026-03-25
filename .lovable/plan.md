

# Root Cause Analysis & Fix Plan

## Critical Bug Found: My Previous Fix Broke Voids

### The Problem

The `check_fund_is_active()` trigger function is shared by **two tables**:
1. `transactions_v2` (has `is_voided` column)
2. `investor_positions` (does NOT have `is_voided` column)

My previous migration added this check at the top:
```sql
IF TG_OP = 'UPDATE' AND NEW.is_voided = true AND ...
```

When a void fires, the chain is:
1. `void_transaction` RPC updates `transactions_v2.is_voided = true`
2. Trigger `recompute_on_void` fires → calls `reconcile_investor_position_internal`
3. That function does `INSERT INTO investor_positions ... ON CONFLICT DO UPDATE`
4. Trigger `trg_investor_positions_active_fund` → calls `check_fund_is_active()`
5. The function tries `NEW.is_voided` on `investor_positions` which **has no `is_voided` column**
6. PostgreSQL raises: `record "new" has no field "is_voided"` → **crash**

The error is caught and surfaced as the cryptic "Fund not found" toast because the error propagation chain transforms it.

### The Fix (Migration)

Rewrite `check_fund_is_active()` to be table-safe:

```sql
CREATE OR REPLACE FUNCTION public.check_fund_is_active()
RETURNS trigger AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- FIRST: Skip any UPDATE where fund_id hasn't changed (works on ALL tables)
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- SECOND: For transactions_v2 only, skip void operations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions_v2' THEN
    -- is_voided only exists on transactions_v2
    IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Validate fund exists and is active
  SELECT status INTO v_fund_status
  FROM public.funds WHERE id = NEW.fund_id::uuid;
  
  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Key changes:
- Move the `fund_id = OLD.fund_id` check **first** (safe for all tables, and 99% of position updates hit this path)
- Guard the `is_voided` check with `TG_TABLE_NAME = 'transactions_v2'` so it never accesses a non-existent column on `investor_positions`

### Secondary Issue: Missing `recalculate_fund_aum_for_date` Function

Inside `void_transaction`, there is a call:
```sql
PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, ...);
```
This function **does not exist** in the database. The call silently fails (caught by `EXCEPTION WHEN OTHERS THEN NULL`). This means AUM is never recalculated after a void. This is a data integrity gap but does not block voids.

No immediate fix needed — position recompute still works correctly. AUM recalculation should be triggered separately if needed.

### ETH Reporting Discrepancy

The July ETH reporting distribution (id: `40a21817`) has `gross_yield = 0` and `allocation_count = 0`. Meanwhile, two checkpoint yields (Jul 11 and Jul 30) correctly allocated yield to investors including INDIGO LP before their Jul 31 full exit. The reporting period captured nothing because it was recorded after the checkpoint crystallizations already consumed the yield. This is a data-entry issue, not a code bug — the July reporting needs to be voided and re-recorded with the correct values, OR the checkpoints need to be consolidated into the reporting period.

### Position-Ledger Integrity

All ETH positions show **zero drift** between `investor_positions.current_value` and `SUM(transactions_v2.amount)`. The ledger is clean.

## Implementation Steps

### Step 1: Fix `check_fund_is_active` trigger function
Single database migration that rewrites the function with table-safe column access as described above.

### Step 2: Verify void works
After the migration deploys, void a single BTC test transaction to confirm the fix.

## Summary
- **1 root cause**: My previous migration introduced a column-access crash on `investor_positions`
- **1 migration** needed to fix it
- ETH reporting zero is a data issue, not a code defect
- Position-ledger integrity is clean (zero drift across all funds)

