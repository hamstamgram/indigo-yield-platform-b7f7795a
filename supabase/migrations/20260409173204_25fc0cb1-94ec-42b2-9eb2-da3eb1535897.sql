
-- ============================================================================
-- Migration: Fix crystallize_yield_before_flow + Expand run_integrity_pack
-- ============================================================================

-- PART 1: Remove dead investor_yield_events INSERT from crystallize_yield_before_flow
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
  v_last_checkpoint record;
  v_existing_preflow record;
  v_opening_aum numeric(38,18);
  v_yield_amount numeric(38,18);
  v_yield_pct numeric(38,18);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;

  v_validation_result jsonb;
  v_actual_position_sum numeric;

  v_total_gross_allocated numeric(38,18) := 0;
  v_total_fees_allocated numeric(38,18) := 0;
  v_total_net_allocated numeric(38,18) := 0;
  v_dust_amount numeric(38,18) := 0;
  v_dust_receiver_id uuid;

  v_total_adb numeric(38,18);
  v_investor_adb numeric(38,18);
  v_weight numeric(38,18);

  v_investor record;
  v_investor_yield numeric(38,18);
  v_investor_fee numeric(38,18);
  v_investor_net numeric(38,18);
  v_investor_share_pct numeric(38,18);
  v_fee_pct numeric(38,18);
  v_reference_id text;
  v_scale int := 18;

  v_fund_daily_aum_record record;
BEGIN
  if p_purpose is null then
    raise exception 'p_purpose parameter is required'
      using errcode = 'not_null_violation';
  end if;

  v_event_date := (p_event_ts at time zone 'UTC')::date;

  v_validation_result := validate_aum_against_positions_at_date(
    p_fund_id, p_closing_aum, v_event_date, 0.10, 'crystallize_yield_before_flow'
  );

  if not (v_validation_result->>'valid')::boolean then
    return jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'error_code', 'AUM_DEVIATION_ERROR',
      'message', v_validation_result->>'error',
      'validation', v_validation_result,
      'fund_id', p_fund_id,
      'entered_closing_aum', p_closing_aum
    );
  end if;

  select * into v_existing_preflow
  from get_existing_preflow_aum(p_fund_id, v_event_date, p_purpose);

  if v_existing_preflow.aum_event_id is not null then
    v_reused_preflow := true;
    v_snapshot_id := v_existing_preflow.aum_event_id;

    select total_aum, aum_date into v_fund_daily_aum_record
    from fund_daily_aum
    where fund_id = p_fund_id
      and aum_date <= v_event_date
      and purpose = 'transaction'
      and is_voided = false
    order by aum_date desc
    limit 1;

    if v_fund_daily_aum_record.total_aum is not null then
      v_opening_aum := v_fund_daily_aum_record.total_aum;
      v_period_start := v_fund_daily_aum_record.aum_date;
    else
      select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
      into v_last_checkpoint
      from fund_aum_events
      where fund_id = p_fund_id and is_voided = false and purpose = p_purpose
        and event_ts < v_existing_preflow.event_ts
      order by event_ts desc limit 1;

      if v_last_checkpoint.id is null then
        v_opening_aum := 0; v_period_start := v_event_date;
      else
        v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
      end if;
    end if;

    v_yield_amount := v_existing_preflow.closing_aum - v_opening_aum;
    if v_opening_aum > 0 then
      v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
    else
      v_yield_pct := 0;
    end if;

    return jsonb_build_object(
      'success', true, 'snapshot_id', v_snapshot_id, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', v_existing_preflow.closing_aum, 'fund_yield_pct', v_yield_pct,
      'gross_yield', v_yield_amount, 'reused_preflow', true,
      'calculation_method', 'adb_time_weighted', 'message', 'Reused existing preflow AUM',
      'validation', v_validation_result
    );
  end if;

  select total_aum, aum_date into v_fund_daily_aum_record
  from fund_daily_aum
  where fund_id = p_fund_id
    and aum_date <= v_event_date
    and purpose = 'transaction'
    and is_voided = false
  order by aum_date desc
  limit 1;

  if v_fund_daily_aum_record.total_aum is not null then
    v_opening_aum := v_fund_daily_aum_record.total_aum;
    v_period_start := v_fund_daily_aum_record.aum_date;
  else
    select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
    into v_last_checkpoint
    from fund_aum_events
    where fund_id = p_fund_id and is_voided = false and purpose = p_purpose and event_ts < p_event_ts
    order by event_ts desc limit 1;

    if v_last_checkpoint.id is null then
      select coalesce(sum(current_value), 0) into v_opening_aum
      from investor_positions
      where fund_id = p_fund_id and is_active = true;
      v_period_start := v_event_date;
    else
      v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
    end if;
  end if;

  v_yield_amount := p_closing_aum - v_opening_aum;
  v_days_in_period := v_event_date - v_period_start;

  if v_yield_amount <= 0 then
    return jsonb_build_object(
      'success', true, 'snapshot_id', null, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', p_closing_aum, 'fund_yield_pct', 0,
      'gross_yield', 0, 'reused_preflow', false,
      'calculation_method', 'no_yield', 'message', 'No yield to distribute'
    );
  end if;

  if v_opening_aum > 0 then
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
  else
    v_yield_pct := 0;
  end if;

  select coalesce(sum(current_value), 0) into v_total_adb
  from investor_positions
  where fund_id = p_fund_id and is_active = true and current_value > 0;

  if v_total_adb <= 0 then
    v_total_adb := p_closing_aum;
  end if;

  for v_investor in
    select ip.investor_id, ip.current_value
    from investor_positions ip
    where ip.fund_id = p_fund_id and ip.current_value > 0
    order by ip.current_value desc
  loop
    v_weight := v_investor.current_value / nullif(v_total_adb, 0);
    v_investor_share_pct := round(v_weight * 100, v_scale);
    v_investor_yield := round(v_yield_amount * v_weight, v_scale);

    if v_investor_yield > 0 then
      v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
      v_investor_fee := round(v_investor_yield * v_fee_pct / 100, v_scale);
    else
      v_fee_pct := 0; v_investor_fee := 0;
    end if;

    v_investor_net := v_investor_yield - v_investor_fee;
    v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
    v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
    v_total_net_allocated := v_total_net_allocated + v_investor_net;

    -- NOTE: investor_yield_events INSERT removed — table was dropped in V6.
    -- Yield data is already captured in yield_distributions and transactions_v2.

    v_investors_processed := v_investors_processed + 1;
  end loop;

  v_dust_amount := v_yield_amount - v_total_gross_allocated;

  insert into yield_distributions (
    fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
    gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
    period_start, period_end, dust_amount, dust_receiver_id, created_by,
    reference_id, calculation_method
  ) values (
    p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
    v_total_gross_allocated, v_total_net_allocated, v_total_fees_allocated, v_investors_processed,
    'yield_event', 'complete', v_period_start, v_event_date, v_dust_amount, null, p_admin_id,
    'CRYS:' || p_fund_id::text || ':' || v_event_date::text, 'current_value_weighted'
  ) returning id into v_distribution_id;

  return jsonb_build_object(
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

-- ============================================================================
-- PART 2: Expand run_integrity_pack from 5 to 13 checks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_integrity_pack(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL
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

  -- Check 2: Fund AUM mismatch
  FOR v_rec IN
    SELECT * FROM fund_aum_mismatch
    WHERE ABS(discrepancy) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'fund_aum_mismatch', 'severity', 'warning',
      'fund_id', v_rec.fund_id, 'fund_name', v_rec.fund_name, 'discrepancy', v_rec.discrepancy
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 3: Yield distribution conservation
  FOR v_rec IN
    SELECT * FROM yield_distribution_conservation_check
    WHERE ABS(COALESCE(conservation_gap, 0)) > 0.00000001
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'yield_conservation', 'severity', 'error',
      'distribution_id', v_rec.distribution_id, 'conservation_gap', v_rec.conservation_gap
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

  -- Check 6: Cost basis mismatch (position vs ledger drift)
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

  -- Check 7: Ledger vs position mismatches (current_value drift)
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
