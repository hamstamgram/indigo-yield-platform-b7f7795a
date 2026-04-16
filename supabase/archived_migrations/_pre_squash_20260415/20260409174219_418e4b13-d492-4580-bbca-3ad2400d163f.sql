
-- ============================================================
-- FIX 1: crystallize_yield_before_flow
-- Remove references to dropped fund_aum_events table and
-- non-existent get_existing_preflow_aum function.
-- Replace with position-sum fallback.
-- ============================================================
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_opening_aum numeric(38,18);
  v_yield_amount numeric(38,18);
  v_yield_pct numeric(38,18);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_distribution_id uuid;
  v_investors_processed int := 0;

  v_validation_result jsonb;

  v_total_gross_allocated numeric(38,18) := 0;
  v_total_fees_allocated numeric(38,18) := 0;
  v_total_net_allocated numeric(38,18) := 0;
  v_dust_amount numeric(38,18) := 0;

  v_total_adb numeric(38,18);
  v_weight numeric(38,18);

  v_investor record;
  v_investor_yield numeric(38,18);
  v_investor_fee numeric(38,18);
  v_investor_net numeric(38,18);
  v_investor_share_pct numeric(38,18);
  v_fee_pct numeric(38,18);
  v_scale int := 18;

  v_fund_daily_aum_record record;
BEGIN
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required'
      USING errcode = 'not_null_violation';
  END IF;

  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;

  -- Validate AUM against positions
  v_validation_result := validate_aum_against_positions_at_date(
    p_fund_id, p_closing_aum, v_event_date, 0.10, 'crystallize_yield_before_flow'
  );

  IF NOT (v_validation_result->>'valid')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'error_code', 'AUM_DEVIATION_ERROR',
      'message', v_validation_result->>'error',
      'validation', v_validation_result,
      'fund_id', p_fund_id,
      'entered_closing_aum', p_closing_aum
    );
  END IF;

  -- Determine opening AUM from fund_daily_aum (primary source)
  SELECT total_aum, aum_date INTO v_fund_daily_aum_record
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date <= v_event_date
    AND purpose = 'transaction'
    AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_fund_daily_aum_record.total_aum IS NOT NULL THEN
    v_opening_aum := v_fund_daily_aum_record.total_aum;
    v_period_start := v_fund_daily_aum_record.aum_date;
  ELSE
    -- Fallback: sum of active investor positions
    SELECT COALESCE(SUM(current_value), 0) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;
    v_period_start := v_event_date;
  END IF;

  v_yield_amount := p_closing_aum - v_opening_aum;
  v_days_in_period := v_event_date - v_period_start;

  -- No yield to distribute
  IF v_yield_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'snapshot_id', null, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', p_closing_aum, 'fund_yield_pct', 0,
      'gross_yield', 0, 'reused_preflow', false,
      'calculation_method', 'no_yield', 'message', 'No yield to distribute'
    );
  END IF;

  IF v_opening_aum > 0 THEN
    v_yield_pct := ROUND((v_yield_amount / v_opening_aum) * 100, v_scale);
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Calculate total ADB for weighting
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_adb
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true AND current_value > 0;

  IF v_total_adb <= 0 THEN
    v_total_adb := p_closing_aum;
  END IF;

  -- Distribute yield proportionally
  FOR v_investor IN
    SELECT ip.investor_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    v_weight := v_investor.current_value / NULLIF(v_total_adb, 0);
    v_investor_share_pct := ROUND(v_weight * 100, v_scale);
    v_investor_yield := ROUND(v_yield_amount * v_weight, v_scale);

    IF v_investor_yield > 0 THEN
      v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
      v_investor_fee := ROUND(v_investor_yield * v_fee_pct / 100, v_scale);
    ELSE
      v_fee_pct := 0; v_investor_fee := 0;
    END IF;

    v_investor_net := v_investor_yield - v_investor_fee;
    v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
    v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
    v_total_net_allocated := v_total_net_allocated + v_investor_net;

    v_investors_processed := v_investors_processed + 1;
  END LOOP;

  v_dust_amount := v_yield_amount - v_total_gross_allocated;

  INSERT INTO yield_distributions (
    fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
    gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
    period_start, period_end, dust_amount, dust_receiver_id, created_by,
    reference_id, calculation_method
  ) VALUES (
    p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
    v_total_gross_allocated, v_total_net_allocated, v_total_fees_allocated, v_investors_processed,
    CASE WHEN p_trigger_type = 'month_end' THEN 'daily' ELSE p_trigger_type END, 'applied'::yield_distribution_status, v_period_start, v_event_date, v_dust_amount, null, p_admin_id,
    'CRYS:' || p_fund_id::text || ':' || v_event_date::text, 'current_value_weighted'
  ) RETURNING id INTO v_distribution_id;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'snapshot_id', v_distribution_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct,
    'gross_yield', v_total_gross_allocated,
    'net_yield', v_total_net_allocated,
    'total_fees', v_total_fees_allocated,
    'investors_processed', v_investors_processed,
    'dust_amount', v_dust_amount,
    'distribution_id', v_distribution_id,
    'reused_preflow', false,
    'calculation_method', 'current_value_weighted',
    'message', format('Crystallized yield for %s investors using current_value weights', v_investors_processed)
  );
END;
$function$;


-- ============================================================
-- FIX 2: run_integrity_pack
-- Replace Check 2 (fund_aum_mismatch view doesn't exist) with
-- inline query. Fix Check 3 column conservation_gap → residual.
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_integrity_pack(
  p_scope_fund_id uuid DEFAULT NULL::uuid,
  p_scope_investor_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_ts timestamptz := clock_timestamp();
  v_violations jsonb := '[]'::jsonb;
  v_run_id uuid;
  v_rec RECORD;
  v_status text := 'pass';
BEGIN
  INSERT INTO admin_integrity_runs (status, triggered_by, scope_fund_id, scope_investor_id, created_by)
  VALUES ('running', 'manual', p_scope_fund_id, p_scope_investor_id, auth.uid())
  RETURNING id INTO v_run_id;

  -- Check 1: Ledger reconciliation
  FOR v_rec IN
    SELECT * FROM v_ledger_reconciliation
    WHERE ABS(drift) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ledger_reconciliation', 'severity', 'error',
      'investor_id', v_rec.investor_id, 'fund_id', v_rec.fund_id, 'drift', v_rec.drift
    );
    v_status := 'fail';
  END LOOP;

  -- Check 2: Fund AUM vs position sum mismatch (inline query — view does not exist)
  FOR v_rec IN
    SELECT
      fda.fund_id,
      f.name AS fund_name,
      fda.total_aum AS recorded_aum,
      COALESCE(pos.position_sum, 0) AS position_sum,
      fda.total_aum - COALESCE(pos.position_sum, 0) AS discrepancy
    FROM fund_daily_aum fda
    JOIN funds f ON f.id = fda.fund_id
    LEFT JOIN (
      SELECT fund_id, SUM(current_value) AS position_sum
      FROM investor_positions
      WHERE is_active = true
      GROUP BY fund_id
    ) pos ON pos.fund_id = fda.fund_id
    WHERE fda.is_voided = false
      AND fda.aum_date = (
        SELECT MAX(aum_date) FROM fund_daily_aum fda2
        WHERE fda2.fund_id = fda.fund_id AND fda2.is_voided = false AND fda2.purpose = 'reporting'
      )
      AND fda.purpose = 'reporting'
      AND ABS(fda.total_aum - COALESCE(pos.position_sum, 0)) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'fund_aum_mismatch', 'severity', 'warning',
      'fund_id', v_rec.fund_id, 'fund_name', v_rec.fund_name,
      'recorded_aum', v_rec.recorded_aum, 'position_sum', v_rec.position_sum,
      'discrepancy', v_rec.discrepancy
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 3: Yield distribution conservation (column is 'residual', not 'conservation_gap')
  FOR v_rec IN
    SELECT * FROM yield_distribution_conservation_check
    WHERE ABS(COALESCE(residual, 0)) > 0.00000001
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'yield_conservation', 'severity', 'error',
      'distribution_id', v_rec.distribution_id, 'residual', v_rec.residual
    );
    v_status := 'fail';
  END LOOP;

  -- Check 4: Orphaned transactions
  FOR v_rec IN
    SELECT * FROM v_orphaned_transactions
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'orphaned_transactions', 'severity', 'warning',
      'transaction_id', v_rec.id
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 5: Ghost completed withdrawals
  FOR v_rec IN
    SELECT * FROM v_ghost_completed_withdrawals
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ghost_completed_withdrawals', 'severity', 'error',
      'withdrawal_request_id', v_rec.withdrawal_request_id,
      'investor_id', v_rec.investor_id,
      'fund_id', v_rec.fund_id,
      'total_linked_txs', v_rec.total_linked_txs,
      'voided_txs', v_rec.voided_txs
    );
    v_status := 'fail';
  END LOOP;

  -- Check 6: Cost basis mismatch
  FOR v_rec IN
    SELECT * FROM v_cost_basis_mismatch
    WHERE ABS(cost_basis_variance) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'cost_basis_mismatch', 'severity', 'error',
      'investor_id', v_rec.investor_id, 'fund_id', v_rec.fund_id,
      'position_cost_basis', v_rec.position_cost_basis,
      'computed_cost_basis', v_rec.computed_cost_basis,
      'variance', v_rec.cost_basis_variance
    );
    v_status := 'fail';
  END LOOP;

  -- Check 7: Ledger vs position mismatches
  FOR v_rec IN
    SELECT * FROM v_ledger_position_mismatches
    WHERE ABS(difference) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ledger_position_mismatch', 'severity', 'error',
      'investor_id', v_rec.investor_id, 'fund_id', v_rec.fund_id,
      'position_balance', v_rec.position_balance,
      'ledger_balance', v_rec.ledger_balance,
      'difference', v_rec.difference
    );
    v_status := 'fail';
  END LOOP;

  -- Check 8: Missing withdrawal transactions
  FOR v_rec IN
    SELECT * FROM v_missing_withdrawal_transactions
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'missing_withdrawal_transactions', 'severity', 'error',
      'withdrawal_request_id', v_rec.withdrawal_request_id,
      'investor_id', v_rec.investor_id,
      'fund_id', v_rec.fund_id,
      'requested_amount', v_rec.requested_amount,
      'status', v_rec.status
    );
    v_status := 'fail';
  END LOOP;

  -- Check 9: Fee allocation orphans
  FOR v_rec IN
    SELECT * FROM v_fee_allocation_orphans
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'fee_allocation_orphans', 'severity', 'warning',
      'fee_allocation_id', v_rec.fee_allocation_id,
      'distribution_id', v_rec.distribution_id,
      'investor_id', v_rec.investor_id,
      'fee_amount', v_rec.fee_amount
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 10: IB allocation orphans
  FOR v_rec IN
    SELECT * FROM v_ib_allocation_orphans
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ib_allocation_orphans', 'severity', 'warning',
      'ib_allocation_id', v_rec.ib_allocation_id,
      'distribution_id', v_rec.distribution_id,
      'ib_investor_id', v_rec.ib_investor_id,
      'ib_fee_amount', v_rec.ib_fee_amount
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 11: Yield allocation orphans
  FOR v_rec IN
    SELECT * FROM v_yield_allocation_orphans
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'yield_allocation_orphans', 'severity', 'warning',
      'allocation_id', v_rec.allocation_id,
      'distribution_id', v_rec.distribution_id,
      'investor_id', v_rec.investor_id,
      'issue_type', v_rec.issue_type
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 12: Orphaned positions
  FOR v_rec IN
    SELECT * FROM v_orphaned_positions
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'orphaned_positions', 'severity', 'warning',
      'investor_id', v_rec.investor_id,
      'fund_id', v_rec.fund_id,
      'orphan_type', v_rec.orphan_type,
      'current_value', v_rec.current_value
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 13: Transaction-distribution orphans
  FOR v_rec IN
    SELECT * FROM v_transaction_distribution_orphans
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'transaction_distribution_orphans', 'severity', 'warning',
      'transaction_id', v_rec.transaction_id,
      'distribution_id', v_rec.distribution_id,
      'issue_type', v_rec.issue_type,
      'amount', v_rec.amount
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  UPDATE admin_integrity_runs
  SET status = v_status,
      violations = v_violations,
      runtime_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'status', v_status,
    'violation_count', jsonb_array_length(v_violations),
    'violations', v_violations,
    'runtime_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  );
END;
$function$;


-- ============================================================
-- FIX 3: force_delete_investor
-- Add IF EXISTS guard for investor_daily_balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin uuid; v_name text;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name
  FROM profiles WHERE id = p_investor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Investor not found');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- 1. Notifications & Comms
  DELETE FROM notifications WHERE user_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM support_tickets WHERE user_id = p_investor_id;

  -- 2. Compliance & Alerts
  DELETE FROM risk_alerts WHERE investor_id = p_investor_id OR acknowledged_by = p_investor_id OR resolved_by = p_investor_id;
  DELETE FROM admin_integrity_runs WHERE scope_investor_id = p_investor_id OR created_by = p_investor_id;
  DELETE FROM admin_alerts WHERE acknowledged_by = p_investor_id;

  -- 3. Yield & Fees
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id OR ib_investor_id = p_investor_id OR created_by = p_investor_id OR paid_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id OR ib_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;
  DELETE FROM ib_commission_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;

  -- 3b. Investor yield events (table may not exist)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
    UPDATE investor_yield_events SET created_by = NULL WHERE created_by = p_investor_id;
    UPDATE investor_yield_events SET voided_by = NULL WHERE voided_by = p_investor_id;
    UPDATE investor_yield_events SET made_visible_by = NULL WHERE made_visible_by = p_investor_id;
  END IF;

  -- 4. Transactions & Positions
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  UPDATE transactions_v2 SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE transactions_v2 SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE transactions_v2 SET voided_by_profile_id = NULL WHERE voided_by_profile_id = p_investor_id;

  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM investor_position_snapshots WHERE investor_id = p_investor_id;

  -- investor_daily_balance (table may not exist)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_daily_balance') THEN
    DELETE FROM investor_daily_balance WHERE investor_id = p_investor_id;
  END IF;

  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  UPDATE withdrawal_requests SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE withdrawal_requests SET rejected_by = NULL WHERE rejected_by = p_investor_id;
  UPDATE withdrawal_requests SET cancelled_by = NULL WHERE cancelled_by = p_investor_id;
  UPDATE withdrawal_requests SET created_by = NULL WHERE created_by = p_investor_id;

  -- 5. Documents & Statements
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id OR generated_by = p_investor_id;
  DELETE FROM statements WHERE investor_id = p_investor_id OR investor_profile_id = p_investor_id;
  DELETE FROM documents WHERE user_profile_id = p_investor_id OR created_by_profile_id = p_investor_id;

  -- 6. Infrastructure & Config
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fund_daily_aum') THEN
    UPDATE fund_daily_aum SET created_by = NULL WHERE created_by = p_investor_id;
    UPDATE fund_daily_aum SET voided_by = NULL WHERE voided_by = p_investor_id;
    UPDATE fund_daily_aum SET voided_by_profile_id = NULL WHERE voided_by_profile_id = p_investor_id;
  END IF;

  UPDATE yield_distributions SET dust_receiver_id = NULL WHERE dust_receiver_id = p_investor_id;
  UPDATE yield_distributions SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE global_fee_settings SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE system_config SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE statement_periods SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE statement_periods SET finalized_by = NULL WHERE finalized_by = p_investor_id;

  -- 7. Identity & Access
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  DELETE FROM data_edit_audit WHERE edited_by = p_investor_id;
  DELETE FROM profiles WHERE id = p_investor_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
  VALUES (v_admin, 'FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text,
    jsonb_build_object('investor_name', v_name, 'v10_canonical_bypass', true));

  RETURN jsonb_build_object('success', true, 'deleted_investor', p_investor_id, 'name', v_name);
END;
$function$;


-- ============================================================
-- FIX 4: purge_fund_hard
-- Add IF EXISTS guards for investor_daily_balance and fund_asset_rebalancing
-- ============================================================
CREATE OR REPLACE FUNCTION public.purge_fund_hard(p_fund_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_fund_name text;
    v_admin uuid;
BEGIN
    v_admin := require_super_admin();

    SELECT name INTO v_fund_name FROM funds WHERE id = p_fund_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
    END IF;

    -- Exhaustive Purge Chain
    DELETE FROM yield_allocations WHERE fund_id = p_fund_id;
    DELETE FROM fee_allocations WHERE fund_id = p_fund_id;
    DELETE FROM ib_allocations WHERE fund_id = p_fund_id;
    DELETE FROM ib_commission_ledger WHERE fund_id = p_fund_id;
    DELETE FROM ib_commission_schedule WHERE fund_id = p_fund_id;
    DELETE FROM platform_fee_ledger WHERE fund_id = p_fund_id;
    DELETE FROM investor_fee_schedule WHERE fund_id = p_fund_id;
    DELETE FROM transactions_v2 WHERE fund_id = p_fund_id;
    DELETE FROM investor_positions WHERE fund_id = p_fund_id;
    DELETE FROM investor_fund_performance WHERE fund_id = p_fund_id;
    DELETE FROM investor_position_snapshots WHERE fund_id = p_fund_id;

    -- Guard dropped tables
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_daily_balance') THEN
      DELETE FROM investor_daily_balance WHERE fund_id = p_fund_id;
    END IF;

    DELETE FROM withdrawal_requests WHERE fund_id = p_fund_id;
    DELETE FROM fund_daily_aum WHERE fund_id = p_fund_id;

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fund_asset_rebalancing') THEN
      DELETE FROM fund_asset_rebalancing WHERE fund_id = p_fund_id;
    END IF;

    DELETE FROM yield_distributions WHERE fund_id = p_fund_id;
    DELETE FROM documents WHERE fund_id = p_fund_id;

    -- Finally delete the fund
    DELETE FROM funds WHERE id = p_fund_id;

    INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
    VALUES (v_admin, 'HARD_PURGE_FUND', 'funds', p_fund_id::text,
        jsonb_build_object('fund_name', v_fund_name, 'canonical_purge', true));

    RETURN jsonb_build_object('success', true, 'purged_fund', v_fund_name);
END;
$function$;


-- ============================================================
-- FIX 5: reset_platform_data
-- Add IF EXISTS guard for investor_daily_balance
-- ============================================================
CREATE OR REPLACE FUNCTION public.reset_platform_data(p_confirm text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_counts jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  IF p_confirm != 'RESET' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must pass p_confirm = ''RESET'' to execute. This will delete ALL transactional data.');
  END IF;

  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Disable user triggers to avoid cascade issues
  ALTER TABLE transactions_v2 DISABLE TRIGGER USER;
  ALTER TABLE investor_positions DISABLE TRIGGER USER;
  ALTER TABLE yield_distributions DISABLE TRIGGER USER;
  ALTER TABLE yield_allocations DISABLE TRIGGER USER;
  ALTER TABLE withdrawal_requests DISABLE TRIGGER USER;
  ALTER TABLE notifications DISABLE TRIGGER USER;
  ALTER TABLE audit_log DISABLE TRIGGER USER;

  -- Delete in FK-safe order (children first)

  -- Yield-related
  SELECT COUNT(*) INTO v_count FROM yield_allocations;
  DELETE FROM yield_allocations;
  v_counts := v_counts || jsonb_build_object('yield_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM fee_allocations;
  DELETE FROM fee_allocations;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM ib_allocations;
  DELETE FROM ib_allocations;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM ib_commission_ledger;
  DELETE FROM ib_commission_ledger;
  v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_count);

  SELECT COUNT(*) INTO v_count FROM platform_fee_ledger;
  DELETE FROM platform_fee_ledger;
  v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_count);

  -- Statements & documents
  DELETE FROM statement_email_delivery;
  DELETE FROM generated_statements;
  DELETE FROM statements;
  DELETE FROM statement_periods;
  DELETE FROM documents;

  -- Operational
  SELECT COUNT(*) INTO v_count FROM withdrawal_requests;
  DELETE FROM withdrawal_requests;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM notifications;
  DELETE FROM admin_alerts;
  DELETE FROM risk_alerts;
  DELETE FROM admin_integrity_runs;
  DELETE FROM data_edit_audit;

  -- Snapshots
  DELETE FROM investor_position_snapshots;

  -- Guard dropped table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_daily_balance') THEN
    DELETE FROM investor_daily_balance;
  END IF;

  DELETE FROM investor_fund_performance;
  DELETE FROM investor_emails;
  DELETE FROM fund_daily_aum;

  -- Core ledger (must clear distribution_id FK first)
  UPDATE transactions_v2 SET distribution_id = NULL WHERE distribution_id IS NOT NULL;

  SELECT COUNT(*) INTO v_count FROM yield_distributions;
  DELETE FROM yield_distributions;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  SELECT COUNT(*) INTO v_count FROM transactions_v2;
  DELETE FROM transactions_v2;
  v_counts := v_counts || jsonb_build_object('transactions', v_count);

  SELECT COUNT(*) INTO v_count FROM investor_positions;
  DELETE FROM investor_positions;
  v_counts := v_counts || jsonb_build_object('positions', v_count);

  -- Audit log (last, since triggers are disabled)
  SELECT COUNT(*) INTO v_count FROM audit_log;
  DELETE FROM audit_log;
  v_counts := v_counts || jsonb_build_object('audit_log', v_count);

  -- Re-enable triggers
  ALTER TABLE transactions_v2 ENABLE TRIGGER USER;
  ALTER TABLE investor_positions ENABLE TRIGGER USER;
  ALTER TABLE yield_distributions ENABLE TRIGGER USER;
  ALTER TABLE yield_allocations ENABLE TRIGGER USER;
  ALTER TABLE withdrawal_requests ENABLE TRIGGER USER;
  ALTER TABLE notifications ENABLE TRIGGER USER;
  ALTER TABLE audit_log ENABLE TRIGGER USER;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'All transactional data deleted. Funds, profiles, fee schedules, and IB schedules preserved.',
    'deleted', v_counts
  );
END;
$function$;
