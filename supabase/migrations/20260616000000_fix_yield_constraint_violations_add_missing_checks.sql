-- =============================================================================
-- FIX: yield_distributions constraint violations + missing CHECK constraints
-- =============================================================================
--
-- ROOT CAUSE: "Failed to apply yield: new row for relation yield_distributions
--   violates check constraint chk_correction_has_parent"
--
-- The constraint: distribution_type IN ('original','daily','deposit','withdrawal','transaction')
--   OR parent_distribution_id IS NOT NULL
--
-- Three categories of fix:
--   1. Fix distribution_type values that violate the 6-value enum and 2 parent/reason constraints
--   2. Fix status value 'completed' not in yield_distribution_status enum
--   3. Recreate missing apply_yield_correction_v2 (referenced but doesn't exist)
--   4. Add missing CHECK constraints from frontend contracts
-- =============================================================================

-- =============================================================================
-- PART 1: Fix apply_segmented_yield_distribution_v5 — month_end → daily
-- =============================================================================
-- The function uses: CASE WHEN p_purpose = 'reporting' THEN 'month_end' ELSE p_purpose::text END
-- 'month_end' violates ALL 3 constraints:
--   - yield_distributions_distribution_type_check (not in 6-value enum)
--   - chk_correction_has_parent (not in whitelist, parent_distribution_id IS NULL)
--   - chk_correction_has_reason (not in whitelist, reason IS NULL)
-- Fix: use 'daily' + rely on is_month_end boolean for discrimination

CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_date date DEFAULT NULL,
  p_opening_aum numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_pre_day_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_tx_result json;
  v_yield_tx_id uuid;
  v_fee_tx_result json;
  v_fee_tx_id uuid;
  v_ib_tx_result json;
  v_ib_tx_id uuid;
  v_final_positions_sum numeric;
  v_updated_rows int;
  v_dist_type text;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = v_period_end
        AND purpose = 'reporting' AND is_voided = false
        AND consolidated_into_id IS NULL
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    ) THEN
      RAISE EXCEPTION 'Reporting yield already exists for fund % period ending %. Void before reapplying.',
        p_fund_id, v_period_end;
    END IF;
  END IF;

  v_fees_account_id := get_fees_account_for_fund(p_fund_id);
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_dist_type := 'daily';

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count,
    distribution_type
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v7', p_purpose, v_is_month_end, 0,
    v_dist_type
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    pre_day_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  INSERT INTO _vflat_alloc (investor_id, investor_name, investor_email, account_type, ib_parent_id, current_value, pre_day_value)
  SELECT ip.investor_id,
         COALESCE(p.first_name || ' ' || p.last_name, 'Unknown'),
         COALESCE(p.email, ''),
         p.account_type::text,
         p.ib_parent_id,
         ip.current_value,
         ip.current_value - COALESCE((
           SELECT SUM(t.amount)
           FROM transactions_v2 t
           WHERE t.investor_id = ip.investor_id
             AND t.fund_id = p_fund_id
             AND t.tx_date = v_tx_date
             AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
             AND (t.is_voided IS NULL OR t.is_voided = false)
         ), 0)
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND (
      (ip.is_active = true AND ip.current_value <> 0)
      OR EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id AND t.fund_id = p_fund_id
          AND t.tx_date = v_tx_date AND t.type = 'WITHDRAWAL'
          AND (t.is_voided IS NULL OR t.is_voided = false)
      )
    );

  SELECT COALESCE(SUM(pre_day_value), 0) INTO v_pre_day_aum FROM _vflat_alloc
  WHERE pre_day_value > 0;

  IF p_opening_aum IS NOT NULL AND p_opening_aum > 0 THEN
    v_total_month_yield := p_recorded_aum - p_opening_aum;
  ELSE
    v_total_month_yield := p_recorded_aum - v_opening_aum;
  END IF;
  v_is_negative_yield := (v_total_month_yield < 0);

  IF v_pre_day_aum > 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      IF v_alloc.pre_day_value <= 0 THEN
        v_share := 0;
        v_gross := 0;
      ELSE
        v_share := v_alloc.pre_day_value / v_pre_day_aum;
        v_gross := v_total_month_yield * v_share;
      END IF;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield OR v_gross <= 0 THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  ELSIF v_opening_aum <> 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      v_share := v_alloc.current_value / v_opening_aum;
      v_gross := v_total_month_yield * v_share;

      IF v_alloc.account_type = 'fees_account' THEN
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        v_fee_pct := COALESCE(get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        IF v_alloc.ib_parent_id IS NOT NULL THEN
          v_ib_rate := COALESCE(get_investor_ib_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        ELSE
          v_ib_rate := 0;
        END IF;
      END IF;

      IF v_is_negative_yield THEN
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
      ELSE
        v_fee := v_gross * v_fee_pct / 100;
        v_ib := v_gross * v_ib_rate / 100;
        v_net := v_gross - v_fee - v_ib;
      END IF;

      UPDATE _vflat_alloc SET
        gross = v_gross,
        fee_pct = v_fee_pct,
        fee = v_fee,
        ib_rate = v_ib_rate,
        ib = v_ib,
        net = v_net
      WHERE investor_id = v_alloc.investor_id;
    END LOOP;
  END IF;

  v_total_gross := (SELECT COALESCE(SUM(gross), 0) FROM _vflat_alloc);
  v_total_net := (SELECT COALESCE(SUM(net), 0) FROM _vflat_alloc);
  v_total_fees := (SELECT COALESCE(SUM(fee), 0) FROM _vflat_alloc);
  v_total_ib := (SELECT COALESCE(SUM(ib), 0) FROM _vflat_alloc);
  v_residual := v_total_month_yield - v_total_gross;

  SELECT COALESCE(gross, 0), COALESCE(net, 0)
  INTO v_fees_account_gross, v_fees_account_net
  FROM _vflat_alloc WHERE investor_id = v_fees_account_id;

  v_allocation_count := 0;

  FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
    IF v_alloc.gross = 0 AND v_alloc.fee = 0 AND v_alloc.ib = 0 AND v_alloc.net = 0 THEN
      CONTINUE;
    END IF;

    v_allocation_count := v_allocation_count + 1;

    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_alloc.investor_id,
      p_tx_type := 'YIELD'::tx_type,
      p_amount := v_alloc.net,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield-' || v_distribution_id || '-' || v_alloc.investor_id,
      p_admin_id := v_admin,
      p_notes := 'Yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    v_yield_tx_id := (v_tx_result->>'transaction_id')::uuid;

    IF v_alloc.account_type = 'fees_account' THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id,
      gross_amount, net_amount, fee_amount, ib_amount,
      fee_pct, ib_pct, position_value_at_calc,
      ownership_pct, transaction_id
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      v_alloc.fee_pct, v_alloc.ib_rate, v_alloc.pre_day_value,
      CASE WHEN v_pre_day_aum > 0 THEN v_alloc.pre_day_value / v_pre_day_aum * 100
           WHEN v_opening_aum <> 0 THEN v_alloc.current_value / v_opening_aum * 100
           ELSE 0 END,
      v_yield_tx_id
    );

    IF v_alloc.fee > 0 AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_fees_account_id,
        p_tx_type := 'FEE_CREDIT'::tx_type,
        p_amount := v_alloc.fee,
        p_tx_date := v_tx_date,
        p_reference_id := 'fee_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'Fee from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_fee_tx_result;

      v_fee_tx_id := (v_fee_tx_result->>'transaction_id')::uuid;

      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fees_account_id,
        fee_amount, fee_percentage, base_net_income,
        period_start, period_end, purpose, created_by,
        credit_transaction_id
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id, v_fees_account_id,
        v_alloc.fee, v_alloc.fee_pct, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin,
        v_fee_tx_id
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_alloc.ib_parent_id,
        p_tx_type := 'IB_CREDIT'::tx_type,
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'IB commission from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_ib_tx_result;

      v_ib_tx_id := (v_ib_tx_result->>'transaction_id')::uuid;

      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_ib_tx_id;

      INSERT INTO ib_allocations (
        distribution_id, ib_investor_id, source_investor_id, fund_id,
        ib_fee_amount, ib_percentage, source_net_income,
        period_start, period_end, purpose, created_by, effective_date
      ) VALUES (
        v_distribution_id, v_alloc.ib_parent_id, v_alloc.investor_id, p_fund_id,
        v_alloc.ib, v_alloc.ib_rate, v_alloc.gross,
        v_period_start, v_period_end, p_purpose, v_admin, v_tx_date
      );

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, ib_id,
        gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, transaction_id, created_by, asset,
        source_investor_name, ib_name
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id, v_alloc.ib_parent_id,
        v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
        v_tx_date, v_ib_tx_id, v_admin, v_fund.asset,
        v_alloc.investor_name,
        (SELECT COALESCE(first_name || ' ' || last_name, 'Unknown') FROM profiles WHERE id = v_alloc.ib_parent_id)
      );
    END IF;
  END LOOP;

  IF v_residual <> 0 AND v_fees_account_id IS NOT NULL THEN
    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_fees_account_id,
      p_tx_type := 'DUST'::tx_type,
      p_amount := v_residual,
      p_tx_date := v_tx_date,
      p_reference_id := 'dust-' || v_distribution_id,
      p_admin_id := v_admin,
      p_notes := 'Dust from yield distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;

    UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
    WHERE id = (v_tx_result->>'transaction_id')::uuid;
  END IF;

  UPDATE yield_distributions SET
    gross_yield = v_total_gross,
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    opening_aum = v_pre_day_aum,
    summary_json = jsonb_build_object(
      'version', 'flat_v7',
      'opening_aum', v_opening_aum,
      'pre_day_aum', v_pre_day_aum,
      'is_negative_yield', v_is_negative_yield,
      'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
    )
  WHERE id = v_distribution_id;

  PERFORM check_aum_reconciliation(p_fund_id, 0.01, p_period_end);

  UPDATE fund_daily_aum
  SET total_aum = p_recorded_aum,
      source = 'yield_distribution_v5',
      is_month_end = v_is_month_end,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'period_start', v_period_start::text,
    'period_end', v_period_end::text,
    'opening_aum', v_opening_aum,
    'pre_day_aum', v_pre_day_aum,
    'recorded_aum', p_recorded_aum,
    'total_yield', v_total_month_yield,
    'gross', v_total_gross,
    'net', v_total_net,
    'fees', v_total_fees,
    'ib', v_total_ib,
    'dust', COALESCE(v_residual, 0),
    'allocations', v_allocation_count,
    'same_day_deposits_excluded', v_opening_aum - v_pre_day_aum
  );
END;
$fn$;

DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date, numeric) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date, numeric) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- =============================================================================
-- PART 2: Fix crystallize_yield_before_flow — p_trigger_type + status
-- =============================================================================
-- Two violations:
--   a) distribution_type = p_trigger_type → 'month_end' from crystallize_month_end
--   b) status = 'completed' → not in yield_distribution_status enum
-- Fix: map 'month_end' → 'daily', change 'completed' → 'applied'

CREATE OR REPLACE FUNCTION "public"."crystallize_yield_before_flow"(
  "p_fund_id" "uuid",
  "p_closing_aum" numeric,
  "p_trigger_type" "text",
  "p_trigger_reference" "text",
  "p_event_ts" timestamp with time zone,
  "p_admin_id" "uuid",
  "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose"
) RETURNS "jsonb"
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
  v_effective_dist_type text;
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
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    end if;
  end if;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

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

    v_effective_dist_type := CASE WHEN p_trigger_type = 'month_end' THEN 'daily' ELSE p_trigger_type END;

    insert into yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id, calculation_method
    ) values (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, v_effective_dist_type, 'applied'::yield_distribution_status,
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
    'aum_source', case when v_fund_daily_aum_record.total_aum is not null then 'fund_daily_aum' else 'fund_aum_events_fallback' end,
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
$_$;


-- =============================================================================
-- PART 3: Recreate apply_yield_correction_v2
-- =============================================================================
-- Referenced by trg_enforce_canonical_yield trigger but doesn't exist in production.
-- Sets distribution_type = 'correction' with REQUIRED parent_distribution_id and reason.

CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_reason text,
  p_new_aum numeric,
  p_admin_id uuid,
  p_parent_distribution_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_parent RECORD;
  v_distribution_id uuid;
  v_opening_aum numeric;
  v_yield_diff numeric;
  v_lock_key bigint;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for yield correction';
  END IF;

  IF p_parent_distribution_id IS NULL THEN
    RAISE EXCEPTION 'parent_distribution_id is required for yield corrections';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  SELECT * INTO v_parent FROM yield_distributions WHERE id = p_parent_distribution_id AND fund_id = p_fund_id;
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Parent distribution % not found for fund %', p_parent_distribution_id, p_fund_id;
  END IF;

  v_lock_key := ('x' || substr(md5('correction:' || p_fund_id::text || p_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  PERFORM set_canonical_rpc(true);

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_yield_diff := p_new_aum - v_opening_aum;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    status, created_by, calculation_method, purpose, is_month_end,
    distribution_type, parent_distribution_id, reason
  ) VALUES (
    p_fund_id, p_period_end, p_period_end, p_period_start, p_period_end,
    p_new_aum, v_opening_aum, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'correction_v2', v_parent.purpose, v_parent.is_month_end,
    'correction', p_parent_distribution_id, p_reason
  ) RETURNING id INTO v_distribution_id;

  UPDATE yield_distributions SET
    gross_yield_amount = v_yield_diff,
    gross_yield = v_yield_diff,
    total_net_amount = v_yield_diff,
    net_yield = v_yield_diff
  WHERE id = v_distribution_id;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'parent_distribution_id', p_parent_distribution_id,
    'fund_id', p_fund_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'correction_aum', p_new_aum,
    'yield_diff', v_yield_diff,
    'reason', p_reason
  );
END;
$$;

DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_yield_correction_v2(uuid, date, date, text, numeric, uuid, uuid) TO authenticated; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN GRANT EXECUTE ON FUNCTION public.apply_yield_correction_v2(uuid, date, date, text, numeric, uuid, uuid) TO service_role; EXCEPTION WHEN OTHERS THEN NULL; END $$;

COMMENT ON FUNCTION public.apply_yield_correction_v2(uuid, date, date, text, numeric, uuid, uuid) IS
'CANONICAL: Applies a yield correction for a fund. Requires parent_distribution_id and reason. Sets distribution_type = correction. Called by: admin yield correction flow.';


-- =============================================================================
-- PART 4: Add missing CHECK constraints
-- =============================================================================

-- 4a. funds.fund_class
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funds_fund_class_check'
      AND conrelid = 'public.funds'::regclass
  ) THEN
    ALTER TABLE funds ADD CONSTRAINT funds_fund_class_check
      CHECK (fund_class = ANY(ARRAY['USDT','USDC','EURC','BTC','ETH','SOL','XRP','xAUT']));
    RAISE NOTICE 'Added funds_fund_class_check';
  ELSE
    RAISE NOTICE 'funds_fund_class_check already exists';
  END IF;
END $$;

-- 4b. profiles.kyc_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_kyc_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_kyc_status_check
      CHECK (kyc_status IS NULL OR kyc_status = ANY(ARRAY['pending','approved','verified','rejected']));
    RAISE NOTICE 'Added profiles_kyc_status_check';
  ELSE
    RAISE NOTICE 'profiles_kyc_status_check already exists';
  END IF;
END $$;

-- 4c. platform_invites.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_invites_status_check'
      AND conrelid = 'public.platform_invites'::regclass
  ) THEN
    ALTER TABLE platform_invites ADD CONSTRAINT platform_invites_status_check
      CHECK (status = ANY(ARRAY['pending','used','expired','revoked']));
    RAISE NOTICE 'Added platform_invites_status_check';
  ELSE
    RAISE NOTICE 'platform_invites_status_check already exists';
  END IF;
END $$;

-- 4d. yield_distributions.status — enforce yield_distribution_status enum values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'yield_distributions_status_check'
      AND conrelid = 'public.yield_distributions'::regclass
  ) THEN
    ALTER TABLE yield_distributions ADD CONSTRAINT yield_distributions_status_check
      CHECK (status = ANY(ARRAY['draft','applied','voided','previewed','corrected','rolled_back']));
    RAISE NOTICE 'Added yield_distributions_status_check';
  ELSE
    RAISE NOTICE 'yield_distributions_status_check already exists';
  END IF;
END $$;

-- 4e. fund_aum_events.trigger_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fund_aum_events_trigger_type_check'
      AND conrelid = 'public.fund_aum_events'::regclass
  ) THEN
    ALTER TABLE fund_aum_events ADD CONSTRAINT fund_aum_events_trigger_type_check
      CHECK (trigger_type = ANY(ARRAY['manual','deposit','withdrawal','yield','transaction','void','system','preflow','recompute','correction','month_end']));
    RAISE NOTICE 'Added fund_aum_events_trigger_type_check';
  ELSE
    RAISE NOTICE 'fund_aum_events_trigger_type_check already exists';
  END IF;
END $$;

-- 4f. fund_yield_snapshots.trigger_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fund_yield_snapshots_trigger_type_check'
      AND conrelid = 'public.fund_yield_snapshots'::regclass
  ) THEN
    ALTER TABLE fund_yield_snapshots ADD CONSTRAINT fund_yield_snapshots_trigger_type_check
      CHECK (trigger_type = ANY(ARRAY['deposit','withdrawal','month_end','manual','transaction']));
    RAISE NOTICE 'Added fund_yield_snapshots_trigger_type_check';
  ELSE
    RAISE NOTICE 'fund_yield_snapshots_trigger_type_check already exists';
  END IF;
END $$;

-- 4g. investor_position_snapshots.snapshot_source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'investor_position_snapshots_snapshot_source_check'
      AND conrelid = 'public.investor_position_snapshots'::regclass
  ) THEN
    ALTER TABLE investor_position_snapshots ADD CONSTRAINT investor_position_snapshots_snapshot_source_check
      CHECK (snapshot_source IS NULL OR snapshot_source = ANY(ARRAY['daily_job','yield','deposit','withdrawal','void','manual']));
    RAISE NOTICE 'Added investor_position_snapshots_snapshot_source_check';
  ELSE
    RAISE NOTICE 'investor_position_snapshots_snapshot_source_check already exists';
  END IF;
END $$;

-- 4h. Fix withdrawal_requests.fund_class — add missing XRP, xAUT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'withdrawal_requests_fund_class_check'
      AND conrelid = 'public.withdrawal_requests'::regclass
  ) THEN
    ALTER TABLE withdrawal_requests DROP CONSTRAINT withdrawal_requests_fund_class_check;
    ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_fund_class_check
      CHECK (fund_class = ANY(ARRAY['USDT','USDC','EURC','BTC','ETH','SOL','XRP','xAUT']));
    RAISE NOTICE 'Updated withdrawal_requests_fund_class_check to include XRP, xAUT';
  ELSE
    ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_requests_fund_class_check
      CHECK (fund_class = ANY(ARRAY['USDT','USDC','EURC','BTC','ETH','SOL','XRP','xAUT']));
    RAISE NOTICE 'Added withdrawal_requests_fund_class_check with XRP, xAUT';
  END IF;
END $$;


-- =============================================================================
-- PART 5: Update canonical trigger message to reflect actual functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_canonical_yield_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on yield_distributions is blocked. Use canonical RPC functions: apply_daily_yield_to_fund_v3 (or apply_segmented_yield_distribution_v5), void_yield_distribution, or apply_yield_correction_v2.', TG_OP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: DELETE on yield_distributions is permanently blocked. Use void_yield_distribution to void records instead.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.enforce_canonical_yield_mutations() IS
'Blocks direct INSERT/UPDATE/DELETE on yield_distributions. Use canonical RPCs: apply_segmented_yield_distribution_v5, void_yield_distribution, apply_yield_correction_v2.';


-- =============================================================================
-- PART 6: Fix existing bad data — reclassify 'completed' status → 'applied'
-- =============================================================================

UPDATE yield_distributions
SET status = 'applied'
WHERE status = 'completed';

-- Fix existing bad data — reclassify 'month_end' distribution_type → 'daily'
UPDATE yield_distributions
SET distribution_type = 'daily'
WHERE distribution_type = 'month_end';

-- Fix existing bad data — reclassify 'yield_event' distribution_type → 'daily'
UPDATE yield_distributions
SET distribution_type = 'daily'
WHERE distribution_type = 'yield_event';


-- =============================================================================
-- MIGRATION RECORD
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: fix_yield_constraint_violations_add_missing_checks';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed: apply_segmented_yield_distribution_v5 (month_end → daily)';
  RAISE NOTICE 'Fixed: crystallize_yield_before_flow (month_end → daily, completed → applied)';
  RAISE NOTICE 'Created: apply_yield_correction_v2 (with required parent + reason)';
  RAISE NOTICE 'Added: 8 CHECK constraints (funds, profiles, platform_invites, yield_distributions, fund_aum_events, fund_yield_snapshots, investor_position_snapshots, withdrawal_requests)';
  RAISE NOTICE 'Fixed: existing bad data (completed → applied, month_end → daily, yield_event → daily)';
END $$;