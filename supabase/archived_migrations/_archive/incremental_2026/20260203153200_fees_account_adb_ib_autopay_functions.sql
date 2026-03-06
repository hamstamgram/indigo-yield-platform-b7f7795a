-- Apply the three function updates for:
-- 1.1: fees_account in ADB yield distribution
-- 1.2: IB auto-payout during reporting yield
-- These are DDL (CREATE OR REPLACE FUNCTION) not DML on protected tables

CREATE OR REPLACE FUNCTION "public"."apply_adb_yield_distribution_v3"(
  "p_fund_id" "uuid",
  "p_period_start" "date",
  "p_period_end" "date",
  "p_gross_yield_amount" numeric,
  "p_admin_id" "uuid" DEFAULT NULL::"uuid",
  "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose",
  "p_distribution_date" "date" DEFAULT NULL::"date"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_distribution_id uuid;
  v_total_adb numeric := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_lock_key bigint;
  v_current_aum numeric := 0;
  v_fees_account_id uuid;
  v_fee_tx jsonb;
  v_fee_tx_id uuid;
  v_ib_tx jsonb;
  v_ib_tx_id uuid;
  v_yield_tx jsonb;
  v_yield_tx_id uuid;
  v_is_month_end boolean := false;
  v_latest_tx_date date;
  v_period_start date := p_period_start;
  v_period_end date := p_period_end;
  v_gross_yield_amount numeric := p_gross_yield_amount;
  v_tx_count int := 0;
  p_dust_tolerance numeric := 0.01;
  v_tx_date date;
  v_derived_yield numeric := 0;
  v_ib_allocation_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF p_period_end IS NOT NULL THEN
      v_period_start := date_trunc('month', p_period_end)::date;
      v_period_end := (date_trunc('month', p_period_end)::date + interval '1 month - 1 day')::date;
    ELSE
      SELECT MAX(tx_date)::date INTO v_latest_tx_date
      FROM transactions_v2 WHERE fund_id = p_fund_id AND is_voided = false;
      IF v_latest_tx_date IS NULL THEN
        RAISE EXCEPTION 'No transactions found for fund % to derive reporting period', p_fund_id;
      END IF;
      v_period_start := date_trunc('month', v_latest_tx_date)::date;
      v_period_end := (date_trunc('month', v_latest_tx_date)::date + interval '1 month - 1 day')::date;
    END IF;

    v_tx_date := COALESCE(p_distribution_date, v_period_end);
    PERFORM set_config('indigo.aum_synced', 'true', true);

    IF COALESCE(p_gross_yield_amount, 0) <= 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_derived_yield
      FROM transactions_v2
      WHERE fund_id = p_fund_id AND is_voided = false
        AND type = 'YIELD'::tx_type
        AND tx_date >= v_period_start AND tx_date <= v_period_end;
      v_gross_yield_amount := v_derived_yield;
    END IF;
  ELSE
    v_tx_date := COALESCE(p_distribution_date, CURRENT_DATE);
  END IF;

  IF v_gross_yield_amount < 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be non-negative';
  END IF;
  IF v_period_end < v_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured (profiles.account_type=fees_account)';
  END IF;

  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end)::date + interval '1 month - 1 day')::date);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, v_period_end;
  END IF;

  -- FIX 1.1: Include fees_account in AUM calculation
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_current_aum
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  -- FIX 1.1: Include fees_account in total ADB calculation
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib,
    status, created_by, calculation_method, purpose, is_month_end
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    v_current_aum + v_gross_yield_amount, v_current_aum, v_gross_yield_amount, v_gross_yield_amount,
    0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'ADB', p_purpose, v_is_month_end
  ) RETURNING id INTO v_distribution_id;

  -- FIX 1.1: Include fees_account in investor loop
  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      CASE WHEN p.account_type IN ('ib', 'fees_account') THEN 0
        ELSE COALESCE(
          (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
           WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
           ORDER BY ifs.created_at DESC LIMIT 1),
          p.fee_pct, 0)
      END as fee_pct,
      COALESCE(
        (SELECT CASE WHEN p.ib_parent_id IS NULL THEN 0 ELSE COALESCE(p.ib_percentage, 0) END
         FROM profiles p WHERE p.id = ip.investor_id), 0
      ) as ib_rate,
      p.ib_parent_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) > 0
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * v_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share < p_dust_tolerance THEN CONTINUE; END IF;

    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id, p_fund_id := p_fund_id,
      p_tx_type := 'YIELD', p_amount := v_net_share, p_tx_date := v_tx_date,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_yield_tx->>'tx_id', '')::uuid;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id, v_gross_share, v_net_share,
      v_fee_share, v_ib_share, v_investor.adb, v_investor.fee_pct, v_investor.ib_rate, v_yield_tx_id, NOW()
    );

    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date, asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_gross_share, v_investor.fee_pct, v_fee_share, v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id, p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT', p_amount := v_ib_share, p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
        p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_investor.ib_parent_id, trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
        v_gross_share, v_investor.ib_rate, v_ib_share, v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_investor.ib_parent_id;
    END IF;

    IF v_fee_share > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_gross_share, v_investor.fee_pct,
        v_fee_share, NULL, v_admin
      );
    END IF;

    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id, p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT', p_amount := v_total_fees, p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees collected after IB for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  -- FIX 1.2: Auto-mark IB allocations as 'paid' when purpose = 'reporting'
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid',
        paid_at = NOW(),
        paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false
      AND payout_status = 'pending';
  END IF;

  UPDATE yield_distributions SET
    total_net_amount = v_total_net, total_fee_amount = v_total_fees, total_ib_amount = v_total_ib,
    net_yield = v_total_net, total_fees = v_total_fees, total_ib = v_total_ib,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  UPDATE fund_daily_aum
  SET total_aum = v_current_aum + v_gross_yield_amount,
      as_of_date = v_period_end,
      is_month_end = v_is_month_end,
      source = 'yield_distribution',
      created_by = v_admin
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  IF NOT FOUND THEN
    INSERT INTO fund_daily_aum (
      id, fund_id, aum_date, total_aum, as_of_date, is_month_end,
      purpose, source, created_at, created_by, is_voided
    ) VALUES (
      gen_random_uuid(), p_fund_id, v_period_end, v_current_aum + v_gross_yield_amount,
      v_period_end, v_is_month_end, p_purpose, 'yield_distribution', NOW(), v_admin, false
    );
  END IF;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('previous_aum', v_current_aum),
    jsonb_build_object(
      'new_aum', v_current_aum + v_gross_yield_amount, 'gross_yield', v_gross_yield_amount,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'distribution_date', v_tx_date, 'purpose', p_purpose::text,
      'calculation_method', 'ADB', 'total_adb', v_total_adb,
      'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < p_dust_tolerance,
      'includes_fees_account', true, 'ib_auto_paid', p_purpose = 'reporting'::aum_purpose
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'distribution_id', v_distribution_id, 'fund_id', p_fund_id,
    'period_start', v_period_start, 'period_end', v_period_end, 'total_adb', v_total_adb,
    'gross_yield', v_gross_yield_amount, 'allocated_gross', v_total_gross,
    'allocated_net', v_total_net, 'net_yield', v_total_net,
    'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'allocation_count', v_allocation_count, 'investor_count', v_allocation_count,
    'dust_amount', v_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < p_dust_tolerance,
    'days_in_period', v_period_end - v_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'total_loss_offset', 0,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date', 'fees_account_in_adb', 'ib_auto_payout']
  );
END;
$$;

-- Preview function
CREATE OR REPLACE FUNCTION "public"."preview_adb_yield_distribution_v3"(
  "p_fund_id" "uuid",
  "p_period_start" "date",
  "p_period_end" "date",
  "p_gross_yield_amount" numeric,
  "p_purpose" "text" DEFAULT 'transaction'::"text"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_adb numeric := 0;
  v_fund RECORD;
  v_allocations jsonb := '[]'::jsonb;
  v_ib_summary jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_dust_tolerance numeric := 0.01;
  v_ib_parent_name text;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- FIX 1.1: Include fees_account in total ADB
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'total_adb', 0,
      'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance'
    );
  END IF;

  -- FIX 1.1: Include fees_account in investor loop
  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      CASE WHEN p.account_type IN ('ib', 'fees_account') THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct, 0
      ) END as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);

    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 THEN
      v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share >= v_dust_tolerance THEN
      v_allocations := v_allocations || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_email', v_investor.investor_email,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'adb', v_investor.adb,
        'adb_share_pct', ROUND((v_investor.adb / v_total_adb * 100)::numeric, 4),
        'gross_yield', v_gross_share,
        'fee_pct', v_investor.fee_pct,
        'fee_amount', v_fee_share,
        'net_yield', v_net_share,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share
      );

      IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
        v_ib_summary := v_ib_summary || jsonb_build_object(
          'ib_parent_id', v_investor.ib_parent_id,
          'ib_parent_name', v_ib_parent_name,
          'source_investor_id', v_investor.investor_id,
          'source_investor_name', v_investor.investor_name,
          'ib_rate', v_investor.ib_rate,
          'ib_amount', v_ib_share,
          'source_gross', v_gross_share
        );
      END IF;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'days_in_period', p_period_end - p_period_start + 1,
    'total_adb', v_total_adb,
    'gross_yield_amount', p_gross_yield_amount,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'platform_fees', v_total_fees,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < v_dust_tolerance,
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission', 'fees_account_in_adb']
  );
END;
$$;

-- Sync trigger function
CREATE OR REPLACE FUNCTION public.sync_ib_allocations_from_commission_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allocation_id uuid;
  v_purpose aum_purpose;
BEGIN
  -- Guard: Skip if no valid distribution_id
  IF new.yield_distribution_id IS NULL THEN
    RETURN new;
  END IF;

  -- Guard: Skip if distribution doesn't exist
  IF NOT EXISTS (SELECT 1 FROM public.yield_distributions WHERE id = new.yield_distribution_id) THEN
    RETURN new;
  END IF;

  -- Get the purpose from the yield distribution
  SELECT yd.purpose INTO v_purpose
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id;

  -- Insert IB allocation from commission ledger entry
  INSERT INTO public.ib_allocations (
    id,
    ib_investor_id,
    source_investor_id,
    fund_id,
    source_net_income,
    ib_percentage,
    ib_fee_amount,
    effective_date,
    created_at,
    created_by,
    distribution_id,
    period_start,
    period_end,
    purpose,
    source,
    is_voided,
    payout_status,
    paid_at,
    paid_by
  )
  SELECT
    gen_random_uuid(),
    new.ib_id,
    new.source_investor_id,
    new.fund_id,
    new.gross_yield_amount,
    new.ib_percentage,
    new.ib_commission_amount,
    new.effective_date,
    COALESCE(new.created_at, now()),
    new.created_by,
    new.yield_distribution_id,
    yd.period_start,
    yd.period_end,
    yd.purpose,
    'from_investor_yield',
    COALESCE(new.is_voided, false),
    -- FIX 1.2: Auto-mark as paid for reporting purpose
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN 'paid' ELSE 'pending' END,
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN now() ELSE NULL END,
    CASE WHEN v_purpose = 'reporting'::aum_purpose THEN new.created_by ELSE NULL END
  FROM public.yield_distributions yd
  WHERE yd.id = new.yield_distribution_id
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$function$;;
