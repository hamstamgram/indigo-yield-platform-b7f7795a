
-- Fix: crystallize_yield_before_flow needs set_canonical_rpc(true) before
-- inserting into yield_distributions, since the enforce_canonical_yield_mutation
-- trigger blocks all INSERT/UPDATE/DELETE without it.
--
-- The idempotency cleanup already sets it for the UPDATE (void), but then
-- turns it off. We need to turn it back on for the INSERT.

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

  select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
  into v_last_checkpoint
  from fund_aum_events
  where fund_id = p_fund_id and is_voided = false and purpose = p_purpose and event_ts < p_event_ts
  order by event_ts desc limit 1;

  if v_last_checkpoint.id is null then
    v_opening_aum := 0; v_period_start := v_event_date;
  else
    v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
  end if;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  if v_yield_amount < 0 then
    raise exception 'Gross yield amount cannot be negative (closing AUM % is less than opening AUM %)', p_closing_aum, v_opening_aum;
  end if;

  if v_opening_aum > 0 then
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
  else
    v_yield_pct := 0;
  end if;

  insert into fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) values (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  ) returning id into v_snapshot_id;

  if v_opening_aum > 0 and v_yield_amount > 0 then

    -- IDEMPOTENCY: Void orphaned yield artifacts from previous failed attempts
    -- Enable canonical RPC for the entire yield distribution block
    perform set_canonical_rpc(true);

    update investor_yield_events
    set is_voided = true, voided_at = now(), voided_by = p_admin_id
    where fund_id = p_fund_id and event_date = v_event_date and trigger_type = p_trigger_type
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

    select coalesce(sum(daily_balance), 0) into v_total_adb
    from (
      select d::date as balance_date,
             coalesce(
               (select sum(end_of_day_balance) from investor_daily_balance idb
                where idb.fund_id = p_fund_id and idb.balance_date = d::date),
               (select coalesce(sum(t.amount), 0) from transactions_v2 t
                where t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
             ) as daily_balance
      from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
    ) daily_balances;

    if v_total_adb = 0 or v_total_adb is null then
      v_total_adb := v_opening_aum;
    end if;

    select ip.investor_id into v_dust_receiver_id
    from investor_positions ip
    where ip.fund_id = p_fund_id and ip.current_value > 0
    order by ip.current_value desc limit 1;

    insert into fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) values (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    for v_investor in
      select ip.investor_id, ip.current_value, row_number() over (order by ip.current_value desc) as rank
      from investor_positions ip
      where ip.fund_id = p_fund_id and ip.current_value > 0
    loop
      select coalesce(sum(daily_balance), 0) into v_investor_adb
      from (
        select d::date as balance_date,
               coalesce(
                 (select end_of_day_balance from investor_daily_balance idb
                  where idb.investor_id = v_investor.investor_id and idb.fund_id = p_fund_id and idb.balance_date = d::date),
                 (select coalesce(sum(t.amount), 0) from transactions_v2 t
                  where t.investor_id = v_investor.investor_id and t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
               ) as daily_balance
        from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
      ) daily_balances;

      if v_investor_adb = 0 or v_investor_adb is null then
        v_investor_adb := v_investor.current_value;
        v_weight := v_investor.current_value / v_opening_aum;
      else
        v_weight := v_investor_adb / nullif(v_total_adb, 0);
      end if;

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

    -- INSERT into yield_distributions (canonical RPC already enabled above)
    insert into yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id, calculation_method
    ) values (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, p_trigger_type, 'completed',
      v_period_start, v_event_date, v_dust_amount, v_dust_receiver_id, p_admin_id,
      'DIST-' || p_fund_id::text || '-' || v_event_date::text,
      'adb_time_weighted'
    ) returning id into v_distribution_id;

    if abs(v_dust_amount) > 0.0001 and v_dust_receiver_id is not null then
      update investor_yield_events
      set gross_yield_amount = gross_yield_amount + v_dust_amount,
          net_yield_amount = net_yield_amount + v_dust_amount
      where investor_id = v_dust_receiver_id and fund_id = p_fund_id and event_date = v_event_date
        and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
      v_total_gross_allocated := v_total_gross_allocated + v_dust_amount;
      v_total_net_allocated := v_total_net_allocated + v_dust_amount;
    end if;

    -- Disable canonical RPC after all yield_distributions operations
    perform set_canonical_rpc(false);

  end if;

  return jsonb_build_object(
    'success', true, 'snapshot_id', v_snapshot_id, 'distribution_id', v_distribution_id,
    'fund_id', p_fund_id, 'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
    'period_start', v_period_start, 'opening_aum', v_opening_aum, 'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct, 'gross_yield', v_yield_amount,
    'investors_processed', v_investors_processed,
    'total_gross_allocated', v_total_gross_allocated,
    'total_fees_allocated', v_total_fees_allocated,
    'total_net_allocated', v_total_net_allocated,
    'dust_amount', v_dust_amount, 'dust_receiver_id', v_dust_receiver_id,
    'reused_preflow', false, 'calculation_method', 'adb_time_weighted',
    'total_adb', v_total_adb, 'zero_yield_skipped', v_yield_amount = 0,
    'validation', v_validation_result,
    'conservation_check', jsonb_build_object(
      'gross_matches', abs(coalesce(v_yield_amount, 0) - coalesce(v_total_gross_allocated, 0)) < 0.0001,
      'fee_identity_holds', abs(coalesce(v_total_gross_allocated, 0) - coalesce(v_total_net_allocated, 0) - coalesce(v_total_fees_allocated, 0)) < 0.0001
    ),
    'idempotency_cleanup', jsonb_build_object(
      'orphaned_yield_events_voided', coalesce(v_orphaned_yield_events, 0),
      'orphaned_snapshots_voided', coalesce(v_orphaned_snapshots, 0),
      'orphaned_distributions_voided', coalesce(v_orphaned_distributions, 0)
    )
  );
end;
$function$;
;
