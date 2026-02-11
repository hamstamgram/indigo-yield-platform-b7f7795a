-- Fix crystallize_yield_before_flow: two bugs
-- 1. aum_date < v_event_date (strict less-than) skips same-day fund_daily_aum records,
--    reading stale opening AUM from days/weeks ago. Change to <=.
-- 2. Negative yield (closing AUM < opening AUM) throws a hard exception, blocking deposits
--    when the fund has lost value. Should treat as 0 yield (no distribution needed).

CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamptz,
  p_admin_id uuid,
  p_purpose public.aum_purpose DEFAULT 'transaction'::public.aum_purpose
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $_$
declare
  v_last_checkpoint record;
  v_existing_preflow record;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;

  v_validation_result jsonb;
  v_actual_position_sum numeric;

  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;
  v_dust_receiver_id uuid;

  v_total_adb numeric(28,10);
  v_investor_adb numeric(28,10);
  v_weight numeric(28,10);

  v_investor record;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share_pct numeric(18,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
  v_scale int := 10;

  v_orphaned_yield_events int;
  v_orphaned_snapshots int;
  v_orphaned_distributions int;

  v_fund_daily_aum_record record;
begin
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

    -- FIX 1: Use <= instead of < to include same-day fund_daily_aum records
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

  -- FIX 1: Use <= instead of < to include same-day fund_daily_aum records
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
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    end if;
  end if;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  -- FIX 2: Treat negative yield as zero instead of blocking the deposit.
  -- When fund value drops, there's no yield to distribute, but deposits must still work.
  if v_yield_amount < 0 then
    v_yield_amount := 0;
  end if;

  if v_opening_aum > 0 then
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
  else
    v_yield_pct := 0;
  end if;

  perform set_canonical_rpc(true);

  insert into fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) values (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  ) returning id into v_snapshot_id;

  if v_opening_aum > 0 and v_yield_amount > 0 then

    update investor_yield_events
    set is_voided = true, voided_at = now(), voided_by = p_admin_id
    where fund_id = p_fund_id and event_date = v_event_date
      and is_voided = false
      and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
    get diagnostics v_orphaned_yield_events = row_count;

    delete from fund_yield_snapshots
    where fund_id = p_fund_id and snapshot_date = v_event_date and trigger_type = p_trigger_type;
    get diagnostics v_orphaned_snapshots = row_count;

    update yield_distributions
    set is_voided = true, voided_at = now(), voided_by = p_admin_id,
        void_reason = 'Orphaned from failed flow retry - voided for idempotency'
    where fund_id = p_fund_id and effective_date = v_event_date and purpose = p_purpose
      and distribution_type = p_trigger_type and is_voided = false;
    get diagnostics v_orphaned_distributions = row_count;

    if v_orphaned_yield_events > 0 or v_orphaned_snapshots > 0 or v_orphaned_distributions > 0 then
      raise notice 'Idempotency cleanup: voided % yield events, % snapshots, % distributions for fund % on %',
        v_orphaned_yield_events, v_orphaned_snapshots, v_orphaned_distributions, p_fund_id, v_event_date;
    end if;

    insert into fund_yield_snapshots (
      fund_id, snapshot_date, trigger_type, aum_event_id,
      opening_aum, closing_aum, yield_amount, yield_pct,
      days_in_period, purpose
    ) values (
      p_fund_id, v_event_date, p_trigger_type, v_snapshot_id,
      v_opening_aum, p_closing_aum, v_yield_amount, v_yield_pct,
      v_days_in_period, p_purpose
    );

    insert into yield_distributions (
      fund_id, effective_date, period_start, period_end,
      gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount,
      purpose, distribution_type, aum_snapshot_id, status
    ) values (
      p_fund_id, v_event_date, v_period_start, v_event_date,
      v_yield_amount, 0, 0, 0,
      p_purpose, p_trigger_type, v_snapshot_id, 'applied'
    ) returning id into v_distribution_id;

    -- ADB: amounts are already signed (negative for WITHDRAWAL/FEE), so use directly
    select coalesce(sum(
      t.amount * (v_event_date - t.tx_date)
    ), 0) into v_total_adb
    from transactions_v2 t
    where t.fund_id = p_fund_id
      and t.purpose = p_purpose
      and t.is_voided = false
      and t.tx_date between v_period_start and v_event_date;

    for v_investor in
      select ip.investor_id, ip.current_value
      from investor_positions ip
      where ip.fund_id = p_fund_id and ip.is_active = true and ip.current_value > 0
    loop
      select coalesce(sum(
        t.amount * (v_event_date - t.tx_date)
      ), 0) into v_investor_adb
      from transactions_v2 t
      where t.fund_id = p_fund_id
        and t.investor_id = v_investor.investor_id
        and t.purpose = p_purpose
        and t.is_voided = false
        and t.tx_date between v_period_start and v_event_date;

      if v_total_adb > 0 then
        v_weight := v_investor_adb / v_total_adb;
      else
        v_weight := 0;
      end if;

      v_investor_yield := round(v_yield_amount * v_weight, v_scale);
      v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
      v_investor_fee := round(v_investor_yield * (v_fee_pct / 100.0), v_scale);
      v_investor_net := v_investor_yield - v_investor_fee;
      v_investor_share_pct := case when v_opening_aum > 0 then round((v_investor.current_value / v_opening_aum) * 100, v_scale) else 0 end;

      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      insert into investor_yield_events (
        fund_id, investor_id, event_date, trigger_type, distribution_id,
        gross_yield, fee_amount, net_yield, fee_pct,
        opening_balance, adb_weight, share_pct,
        reference_id, visibility_scope
      ) values (
        p_fund_id, v_investor.investor_id, v_event_date, p_trigger_type, v_distribution_id,
        v_investor_yield, v_investor_fee, v_investor_net, v_fee_pct,
        v_investor.current_value, v_weight, v_investor_share_pct,
        v_reference_id, 'admin_only'
      );

      v_investors_processed := v_investors_processed + 1;
    end loop;

    v_dust_amount := v_yield_amount - v_total_gross_allocated;

    update yield_distributions set
      total_net_amount = v_total_net_allocated,
      total_fee_amount = v_total_fees_allocated,
      dust_amount = v_dust_amount
    where id = v_distribution_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_id', p_fund_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'days_in_period', v_days_in_period,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct,
    'gross_yield', v_yield_amount,
    'total_fees', v_total_fees_allocated,
    'total_net', v_total_net_allocated,
    'dust_amount', v_dust_amount,
    'investors_affected', v_investors_processed,
    'distribution_id', v_distribution_id,
    'reused_preflow', v_reused_preflow,
    'calculation_method', 'adb_time_weighted',
    'validation', v_validation_result
  );
END;
$_$;
