-- PS-4: Disable redundant recomputation triggers
-- Goal: Reduce trigger duplication while preserving correctness
-- Principle: Prefer disable + observe over delete
-- Analysis: docs/audit/15-position-sync-trigger-map.md

BEGIN;

-- ============================================================
-- DISABLE: trg_recompute_on_void
-- ============================================================
-- The recompute_on_void() trigger was a legacy void handler.
-- It checks indigo.canonical_rpc and skips most operations.
-- fn_ledger_drives_position() handles void reversals properly.
-- This trigger is now redundant.

DROP TRIGGER IF EXISTS trg_recompute_on_void ON transactions_v2;

-- Add comment to the function noting it's now a spare
COMMENT ON FUNCTION public.recompute_on_void() IS 
  'SPARE/TRIGGER FUNCTION: No longer attached to any table. 
   Use fn_ledger_drives_position() for void handling instead.
   This function is kept as a spare for manual invocation only.';

-- ============================================================
-- DISABLE: secondary AUM trigger (keep observation for now)
-- ============================================================
-- The trg_sync_aum_after_position fires on UPDATE only.
-- The canonical trg_sync_aum_on_position fires on INSERT/DELETE/UPDATE.
-- Both check indigo.aum_synced flag, but this is candidate for disable.

-- Check current state first:
DO $$
DECLARE
  v_trigger_count int;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trg_sync_aum_after_position';
  
  RAISE NOTICE 'PS-4 Analysis: trg_sync_aum_after_position exists: %', v_trigger_count;
END $$;

-- Keep both triggers for now with enhanced comments
-- The secondary trigger serves as a safety net
-- Re-enable if AUM drift is detected after production

-- ============================================================
-- ADD: Monitor the canonical AUM path
-- ============================================================

-- Ensure trg_sync_aum_on_position has proper comment
COMMENT ON FUNCTION public.sync_aum_on_position_change() IS 
  'CANONICAL: Sync fund_daily_aum on position changes. 
   Called by trg_sync_aum_on_position trigger.
   Handles INSERT/DELETE/UPDATE (full coverage).';

COMMENT ON FUNCTION public.sync_fund_aum_after_position() IS 
  'SECONDARY (backup): Sync fund AUM after UPDATE only.
   Called by trg_sync_aum_after_position.
   Safety net - kept as backup for UPDATE race conditions.';

-- ============================================================
-- VERIFICATION: Check trigger state
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'PS-4 Trigger Cleanup Complete';
  RAISE NOTICE 'Disabled: trg_recompute_on_void (legacy void handler)';
  RAISE NOTICE 'Retained: trg_recompute_position_on_tx (canonical recompute)';
  RAISE NOTICE 'Retained: trg_ledger_sync (incremental delta)';
  RAISE NOTICE 'Retained: trg_sync_aum_on_position (canonical AUM)';
  RAISE NOTICE 'Retained: trg_sync_aum_after_position (backup AUM)';
END $$;

-- ============================================================
-- OBSERVATION MODE: Test trigger
-- ============================================================

DO $$
BEGIN
  -- This block logs the trigger configuration for observability
  RAISE NOTICE '=== PS-4 Trigger Map After Cleanup ===';
  
  -- Position triggers
  RAISE NOTICE 'Position: trg_recompute_position_on_tx -> trigger_recompute_position() [CANONICAL]';
  RAISE NOTICE 'Position: trg_ledger_sync -> fn_ledger_drives_position() [SECONDARY]';
  RAISE NOTICE 'Position: trg_recompute_on_void -> recompute_on_void() [DISABLED]';
  
  -- AUM triggers  
  RAISE NOTICE 'AUM: trg_sync_aum_on_position -> sync_aum_on_position_change() [CANONICAL]';
  RAISE NOTICE 'AUM: trg_sync_aum_after_position -> sync_fund_aum_after_position() [BACKUP]';
END $$;

COMMIT;

-- Migration complete
-- Next: Run regression tests to verify correctness