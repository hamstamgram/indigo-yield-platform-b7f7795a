-- ================================================================
-- Migration: Cleanup Orphaned Positions
-- Date: 2026-01-28
-- Severity: LOW
-- Description: Remove orphaned positions (zero balance with no transactions)
--              These are artifacts from testing or failed operations.
-- ================================================================

BEGIN;

-- ============================================================================
-- 1. IDENTIFY AND LOG ORPHANED POSITIONS BEFORE DELETION
-- ============================================================================

DO $$
DECLARE
    v_orphan_count integer;
    v_orphan_details text;
BEGIN
    -- Count orphaned positions
    SELECT COUNT(*) INTO v_orphan_count
    FROM investor_positions ip
    WHERE ip.current_value = 0
      AND ip.cost_basis = 0
      AND (ip.shares = 0 OR ip.shares IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
      );

    IF v_orphan_count > 0 THEN
        -- Get details for logging
        SELECT string_agg(
            'investor_id=' || ip.investor_id::text || ', fund_id=' || ip.fund_id::text,
            '; '
        ) INTO v_orphan_details
        FROM investor_positions ip
        WHERE ip.current_value = 0
          AND ip.cost_basis = 0
          AND (ip.shares = 0 OR ip.shares IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM transactions_v2 t
            WHERE t.investor_id = ip.investor_id
              AND t.fund_id = ip.fund_id
              AND t.is_voided = false
          )
        LIMIT 10;  -- Limit for log readability

        RAISE NOTICE 'Found % orphaned positions to delete. Sample: %', v_orphan_count, v_orphan_details;
    ELSE
        RAISE NOTICE 'No orphaned positions found - nothing to clean up.';
    END IF;
END $$;

-- ============================================================================
-- 2. DELETE ORPHANED POSITIONS
-- ============================================================================

-- Delete positions with zero balance and no associated (non-voided) transactions
DELETE FROM investor_positions ip
WHERE ip.current_value = 0
  AND ip.cost_basis = 0
  AND (ip.shares = 0 OR ip.shares IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  );

-- ============================================================================
-- 3. LOG CLEANUP IN AUDIT_LOG
-- ============================================================================

-- Only log if audit_log table exists and we have system user
DO $$
DECLARE
    v_deleted_count integer;
    v_system_user_id uuid;
BEGIN
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Try to find system user for audit
    SELECT id INTO v_system_user_id
    FROM profiles
    WHERE email = 'system@indigo.fund'
    LIMIT 1;

    IF v_deleted_count > 0 AND v_system_user_id IS NOT NULL THEN
        INSERT INTO audit_log (actor_user, action, entity, meta)
        VALUES (
            v_system_user_id,
            'DATA_CLEANUP',
            'investor_positions',
            jsonb_build_object(
                'reason', 'Removed orphaned zero-balance positions with no transactions',
                'deleted_count', v_deleted_count,
                'migration', '20260128100001_cleanup_orphaned_positions',
                'timestamp', now()
            )
        );
        RAISE NOTICE 'Audit log entry created for deletion of % orphaned positions', v_deleted_count;
    ELSIF v_deleted_count > 0 THEN
        RAISE NOTICE 'Deleted % orphaned positions (no system user for audit log)', v_deleted_count;
    END IF;
END $$;

-- ============================================================================
-- 4. VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_remaining integer;
BEGIN
    -- Verify no orphaned positions remain
    SELECT COUNT(*) INTO v_remaining
    FROM investor_positions ip
    WHERE ip.current_value = 0
      AND ip.cost_basis = 0
      AND (ip.shares = 0 OR ip.shares IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
      );

    IF v_remaining > 0 THEN
        RAISE WARNING 'Still have % orphaned positions after cleanup!', v_remaining;
    ELSE
        RAISE NOTICE 'SUCCESS: No orphaned positions remaining';
    END IF;
END $$;

COMMIT;
