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
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_all_data_keep_profiles(p_admin_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  IF p_confirmation_code != 'FULL RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Expected: FULL RESET';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  DELETE FROM statement_email_delivery;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_count);

  DELETE FROM generated_statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_statements', v_count);

  DELETE FROM statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statements', v_count);

  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('RESET_ALL_DATA', 'system', v_batch_id::text, p_admin_id, v_counts);

  RETURN jsonb_build_object(
    'success', true, 'batch_id', v_batch_id, 'deleted_counts', v_counts,
    'message', 'Full data reset completed. All transactional data cleared. Investor profiles preserved.');
END;
$$;

CREATE OR REPLACE FUNCTION reset_all_investor_positions(p_admin_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_positions_count INTEGER;
  v_performance_count INTEGER;
  v_aum_count INTEGER;
  v_transactions_count INTEGER;
  v_total_aum_before NUMERIC;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bulk_reset_all_positions'));
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_confirmation_code != 'RESET POSITIONS' THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;

  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum_before FROM investor_positions;
  SELECT COUNT(*) INTO v_positions_count FROM investor_positions;
  SELECT COUNT(*) INTO v_performance_count FROM investor_fund_performance;
  SELECT COUNT(*) INTO v_aum_count FROM fund_daily_aum;
  SELECT COUNT(*) INTO v_transactions_count FROM transactions_v2;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE investor_positions SET
    shares = 0, cost_basis = 0, current_value = 0,
    unrealized_pnl = 0, realized_pnl = 0, high_water_mark = 0,
    mgmt_fees_paid = 0, perf_fees_paid = 0, aum_percentage = 0,
    updated_at = now();

  DELETE FROM investor_fund_performance;
  DELETE FROM fund_daily_aum;
  DELETE FROM transactions_v2;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('RESET_ALL_POSITIONS', 'system', v_batch_id::text, p_admin_id,
    jsonb_build_object(
      'positions_reset', v_positions_count, 'performance_deleted', v_performance_count,
      'aum_deleted', v_aum_count, 'transactions_deleted', v_transactions_count,
      'total_aum_before', v_total_aum_before));

  RETURN jsonb_build_object(
    'success', true, 'batch_id', v_batch_id,
    'positions_reset', v_positions_count, 'performance_deleted', v_performance_count,
    'aum_deleted', v_aum_count, 'transactions_deleted', v_transactions_count,
    'total_aum_before', v_total_aum_before);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

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
