-- Migration: Fix dust tolerance dilution + P2 tech debt items
-- Date: 2026-02-09
--
-- Fix 1: Lower dust tolerance from 0.01 to 0.00000001 (1 satoshi) in both
--         apply and preview functions. System accounts (INDIGO FEES, QA Broker)
--         have tiny but legitimate gross shares (e.g. 0.003 BTC) that were being
--         skipped by the 0.01 threshold, causing their ADB to dilute the
--         denominator while their share was silently redirected to the largest
--         investor via largest remainder.
--
-- Fix 2a: Add 'transaction' and 'preflow' to fund_aum_events trigger_type CHECK
--         constraint. apply_transaction_with_crystallization passes 'transaction'
--         and crystallize_yield_before_flow passes 'preflow'.
--
-- Fix 2b: Update v_missing_withdrawal_transactions to match both WR- and WDR-
--         reference_id prefixes (complete_withdrawal uses WDR-).
--
-- Fix 2c: Update v_position_transaction_variance to include YIELD type alongside
--         INTEREST, and include FEE_CREDIT and IB_CREDIT for complete coverage.

-- ============================================================================
-- FIX 1: apply_adb_yield_distribution_v3 - lower dust tolerance
-- ============================================================================
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
  p_dust_tolerance numeric := 0.00000001;  -- FIX: was 0.01, now 1 satoshi
  v_tx_date date;
  v_derived_yield numeric := 0;
  v_ib_allocation_id uuid;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_alloc_investor_id uuid;
  v_largest_alloc_gross numeric;
  v_largest_alloc_fee_pct numeric;
  v_largest_alloc_ib_rate numeric;
  v_largest_alloc_ib_parent_id uuid;
  v_adj_fee numeric;
  v_adj_ib numeric;
  v_adj_net numeric;
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

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_current_aum
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

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

  -- Track the largest allocation for residual assignment
  v_largest_alloc_gross := 0;
  v_largest_alloc_investor_id := NULL;

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

    -- Track the largest allocation
    IF v_gross_share > v_largest_alloc_gross THEN
      v_largest_alloc_gross := v_gross_share;
      v_largest_alloc_investor_id := v_investor.investor_id;
      v_largest_alloc_fee_pct := v_investor.fee_pct;
      v_largest_alloc_ib_rate := v_investor.ib_rate;
      v_largest_alloc_ib_parent_id := v_investor.ib_parent_id;
    END IF;

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

  -- ========================================================================
  -- LARGEST REMAINDER: assign any residual to the largest allocation
  -- ========================================================================
  v_residual := v_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND v_largest_alloc_investor_id IS NOT NULL THEN
    -- Residual goes entirely to net (not to fees or IB)
    UPDATE yield_allocations
    SET gross_amount = gross_amount + v_residual,
        net_amount = net_amount + v_residual
    WHERE distribution_id = v_distribution_id
      AND investor_id = v_largest_alloc_investor_id;

    -- Update the YIELD transaction for that investor
    UPDATE transactions_v2
    SET amount = amount + v_residual
    WHERE reference_id = 'yield_adb_' || v_distribution_id::text || '_' || v_largest_alloc_investor_id::text
      AND NOT is_voided;

    -- Recompute that investor's position from ledger
    PERFORM recompute_investor_position(v_largest_alloc_investor_id, p_fund_id);

    -- Update running totals
    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

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

  -- Auto-mark IB allocations as 'paid' when purpose = 'reporting'
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
    dust_amount = 0,
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
      'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
      'dust_amount', 0, 'residual_applied_to', v_largest_alloc_investor_id,
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
    'dust_amount', 0,
    'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'days_in_period', v_period_end - v_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'total_loss_offset', 0,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date', 'fees_account_in_adb', 'ib_auto_payout', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance']
  );
END;
$$;

-- ============================================================================
-- FIX 1 (continued): preview_adb_yield_distribution_v3 - lower dust tolerance
-- ============================================================================
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
  v_dust_tolerance numeric := 0.00000001;  -- FIX: was 0.01, now 1 satoshi
  v_ib_parent_name text;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_idx int := 0;
  v_largest_gross numeric := 0;
  v_current_idx int := 0;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

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

      -- Track largest for residual assignment
      IF v_gross_share > v_largest_gross THEN
        v_largest_gross := v_gross_share;
        v_largest_idx := v_current_idx;
      END IF;
      v_current_idx := v_current_idx + 1;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  -- ========================================================================
  -- LARGEST REMAINDER: adjust the largest allocation in the preview
  -- ========================================================================
  v_residual := p_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND jsonb_array_length(v_allocations) > 0 THEN
    -- Update the largest allocation: residual goes to gross and net
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'gross_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'gross_yield')::numeric + v_residual)
    );
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'net_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'net_yield')::numeric + v_residual)
    );

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

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
    'dust_amount', 0,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', p_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission', 'fees_account_in_adb', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance']
  );
END;
$$;

-- ============================================================================
-- FIX 2a: Add 'transaction' and 'preflow' to fund_aum_events trigger_type CHECK
-- ============================================================================
DO $$
BEGIN
  -- Drop the existing check constraint (auto-named from inline CHECK)
  ALTER TABLE fund_aum_events DROP CONSTRAINT IF EXISTS fund_aum_events_trigger_type_check;
  -- Also try the inline constraint name pattern
  BEGIN
    EXECUTE 'ALTER TABLE fund_aum_events DROP CONSTRAINT IF EXISTS "fund_aum_events_trigger_type_check"';
  EXCEPTION WHEN undefined_object THEN NULL;
  END;
END;
$$;

ALTER TABLE fund_aum_events ADD CONSTRAINT fund_aum_events_trigger_type_check
  CHECK (trigger_type IN ('deposit', 'withdrawal', 'yield', 'month_end', 'manual', 'preflow', 'transaction'));

-- ============================================================================
-- FIX 2b: v_missing_withdrawal_transactions - match both WR- and WDR- prefixes
-- ============================================================================
CREATE OR REPLACE VIEW v_missing_withdrawal_transactions AS
SELECT
  wr.id AS request_id,
  wr.investor_id,
  p.email AS investor_email,
  wr.fund_id,
  f.code AS fund_code,
  wr.processed_amount,
  wr.settlement_date,
  wr.request_date,
  wr.status
FROM withdrawal_requests wr
JOIN funds f ON f.id = wr.fund_id
JOIN profiles p ON p.id = wr.investor_id
WHERE wr.status = 'completed'
  AND wr.processed_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM transactions_v2 t
    WHERE (t.reference_id = 'WR-' || wr.id::text
        OR t.reference_id = 'WDR-' || wr.id::text)
      AND t.type = 'WITHDRAWAL'
      AND t.is_voided = false
  );

ALTER VIEW v_missing_withdrawal_transactions SET (security_invoker = true);
COMMENT ON VIEW v_missing_withdrawal_transactions IS
  'Integrity: Completed withdrawals missing ledger transactions (checks both WR- and WDR- prefixes). Empty = healthy.';

-- ============================================================================
-- FIX 2c: v_position_transaction_variance - include YIELD, FEE_CREDIT, IB_CREDIT
-- ============================================================================
DROP VIEW IF EXISTS public.v_position_transaction_variance CASCADE;
CREATE OR REPLACE VIEW public.v_position_transaction_variance AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value AS position_value,
  ip.cost_basis,
  COALESCE(deposits.total, 0) AS total_deposits,
  COALESCE(withdrawals.total, 0) AS total_withdrawals,
  COALESCE(yields.total, 0) AS total_interest,
  COALESCE(fees.total, 0) AS total_fees,
  ip.current_value - (
    COALESCE(deposits.total, 0) -
    COALESCE(withdrawals.total, 0) +
    COALESCE(yields.total, 0) -
    COALESCE(fees.total, 0)
  ) AS balance_variance
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'DEPOSIT'
    AND is_voided = false
) deposits ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'WITHDRAWAL'
    AND is_voided = false
) withdrawals ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type IN ('INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT')
    AND is_voided = false
) yields ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(ABS(amount)), 0) AS total
  FROM transactions_v2
  WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'FEE'
    AND is_voided = false
) fees ON true
WHERE ip.is_active = true
  AND ABS(ip.current_value - (
    COALESCE(deposits.total, 0) -
    COALESCE(withdrawals.total, 0) +
    COALESCE(yields.total, 0) -
    COALESCE(fees.total, 0)
  )) > 0.01;

ALTER VIEW v_position_transaction_variance SET (security_invoker = true);
GRANT SELECT ON v_position_transaction_variance TO authenticated;
COMMENT ON VIEW public.v_position_transaction_variance IS
  'Detailed breakdown of position vs transaction totals. Includes YIELD, FEE_CREDIT, IB_CREDIT types. Empty = healthy.';
