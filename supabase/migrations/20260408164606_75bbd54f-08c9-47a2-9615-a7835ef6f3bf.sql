
-- 1. backfill_balance_chain_fix: numeric(28,10) → numeric(38,18)
CREATE OR REPLACE FUNCTION public.backfill_balance_chain_fix(p_investor_id uuid, p_fund_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_running_balance NUMERIC(38,18) := 0;
  v_expected_after NUMERIC(38,18);
  v_transactions_updated INTEGER := 0;
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  FOR r IN (
    SELECT id, type::text as tx_type, amount, balance_before, balance_after, tx_date, created_at
    FROM transactions_v2
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false
    ORDER BY tx_date ASC, created_at ASC
  ) LOOP
    IF r.tx_type = ANY(v_negative_types) THEN
      v_expected_after := v_running_balance - ABS(r.amount);
    ELSE
      v_expected_after := v_running_balance + r.amount;
    END IF;
    
    IF r.balance_before IS DISTINCT FROM v_running_balance OR r.balance_after IS DISTINCT FROM v_expected_after THEN
      UPDATE transactions_v2 SET balance_before = v_running_balance, balance_after = v_expected_after WHERE id = r.id;
      v_transactions_updated := v_transactions_updated + 1;
    END IF;
    
    v_running_balance := v_expected_after;
  END LOOP;
  
  RETURN jsonb_build_object(
    'investor_id', p_investor_id, 
    'fund_id', p_fund_id, 
    'transactions_updated', v_transactions_updated, 
    'final_balance', v_running_balance
  );
END;
$function$;

-- 2. calculate_position_at_date_fix: numeric(28,10) → numeric(38,18)
CREATE OR REPLACE FUNCTION public.calculate_position_at_date_fix(p_investor_id uuid, p_fund_id uuid, p_as_of_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position_value NUMERIC(38,18);
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  SELECT COALESCE(SUM(CASE WHEN type::text = ANY(v_negative_types) THEN -ABS(amount) ELSE amount END), 0)
    INTO v_position_value
    FROM transactions_v2
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false AND tx_date <= p_as_of_date;
  RETURN v_position_value;
END;
$function$;

-- 3. crystallize_yield_before_flow: ALL numeric(28,10) and numeric(18,10) → numeric(38,18)
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(p_fund_id uuid, p_closing_aum numeric, p_trigger_type text, p_trigger_reference text, p_event_ts timestamp with time zone, p_admin_id uuid, p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose)
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

  v_orphaned_yield_events int;
  v_orphaned_snapshots int;
  v_orphaned_distributions int;

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

    v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

    insert into investor_yield_events (
      investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
      fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
    ) values (
      v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
      case when p_trigger_reference ~ '^[0-9a-f-]{36}$' then p_trigger_reference::uuid else null end,
      v_opening_aum, p_closing_aum, v_investor.current_value,
      v_investor_share_pct, v_yield_pct, v_investor_yield,
      v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
      v_days_in_period, 'admin_only', v_reference_id, p_admin_id
    );

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
    CASE WHEN p_trigger_type = 'month_end' THEN 'daily' ELSE p_trigger_type END, 'applied'::yield_distribution_status, v_period_start, v_event_date, v_dust_amount, null, p_admin_id,
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

-- 4. validate_pre_yield_aum: numeric(28,10) → numeric(38,18)
CREATE OR REPLACE FUNCTION public.validate_pre_yield_aum(p_fund_id uuid, p_tolerance_percentage numeric DEFAULT 1.0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_reconciliation JSONB;
  v_recorded_aum NUMERIC(38,18);
  v_calculated_aum NUMERIC(38,18);
  v_discrepancy_pct NUMERIC(38,18);
  v_is_valid BOOLEAN;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  SELECT check_aum_reconciliation(p_fund_id, 0.01) INTO v_reconciliation;

  v_recorded_aum := (v_reconciliation->>'recorded_aum')::NUMERIC;
  v_calculated_aum := (v_reconciliation->>'calculated_aum')::NUMERIC;

  IF v_calculated_aum > 0 THEN
    v_discrepancy_pct := ABS(v_recorded_aum - v_calculated_aum) / v_calculated_aum * 100;
  ELSIF v_recorded_aum > 0 THEN
    v_discrepancy_pct := 100;
  ELSE
    v_discrepancy_pct := 0;
  END IF;

  v_is_valid := TRUE;

  IF v_calculated_aum <= 0 THEN
    v_errors := array_append(v_errors,
      format('Cannot apply yield: Calculated AUM is %s. Ensure positions are populated.', v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  IF v_discrepancy_pct > p_tolerance_percentage THEN
    v_errors := array_append(v_errors,
      format('AUM discrepancy of %s%% exceeds tolerance of %s%%. Recorded: %s, Calculated: %s. Run reconciliation first.',
             ROUND(v_discrepancy_pct, 2), ROUND(p_tolerance_percentage, 2), v_recorded_aum, v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value = 0
      AND EXISTS (
        SELECT 1
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
          AND t.type IN ('DEPOSIT', 'YIELD', 'INTEREST')
      )
  ) THEN
    v_warnings := array_append(v_warnings,
      'Some positions have zero value but non-voided inflow transactions. Consider reconciliation.');
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy_percentage', v_discrepancy_pct,
    'tolerance_percentage', p_tolerance_percentage,
    'errors', v_errors,
    'warnings', v_warnings,
    'checked_at', now()
  );
END;
$function$;
