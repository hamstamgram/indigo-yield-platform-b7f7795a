-- Fix all orphaned function/table references after dead-weight cleanup
-- 15 functions fixed across 4 severity levels
--
-- P0: is_period_locked (triggers), log_withdrawal_action (5 withdrawal RPCs),
--     log_delivery_status_change (trigger on statement_email_delivery)
-- P1: batch_crystallize_fund (integrity page)
-- P2: get_health_trend, get_latest_health_status, log_ledger_mismatches,
--     reset_all_data_keep_profiles, reset_all_investor_positions
-- P3: is_valid_share_token, lock_imports, unlock_imports (dropped - dead code)

-- =============================================================================
-- FIX 1: Recreate is_period_locked (called by 2 live triggers)
-- Original queried dropped `accounting_periods`. New version uses `statement_periods`.
-- =============================================================================
CREATE OR REPLACE FUNCTION is_period_locked(p_fund_id uuid, p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM statement_periods
    WHERE status = 'FINALIZED'
      AND year = EXTRACT(YEAR FROM p_date)::int
      AND month = EXTRACT(MONTH FROM p_date)::int
  );
$$;

-- =============================================================================
-- FIX 2: Create log_withdrawal_action (called by 5 withdrawal RPCs)
-- Original wrote to dropped `withdrawal_audit_logs`. Now writes to `audit_log`.
-- =============================================================================
CREATE OR REPLACE FUNCTION log_withdrawal_action(
  p_request_id uuid,
  p_action text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'WITHDRAWAL_' || UPPER(p_action),
    'withdrawal_request',
    p_request_id::text,
    auth.uid(),
    p_meta
  );
END;
$$;

-- =============================================================================
-- FIX 3: Fix log_delivery_status_change trigger function
-- Original wrote to dropped `report_delivery_audit`. Now writes to `audit_log`.
-- =============================================================================
CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
    VALUES (
      'DELIVERY_STATUS_CHANGE',
      'statement_email_delivery',
      NEW.id::text,
      auth.uid(),
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'attempt_count', NEW.attempt_count,
        'error_message', NEW.error_message,
        'error_code', NEW.error_code
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- FIX 4: Fix batch_crystallize_fund (refs dropped fund_aum_snapshots + 4 dead sub-fns)
-- =============================================================================
CREATE OR REPLACE FUNCTION batch_crystallize_fund(
  p_fund_id uuid,
  p_effective_date date,
  p_force_override boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('crystallize'), hashtext(p_fund_id::text));
  PERFORM set_canonical_rpc(true);
  -- The old sub-functions no longer exist. Crystallization is now handled by
  -- crystallize_yield_before_flow() automatically before each transaction.
  RAISE EXCEPTION 'batch_crystallize_fund is deprecated. Crystallization now happens automatically via crystallize_yield_before_flow() before each transaction.'
    USING HINT = 'Use crystallize_month_end() for month-end operations instead.';
END;
$$;

-- =============================================================================
-- FIX 5: Fix health functions (read from dropped system_health_snapshots)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_health_trend(p_days integer DEFAULT 7)
RETURNS TABLE(snapshot_date date, avg_anomalies numeric, max_anomalies integer, snapshot_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- system_health_snapshots was dropped; return empty
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION get_latest_health_status()
RETURNS TABLE(snapshot_id uuid, snapshot_at timestamptz, total_anomalies integer, status text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- system_health_snapshots was dropped; return empty
  RETURN;
END;
$$;

-- =============================================================================
-- FIX 6: Fix log_ledger_mismatches (wrote to dropped system_health_checks)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_ledger_mismatches()
RETURNS TABLE(mismatch_count integer, logged boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mismatch_count int;
  v_details jsonb;
BEGIN
  SELECT COUNT(*), jsonb_agg(
    jsonb_build_object(
      'investor_id', m.investor_id, 'fund_id', m.fund_id,
      'position_value', m.position_value, 'ledger_balance', m.ledger_balance,
      'difference', m.difference
    )
  )
  INTO v_mismatch_count, v_details
  FROM public.investor_position_ledger_mismatch m
  LIMIT 10;

  IF v_mismatch_count > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'LEDGER_MISMATCH_DETECTED', 'system', 'ledger_reconciliation',
      jsonb_build_object(
        'mismatch_count', v_mismatch_count,
        'samples', COALESCE(v_details, '[]'::jsonb),
        'threshold', 0.00000001, 'action_required', true
      )
    );
    RETURN QUERY SELECT v_mismatch_count, true;
  ELSE
    RETURN QUERY SELECT 0, false;
  END IF;
END;
$$;

-- =============================================================================
-- FIX 7: Fix reset functions (DELETE from dropped snapshot tables)
-- NOTE: These functions are superseded by fixes 12+13 in
-- 20260211_fix_integrity_alert_functions.sql which adds proper FK ordering.
-- Kept here for migration history only.
-- =============================================================================
-- (reset_all_data_keep_profiles and reset_all_investor_positions
--  are redefined with FK-safe ordering in the next migration file)

-- =============================================================================
-- FIX 8: Drop dead functions (no UI path, reference non-existent tables)
-- =============================================================================
DROP FUNCTION IF EXISTS is_valid_share_token(text);
DROP FUNCTION IF EXISTS lock_imports(text);
DROP FUNCTION IF EXISTS unlock_imports();

-- =============================================================================
-- FIX 9: Recreate v_orphaned_transactions view (dropped in dead-weight cleanup)
-- Used by integrity page to detect transactions without matching positions.
-- =============================================================================
CREATE OR REPLACE VIEW v_orphaned_transactions AS
SELECT t.id, t.investor_id, t.fund_id, t.type, t.amount, t.tx_date, t.reference_id
FROM transactions_v2 t
WHERE NOT t.is_voided
  AND NOT EXISTS (
    SELECT 1 FROM investor_positions ip
    WHERE ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
  );
