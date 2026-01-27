-- ================================================================
-- Migration: Cleanup Orphaned Routing Audit Entries
-- Date: 2026-01-28
-- Severity: MEDIUM
-- Description: Remove route_to_fees audit entries that reference
--              deleted transactions, investors, and withdrawals.
--              These orphaned entries were created during test data
--              that was subsequently deleted.
-- ================================================================

BEGIN;

-- 1. Log what we're about to delete (for audit purposes)
DO $$
DECLARE
    v_orphan_count integer;
    v_orphan_details jsonb;
    v_admin_id uuid;
BEGIN
    -- Get an admin user for the audit log actor
    SELECT id INTO v_admin_id
    FROM profiles
    WHERE is_admin = true
    ORDER BY created_at
    LIMIT 1;

    -- Count and capture orphaned entries
    SELECT COUNT(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', al.id,
        'asset', al.meta->>'asset',
        'amount', al.meta->>'amount',
        'internal_credit_id', al.meta->>'internal_credit_id',
        'created_at', al.created_at
    )), '[]'::jsonb)
    INTO v_orphan_count, v_orphan_details
    FROM audit_log al
    WHERE al.action = 'route_to_fees'
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.id = (al.meta->>'internal_credit_id')::uuid
          AND t.is_voided = false
      );

    IF v_orphan_count > 0 AND v_admin_id IS NOT NULL THEN
        -- Log the cleanup action before deleting
        INSERT INTO audit_log (actor_user, action, entity, meta)
        VALUES (
            v_admin_id,
            'DATA_CLEANUP',
            'audit_log',
            jsonb_build_object(
                'reason', 'Removed orphaned route_to_fees entries referencing deleted test data',
                'deleted_count', v_orphan_count,
                'deleted_entries', v_orphan_details,
                'migration', '20260128100002_cleanup_orphaned_routing_audit',
                'timestamp', now()
            )
        );

        RAISE NOTICE 'Logged cleanup of % orphaned routing audit entries', v_orphan_count;
    ELSIF v_orphan_count > 0 THEN
        RAISE NOTICE 'Found % orphaned entries but no admin user to log cleanup', v_orphan_count;
    ELSE
        RAISE NOTICE 'No orphaned routing audit entries found';
    END IF;
END $$;

-- 2. Delete orphaned route_to_fees entries
DELETE FROM audit_log al
WHERE al.action = 'route_to_fees'
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE t.id = (al.meta->>'internal_credit_id')::uuid
      AND t.is_voided = false
  );

-- 3. Verify cleanup
DO $$
DECLARE
    v_remaining integer;
BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM audit_log
    WHERE action = 'route_to_fees'
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.id = (meta->>'internal_credit_id')::uuid
          AND t.is_voided = false
      );

    IF v_remaining > 0 THEN
        RAISE WARNING 'Still have % orphaned routing entries after cleanup!', v_remaining;
    ELSE
        RAISE NOTICE 'SUCCESS: All orphaned routing entries cleaned up';
    END IF;
END $$;

COMMIT;
