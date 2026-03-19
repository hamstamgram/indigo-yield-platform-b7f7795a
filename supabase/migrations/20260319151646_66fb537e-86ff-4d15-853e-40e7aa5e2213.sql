-- Fix: Fee percentages used as raw multipliers instead of being divided by 100
-- Must DROP first because we're changing the return type to match what's live (jsonb)

DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date);

CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_distribution_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

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
    'flat_position_proportional_v6', p_purpose, v_is_month_end, 0,
    CASE WHEN p_purpose = 'reporting' THEN 'month_end' ELSE p_purpose::text END
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  INSERT INTO _vflat_alloc (investor_id, investor_name, investor_email, account_type, ib_parent_id, current_value)
  SELECT ip.investor_id,
         COALESCE(p.first_name || ' ' || p.last_name, 'Unknown'),
         COALESCE(p.email, ''),
         p.account_type::text,
         p.ib_parent_id,
         ip.current_value
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value <> 0;

  IF v_opening_aum <> 0 THEN
    FOR v_alloc IN SELECT * FROM _vflat_alloc LOOP
      v_share := v_alloc.current_value / v_opening_aum;
      v_gross := ROUND(v_total_month_yield * v_share, 10);

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
        -- FIX: divide by 100 since fee_pct/ib_rate are whole numbers (e.g. 16 for 16%)
        v_fee := ROUND(v_gross * (v_fee_pct / 100.0), 10);
        v_ib := ROUND(v_gross * (v_ib_rate / 100.0), 10);
        v_net := v_gross - v_fee;
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

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, transaction_id,
      gross_amount, net_amount, fee_pct, ib_pct,
      position_value_at_calc, ownership_pct
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id, v_yield_tx_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee_pct, v_alloc.ib_rate,
      v_alloc.current_value,
      CASE WHEN v_opening_aum > 0 THEN ROUND((v_alloc.current_value / v_opening_aum) * 100, 4) ELSE 0 END
    );

    IF v_alloc.fee > 0 AND v_alloc.account_type <> 'fees_account' THEN
      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_alloc.investor_id,
        p_tx_type := 'FEE'::tx_type,
        p_amount := v_alloc.fee,
        p_tx_date := v_tx_date,
        p_reference_id := 'fee-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'Fee deduction for yield ' || v_distribution_id,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_fee_tx_result;
      v_fee_tx_id := (v_fee_tx_result->>'transaction_id')::uuid;

      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fees_account_id,
        fee_percentage, base_net_income, fee_amount,
        debit_transaction_id, period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id, v_fees_account_id,
        v_alloc.fee_pct, v_alloc.gross, v_alloc.fee,
        v_fee_tx_id, v_period_start, v_period_end, p_purpose, v_admin
      );

      SELECT apply_investor_transaction(
        p_fund_id := p_fund_id,
        p_investor_id := v_fees_account_id,
        p_tx_type := 'FEE_CREDIT'::tx_type,
        p_amount := v_alloc.fee,
        p_tx_date := v_tx_date,
        p_reference_id := 'fee_credit-' || v_distribution_id || '-' || v_alloc.investor_id,
        p_admin_id := v_admin,
        p_notes := 'Fee credit from ' || v_alloc.investor_name,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      ) INTO v_fee_tx_result;

      UPDATE fee_allocations
      SET credit_transaction_id = (v_fee_tx_result->>'transaction_id')::uuid
      WHERE distribution_id = v_distribution_id AND investor_id = v_alloc.investor_id;

      INSERT INTO platform_fee_ledger (
        fund_id, investor_id, investor_name, asset,
        gross_yield_amount, fee_percentage, fee_amount,
        effective_date, yield_distribution_id, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_alloc.investor_id, v_alloc.investor_name, v_fund.asset,
        v_alloc.gross, v_alloc.fee_pct, v_alloc.fee,
        v_tx_date, v_distribution_id, v_fee_tx_id, v_admin
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
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

      INSERT INTO ib_allocations (
        distribution_id, source_investor_id, ib_investor_id, fund_id,
        ib_percentage, source_net_income, ib_fee_amount,
        effective_date, period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, v_alloc.ib_parent_id, p_fund_id,
        v_alloc.ib_rate, v_alloc.gross, v_alloc.ib,
        v_tx_date, v_period_start, v_period_end, p_purpose, v_admin
      );

      INSERT INTO ib_commission_ledger (
        fund_id, source_investor_id, source_investor_name, ib_id, ib_name,
        gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, yield_distribution_id, transaction_id, asset, created_by
      ) VALUES (
        p_fund_id, v_alloc.investor_id, v_alloc.investor_name,
        v_alloc.ib_parent_id,
        (SELECT COALESCE(first_name || ' ' || last_name, 'IB') FROM profiles WHERE id = v_alloc.ib_parent_id),
        v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
        v_tx_date, v_distribution_id, v_ib_tx_id, v_fund.asset, v_admin
      );
    END IF;
  END LOOP;

  IF v_residual <> 0 THEN
    SELECT apply_investor_transaction(
      p_fund_id := p_fund_id,
      p_investor_id := v_fees_account_id,
      p_tx_type := 'DUST'::tx_type,
      p_amount := v_residual,
      p_tx_date := v_tx_date,
      p_reference_id := 'dust-' || v_distribution_id,
      p_admin_id := v_admin,
      p_notes := 'Rounding dust for distribution ' || v_distribution_id,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    ) INTO v_tx_result;
  END IF;

  UPDATE yield_distributions SET
    gross_yield = v_total_month_yield,
    gross_yield_amount = v_total_gross - COALESCE(v_fees_account_gross, 0),
    total_net_amount = v_total_net - COALESCE(v_fees_account_net, 0),
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net - COALESCE(v_fees_account_net, 0),
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = v_residual,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_updated_rows := 0;
    UPDATE fund_daily_aum SET
      total_aum = p_recorded_aum, is_month_end = v_is_month_end,
      source = 'yield_distribution', created_by = v_admin, updated_at = now(), is_voided = false
    WHERE fund_id = p_fund_id AND aum_date = v_period_end AND purpose = p_purpose;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows = 0 THEN
      INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by)
      VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, v_is_month_end, 'yield_distribution', v_admin);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'distribution_id', v_distribution_id,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_month_yield,
    'net_yield', v_total_net - COALESCE(v_fees_account_net, 0),
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', v_residual,
    'allocation_count', v_allocation_count,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$function$;
