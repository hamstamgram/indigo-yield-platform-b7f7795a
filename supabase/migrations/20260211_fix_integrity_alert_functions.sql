-- Fix integrity alert functions referencing dropped `admin_alerts` table
-- + Fix reset functions with missing FK-dependent tables
--
-- P0: create_integrity_alert (called by 3 trigger functions on core tables)
--     - alert_on_aum_position_mismatch (trigger on investor_positions)
--     - alert_on_yield_conservation_violation (trigger on yield_distributions)
--     - alert_on_ledger_position_drift (no active trigger, but still fix)
-- P1: reset_all_data_keep_profiles (missing 7 tables - FK violations on delete)
--     reset_all_investor_positions (same - FK violations deleting transactions_v2)
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

-- =============================================================================
-- FIX 12: Fix reset_all_data_keep_profiles with correct FK ordering
-- Missing 7 tables: investor_yield_events, yield_allocations, ib_commission_ledger,
-- platform_fee_ledger, fund_aum_events, documents, investor_fee_schedule
-- platform_fee_ledger and ib_commission_ledger have NO ACTION FKs to
-- yield_distributions and transactions_v2 - must be deleted before parents.
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

  -- Phase 1: Leaf tables with FK refs to yield_distributions and transactions_v2
  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM investor_yield_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_yield_events', v_count);

  DELETE FROM yield_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_allocations', v_count);

  DELETE FROM ib_commission_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_count);

  DELETE FROM platform_fee_ledger;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_count);

  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  -- Phase 2: yield_distributions (self-refs OK for bulk delete, children cleared above)
  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  -- Phase 3: Statement/report tables
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

  -- Phase 4: Performance/AUM tables
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  DELETE FROM fund_aum_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_aum_events', v_count);

  -- Phase 5: Transactions (all FK children cleared above)
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- Phase 6: Positions (leaf - no children reference these)
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

-- =============================================================================
-- FIX 13: Fix reset_all_investor_positions with FK-safe ordering
-- Must NULL FK references in child tables before deleting transactions_v2
-- =============================================================================
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

  -- NULL out FK references to transactions_v2 before deleting
  UPDATE fee_allocations SET credit_transaction_id = NULL, debit_transaction_id = NULL
    WHERE credit_transaction_id IS NOT NULL OR debit_transaction_id IS NOT NULL;
  UPDATE yield_allocations SET ib_transaction_id = NULL, fee_transaction_id = NULL, transaction_id = NULL
    WHERE ib_transaction_id IS NOT NULL OR fee_transaction_id IS NOT NULL OR transaction_id IS NOT NULL;
  UPDATE platform_fee_ledger SET transaction_id = NULL WHERE transaction_id IS NOT NULL;
  UPDATE ib_commission_ledger SET transaction_id = NULL WHERE transaction_id IS NOT NULL;
  DELETE FROM investor_yield_events;

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
