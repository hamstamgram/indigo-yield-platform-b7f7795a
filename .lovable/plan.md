
# Fix: Canonical RPC Flag Not Recognized in void_fund_daily_aum

## Problem Identified

When trying to void a yield record (e.g., September 4, 2025), the operation fails with:
```
CANONICAL_MUTATION_REQUIRED: Direct UPDATE on fund_daily_aum is blocked
```

### Root Cause Analysis

The `void_fund_daily_aum` RPC function correctly sets the canonical flag:
```sql
PERFORM set_config('indigo.canonical_rpc', 'true', true);
```

However, database logs show the trigger `enforce_canonical_daily_aum_mutation` is blocking the UPDATE despite this flag being set. The issue is a **session variable scope problem** in SECURITY DEFINER functions.

The chain of events:
1. `void_fund_daily_aum` (SECURITY DEFINER) sets `indigo.canonical_rpc = 'true'`
2. Function updates `yield_distributions` → triggers run
3. Function updates `transactions_v2` → triggers run  
4. Function calls `recompute_investor_position()` (another SECURITY DEFINER)
5. That function may call other SECURITY DEFINER helpers
6. Function tries to UPDATE `fund_daily_aum` → trigger fires
7. Trigger calls `is_canonical_rpc()` (SECURITY DEFINER) → doesn't see the flag

The **session config is lost** when nested SECURITY DEFINER functions are called because each creates a new execution context.

## Solution

Create a migration that modifies the `void_fund_daily_aum` function to **reset the canonical flag immediately before each protected table mutation**. This ensures the flag is always in scope when triggers fire.

### Technical Changes

**File: `supabase/migrations/20260130130000_fix_void_fund_daily_aum_canonical_flag.sql`**

```sql
-- Fix void_fund_daily_aum to reset canonical flag before each protected mutation
-- This ensures triggers see the flag even after nested SECURITY DEFINER calls

CREATE OR REPLACE FUNCTION public.void_fund_daily_aum(
  p_record_id uuid, 
  p_reason text, 
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_voided_tx_count integer := 0;
  v_voided_dist_count integer := 0;
  v_voided_events_count integer := 0;
  v_voided_fee_count integer := 0;
  v_voided_ib_count integer := 0;
  v_affected_investors uuid[];
  v_investor_id uuid;
  v_is_admin boolean := false;
BEGIN
  -- Set canonical flags for BOTH namespaces to ensure compatibility
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Admin validation (unchanged)
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(auth.uid(), p_admin_id)
    AND is_admin = true
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    SELECT EXISTS(
      SELECT 1 FROM profiles 
      WHERE id = p_admin_id
      AND is_admin = true
    ) INTO v_is_admin;
  END IF;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can void yield records';
  END IF;

  -- Get record
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  IF v_record.is_voided THEN RAISE EXCEPTION 'Record is already voided'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason of at least 5 characters is required';
  END IF;

  -- RESET FLAGS before each protected mutation --
  
  -- 1. Void yield_distributions
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  UPDATE yield_distributions
  SET status = 'voided', voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade from fund_daily_aum: ' || p_reason
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND purpose::text = v_record.purpose::text
    AND status != 'voided';
  GET DIAGNOSTICS v_voided_dist_count = ROW_COUNT;

  -- 2. Find affected investors
  SELECT ARRAY_AGG(DISTINCT investor_id) INTO v_affected_investors
  FROM transactions_v2
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;

  -- 3. Void transactions
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  UPDATE transactions_v2
  SET is_voided = true, void_reason = 'Cascade from fund_daily_aum: ' || p_reason,
      voided_at = NOW(), voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND tx_date = v_record.aum_date
    AND type IN ('YIELD', 'INTEREST', 'FEE', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- 4. Void investor_yield_events
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE investor_yield_events
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND event_date = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_events_count = ROW_COUNT;

  -- 5. Void fee_allocations
  UPDATE fee_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND period_end = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_fee_count = ROW_COUNT;

  -- 6. Void ib_allocations
  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE fund_id = v_record.fund_id
    AND effective_date = v_record.aum_date
    AND is_voided = false;
  GET DIAGNOSTICS v_voided_ib_count = ROW_COUNT;

  -- 7. Recompute positions (reset flag before this too)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  IF v_affected_investors IS NOT NULL THEN
    FOREACH v_investor_id IN ARRAY v_affected_investors LOOP
      PERFORM recompute_investor_position(v_investor_id, v_record.fund_id);
    END LOOP;
  END IF;

  -- 8. Mark AUM record as voided (CRITICAL: reset flags here!)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  UPDATE fund_daily_aum
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- 9. Audit log (unchanged)
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'void_fund_daily_aum', 'fund_daily_aum', p_record_id::TEXT, p_admin_id,
    jsonb_build_object('fund_id', v_record.fund_id, 'aum_date', v_record.aum_date,
                       'total_aum', v_record.total_aum, 'purpose', v_record.purpose),
    jsonb_build_object('is_voided', true, 'reason', p_reason),
    jsonb_build_object('voided_transactions', v_voided_tx_count,
                       'voided_distributions', v_voided_dist_count,
                       'voided_yield_events', v_voided_events_count,
                       'voided_fee_allocations', v_voided_fee_count,
                       'voided_ib_allocations', v_voided_ib_count,
                       'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0))
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', v_record.fund_id,
    'aum_date', v_record.aum_date,
    'purpose', v_record.purpose,
    'voided_at', NOW(),
    'cascade_voided_transactions', v_voided_tx_count,
    'cascade_voided_distributions', v_voided_dist_count,
    'cascade_voided_yield_events', v_voided_events_count,
    'cascade_voided_fee_allocations', v_voided_fee_count,
    'cascade_voided_ib_allocations', v_voided_ib_count,
    'affected_investors', COALESCE(array_length(v_affected_investors, 1), 0)
  );
END;
$$;
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Canonical flag not recognized | Session variable cleared by nested SECURITY DEFINER calls | Reset both `indigo.canonical_rpc` and `app.canonical_rpc` before each protected table mutation |

## Testing After Implementation

1. Navigate to Recorded Yields page
2. Find the Sep 4, 2025 record for Solana Yield Fund
3. Click void and provide a reason (min 5 characters)
4. Confirm the void operation completes successfully
5. Verify the record shows as voided
6. Verify related transactions are voided (check Transaction History)
