-- Cleanup: Cancel 2 orphaned withdrawal requests whose transactions were fully voided
-- These are stuck in 'completed' but have no backing ledger entries

-- 1. Bypass the state machine guard trigger
SET LOCAL "indigo.canonical_rpc" = 'true';

-- 2. Cancel the orphaned requests
UPDATE public.withdrawal_requests
SET status = 'cancelled',
    admin_notes = COALESCE(admin_notes, '') || ' [AUTO-CLEANUP 2026-04-08: Cancelled — all backing transactions voided, no financial exposure]'
WHERE id IN (
  '3f340119-d14c-46d3-8347-cb33a989518d',
  '275d54e2-4cfb-4dc6-803f-ecb8753e62e3'
)
AND status = 'completed';

-- 3. Audit trail
INSERT INTO public.audit_log (actor_user, entity, entity_id, action, meta)
VALUES
  (NULL, 'withdrawal_requests', '3f340119-d14c-46d3-8347-cb33a989518d', 'orphan_cleanup',
   '{"reason": "All backing transactions voided. Status corrected from completed to cancelled.", "migration": "20260408_orphan_cleanup"}'::jsonb),
  (NULL, 'withdrawal_requests', '275d54e2-4cfb-4dc6-803f-ecb8753e62e3', 'orphan_cleanup',
   '{"reason": "All backing transactions voided. Status corrected from completed to cancelled.", "migration": "20260408_orphan_cleanup"}'::jsonb);

-- 4. Reset flag
RESET "indigo.canonical_rpc";