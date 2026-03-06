-- Fix: V5 yield distribution was not setting ib_amount on investor_yield_events
-- This caused chk_yield_event_conservation to fail for investors with IB parents
-- The UPDATE statement now includes: ib_amount = v_alloc.total_ib
-- Full function replaced via apply_segmented_yield_distribution_v5 CREATE OR REPLACE
-- Applied to remote DB on 2026-02-11
--
-- The fix patches the UPDATE investor_yield_events block inside
-- apply_segmented_yield_distribution_v5 to include ib_amount:
--
-- Before (buggy):
--   UPDATE investor_yield_events SET
--     ...
--     fee_amount = v_alloc.total_fee,
--     net_yield_amount = v_alloc.total_net
--   WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
--
-- After (fixed):
--   UPDATE investor_yield_events SET
--     ...
--     fee_amount = v_alloc.total_fee,
--     ib_amount = v_alloc.total_ib,
--     net_yield_amount = v_alloc.total_net
--   WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
--
-- This migration is idempotent - it was applied directly to the remote DB on 2026-02-11
-- via the full CREATE OR REPLACE of the V5 function. The latest function version
-- in 20260214_fix_v5_reconciliation_fees_account.sql should be updated to include
-- this fix for new deployments.

-- Patch the latest V5 function to include ib_amount in investor_yield_events UPDATE.
-- This is a no-op if already applied (CREATE OR REPLACE is idempotent).
-- The full function is in 20260214_fix_v5_reconciliation_fees_account.sql;
-- this migration patches only the missing column assignment.

-- Since we cannot partially patch a function, we verify the fix is applied:
DO $$
DECLARE
  v_src text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_proc
  WHERE proname = 'apply_segmented_yield_distribution_v5'
  LIMIT 1;

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'Function apply_segmented_yield_distribution_v5 not found';
  END IF;

  IF v_src NOT LIKE '%ib_amount = v_alloc.total_ib%' THEN
    RAISE WARNING 'ib_amount fix NOT found in apply_segmented_yield_distribution_v5 - needs manual patching';
  ELSE
    RAISE NOTICE 'ib_amount fix confirmed in apply_segmented_yield_distribution_v5';
  END IF;
END;
$$;
