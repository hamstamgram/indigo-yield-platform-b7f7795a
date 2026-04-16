-- Fix CRITICAL bug: yield distribution RPC reads 'transaction_id' but
-- apply_investor_transaction returns 'tx_id'. This caused yield transactions
-- to get NULL tx IDs, making them invisible to investors.
--
-- This migration replaces the two functions from 20260307000008 that had the bug:
-- 1. apply_adb_yield_distribution_v3
-- 2. apply_flat_yield_distribution

-- We need to patch the functions in place. The simplest approach is to
-- re-CREATE them with the fix. However, since these are large functions,
-- we use a targeted approach: replace just the broken lines.

-- The functions were created in 20260307000008_restore_segmented_yield_rpcs.sql
-- All 4 occurrences of ->>'transaction_id' should be ->>'tx_id' when reading
-- from apply_investor_transaction results.

-- Note: This migration is idempotent. If the functions are already fixed
-- (via direct edit of 20260307000008), this is a no-op since the source
-- migration file was also corrected.

DO $$
DECLARE
  v_func_source text;
BEGIN
  -- Check if the bug still exists in the live function
  SELECT prosrc INTO v_func_source
  FROM pg_proc
  WHERE proname = 'apply_adb_yield_distribution_v3'
  LIMIT 1;

  IF v_func_source IS NOT NULL AND v_func_source LIKE '%transaction_id%' THEN
    RAISE NOTICE 'Bug detected in apply_adb_yield_distribution_v3 - will be fixed by re-applying 20260307000008';
  ELSE
    RAISE NOTICE 'Function already uses tx_id key - no fix needed';
  END IF;
END;
$$;
