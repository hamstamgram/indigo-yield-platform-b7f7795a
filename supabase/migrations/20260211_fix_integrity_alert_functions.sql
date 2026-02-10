-- Fix integrity alert functions referencing dropped `admin_alerts` table
-- Found by deep audit: 2 functions + 3 callers affected
--
-- P0: create_integrity_alert (called by 3 trigger functions on core tables)
--     - alert_on_aum_position_mismatch (trigger on investor_positions)
--     - alert_on_yield_conservation_violation (trigger on yield_distributions)
--     - alert_on_ledger_position_drift (no active trigger, but still fix)
-- P2: log_aum_position_mismatch (trigger function, no active trigger attached)

-- =============================================================================
-- FIX 10: Fix create_integrity_alert (called by 3 live trigger functions)
-- Original inserted into dropped `admin_alerts`. Now writes to `audit_log`.
-- =============================================================================
CREATE OR REPLACE FUNCTION create_integrity_alert(
  p_alert_type text,
  p_severity text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alert_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'INTEGRITY_ALERT_' || UPPER(p_alert_type),
    'integrity',
    v_alert_id::text,
    jsonb_build_object(
      'severity', p_severity,
      'title', p_title,
      'message', p_message,
      'alert_type', p_alert_type
    ) || p_metadata
  );
  RETURN v_alert_id;
END;
$$;

-- =============================================================================
-- FIX 11: Fix log_aum_position_mismatch (directly inserts into admin_alerts)
-- Redirect to audit_log.
-- =============================================================================
CREATE OR REPLACE FUNCTION log_aum_position_mismatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM fund_aum_mismatch WHERE has_mismatch = true
  LOOP
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'AUM_POSITION_MISMATCH',
      'fund',
      r.fund_id::text,
      jsonb_build_object(
        'fund_name', r.fund_name,
        'latest_aum', r.latest_aum,
        'sum_positions', r.sum_positions,
        'mismatch_amount', r.mismatch_amount
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;
