
-- Step 1: Purge stale audit_log rows from test-data cleanup period
-- Preserves VOID, WITHDRAWAL_COMPLETE, FEE_SCHEDULE, INTEGRITY_ALERT actions
DELETE FROM public.audit_log
WHERE created_at >= '2025-03-28T00:00:00Z'
  AND created_at < '2025-04-05T00:00:00Z'
  AND action IN ('INSERT', 'DELETE', 'UPDATE', 'DELTA_UPDATE');

-- Step 2: Purge corresponding data_edit_audit rows from same period
DELETE FROM public.data_edit_audit
WHERE edited_at >= '2025-03-28T00:00:00Z'
  AND edited_at < '2025-04-05T00:00:00Z';

-- Step 3: Create retention policy function for ongoing maintenance
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs(retention_days int DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz;
  audit_deleted bigint;
  edit_deleted bigint;
BEGIN
  -- Only admins can run this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can purge audit logs';
  END IF;

  cutoff := now() - (retention_days || ' days')::interval;

  -- Purge old audit_log rows (preserve compliance-critical actions)
  DELETE FROM public.audit_log
  WHERE created_at < cutoff
    AND action NOT IN (
      'VOID', 'VOID_TRANSACTION', 'VOID_DISTRIBUTION',
      'WITHDRAWAL_COMPLETE', 'WITHDRAWAL_APPROVED',
      'FEE_SCHEDULE_CHANGE', 'FEE_SCHEDULE_UPDATE',
      'INTEGRITY_ALERT', 'INTEGRITY_RUN',
      'ROLE_CHANGE', 'ADMIN_GRANT', 'ADMIN_REVOKE'
    );
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;

  -- Purge old data_edit_audit rows
  DELETE FROM public.data_edit_audit
  WHERE edited_at < cutoff;
  GET DIAGNOSTICS edit_deleted = ROW_COUNT;

  -- Log the purge action itself
  INSERT INTO public.audit_log (actor_user, entity, action, meta)
  VALUES (
    auth.uid(),
    'system',
    'AUDIT_PURGE',
    jsonb_build_object(
      'retention_days', retention_days,
      'cutoff', cutoff,
      'audit_log_deleted', audit_deleted,
      'data_edit_audit_deleted', edit_deleted
    )
  );

  RETURN jsonb_build_object(
    'audit_log_deleted', audit_deleted,
    'data_edit_audit_deleted', edit_deleted,
    'cutoff', cutoff
  );
END;
$$;
