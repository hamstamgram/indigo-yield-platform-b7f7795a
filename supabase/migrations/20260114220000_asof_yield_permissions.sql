-- ============================================================================
-- AS-OF Yield Correctness + Permissions Tightening
-- Date: 2026-01-14
--
-- Goals:
-- 1) Prevent "time travel" by computing yield allocations using balances AS-OF p_yield_date
-- 2) Allow negative yield months (fees must be 0 on losses)
-- 3) Tighten EXECUTE privileges for critical finance RPCs (no PUBLIC/anon)
--
-- Non-negotiables:
-- - Native currency only (no USD columns / conversions)
-- - No management fee (performance fee only)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Allow negative yield rates but keep absolute safety bounds
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_yield_rate_sanity(
  p_gross_yield_pct numeric,
  p_fund_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_rate numeric;
BEGIN
  SELECT COALESCE(max_daily_yield_pct, 1.0) INTO v_max_rate
  FROM yield_rate_sanity_config
  WHERE fund_id = p_fund_id
  LIMIT 1;

  -- Yield rates can be negative (loss months). Enforce absolute bounds only.
  IF abs(p_gross_yield_pct) > 1.0 THEN
    RAISE EXCEPTION 'Daily yield rate % exceeds global hard limit of 1.0%%', p_gross_yield_pct;
  END IF;

  IF abs(p_gross_yield_pct) > v_max_rate THEN
    RAISE EXCEPTION 'Daily yield rate % exceeds maximum allowed % for this fund', p_gross_yield_pct, v_max_rate;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.validate_yield_rate_sanity IS
  'Validates daily yield percent bounds. Allows negative yield (loss months) while enforcing absolute maximum thresholds.';

-- ============================================================================
-- 2) Yield v3 apply: AS-OF balances, negative yield fees = 0, no time travel
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid DEFAULT NULL::uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric;
  v_fund record;
  v_gross_yield_amount numeric;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investor_count int := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor record;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_net_yield numeric;
  v_investor_gross numeric;
  v_fees_account_id uuid;
  v_dust numeric;
  v_dust_receiver_id uuid;
  v_reference_id text;
  v_fund_asset text;
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_yield_tx_id uuid;
BEGIN
  -- Advisory lock for concurrency
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  -- SECURITY: Yield application is a finance mutation and must be ADMIN-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can apply yield distributions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate yield rate sanity (absolute bounds)
  PERFORM validate_yield_rate_sanity(p_gross_yield_pct, p_fund_id);

  -- Duplicate distribution guard
  IF EXISTS (
    SELECT 1
    FROM yield_distributions yd
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date = p_yield_date
      AND yd.purpose = p_purpose
      AND yd.voided_at IS NULL
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Distribution already exists for this fund/date/purpose',
      'code', 'DUPLICATE_DISTRIBUTION'
    );
  END IF;

  -- Temporal lock check (unchanged)
  IF EXISTS (
    SELECT 1
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE
      AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal lock active', 'code', 'TEMPORAL_LOCK');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  v_fund_asset := v_fund.asset;

  -- Opening AUM must be explicit for this date/purpose (native currency only)
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_yield_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for yield date/purpose', 'code', 'AUM_MISSING');
  END IF;

  -- Fees account (platform)
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fees account not found');
  END IF;

  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);
  v_reference_id := 'YIELD-' || v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD');

  INSERT INTO fund_yield_snapshots (
    fund_id, snapshot_date, period_start, period_end,
    opening_aum, closing_aum,
    gross_yield_pct, gross_yield_amount,
    days_in_period, trigger_type, created_by
  )
  VALUES (
    p_fund_id, p_yield_date, p_yield_date, p_yield_date,
    v_fund_aum, v_fund_aum + v_gross_yield_amount,
    p_gross_yield_pct, v_gross_yield_amount,
    1, 'manual', p_created_by
  )
  RETURNING id INTO v_snapshot_id;

  -- If zero gross yield, record distribution header only (no allocations, no fees)
  IF v_gross_yield_amount = 0 THEN
    INSERT INTO yield_distributions (
      fund_id, effective_date, purpose, is_month_end,
      recorded_aum, previous_aum, opening_aum, closing_aum,
      gross_yield, net_yield, total_fees, total_ib, yield_percentage,
      investor_count, period_start, period_end, reference_id,
      dust_amount, dust_receiver_id, status, created_by
    )
    VALUES (
      p_fund_id, p_yield_date, p_purpose, false,
      v_fund_aum, v_fund_aum, v_fund_aum, v_fund_aum,
      0, 0, 0, 0, p_gross_yield_pct,
      0, p_yield_date, p_yield_date, v_reference_id,
      0, NULL, 'applied', p_created_by
    )
    RETURNING id INTO v_distribution_id;

    RETURN jsonb_build_object(
      'success', true,
      'distribution_id', v_distribution_id,
      'gross_yield', 0,
      'net_yield', 0,
      'total_fees', 0,
      'total_ib', 0,
      'investor_count', 0
    );
  END IF;

  -- AS-OF investor balances (prevents future flows affecting past allocations)
  FOR v_investor IN
    WITH tx_summary AS (
      SELECT
        t.investor_id,
        SUM(CASE WHEN t.type IN ('DEPOSIT','FIRST_INVESTMENT','TOP_UP') THEN t.amount ELSE 0 END) AS deposits,
        SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.investor_id IS NOT NULL
        AND t.tx_date <= p_yield_date
      GROUP BY t.investor_id
    ),
    yield_summary AS (
      SELECT
        ye.investor_id,
        SUM(ye.net_yield_amount) AS net_yield_total
      FROM investor_yield_events ye
      WHERE ye.fund_id = p_fund_id
        AND ye.is_voided = false
        AND ye.event_date <= p_yield_date
      GROUP BY ye.investor_id
    ),
    balances AS (
      SELECT
        p.id AS investor_id,
        trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')) AS investor_name,
        (COALESCE(tx.deposits,0) - COALESCE(tx.withdrawals,0) + COALESCE(ys.net_yield_total,0))::numeric AS balance,
        p.ib_percentage,
        p.ib_parent_id,
        p.fee_pct AS profile_fee_pct
      FROM profiles p
      LEFT JOIN tx_summary tx ON tx.investor_id = p.id
      LEFT JOIN yield_summary ys ON ys.investor_id = p.id
      WHERE p.account_type = 'investor'
    )
    SELECT
      investor_id,
      investor_name,
      balance,
      CASE WHEN v_fund_aum > 0 THEN (balance / v_fund_aum) * 100 ELSE 0 END AS ownership_pct,
      ib_percentage,
      ib_parent_id,
      profile_fee_pct
    FROM balances
    WHERE balance > 0
    ORDER BY balance DESC
  LOOP
    IF v_dust_receiver_id IS NULL THEN
      v_dust_receiver_id := v_investor.investor_id;
    END IF;

    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);

    -- Negative yield: no fees, no IB, net == gross
    IF v_investor_gross <= 0 THEN
      v_fee_amount := 0;
      v_ib_amount := 0;
      v_net_yield := v_investor_gross;
      v_fee_pct := COALESCE(v_investor.profile_fee_pct, 0);
      v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    ELSE
      v_fee_pct := COALESCE(v_investor.profile_fee_pct, 20);
      v_fee_amount := v_investor_gross * (v_fee_pct / 100);
      v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
      v_ib_amount := v_investor_gross * (v_ib_pct / 100);
      v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;
    END IF;

    -- Insert YIELD transaction for investor (net can be negative)
    INSERT INTO transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, purpose, is_system_generated
    )
    VALUES (
      p_fund_id, v_investor.investor_id, 'YIELD', v_net_yield, p_yield_date, v_fund_asset,
      v_reference_id || '-' || v_investor.investor_id, 'Net yield', p_created_by, p_purpose, true
    )
    RETURNING id INTO v_yield_tx_id;

    -- Fee and IB credits only on positive yield
    IF v_fee_amount > 0 THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated
      )
      VALUES (
        p_fund_id, v_fees_account_id, 'FEE_CREDIT', v_fee_amount, p_yield_date, v_fund_asset,
        'FEE-' || v_reference_id || '-' || v_investor.investor_id, 'Platform fee', p_created_by, p_purpose, true
      )
      RETURNING id INTO v_fee_tx_id;

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount,
        effective_date, asset, transaction_id, created_by
      )
      VALUES (
        p_fund_id, NULL, v_investor.investor_id, v_investor.investor_name,
        v_investor_gross, v_fee_pct, v_fee_amount,
        p_yield_date, v_fund_asset, v_fee_tx_id, p_created_by
      );
    END IF;

    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated
      )
      VALUES (
        p_fund_id, v_investor.ib_parent_id, 'IB_CREDIT', v_ib_amount, p_yield_date, v_fund_asset,
        'IB-' || v_reference_id || '-' || v_investor.investor_id, 'IB commission', p_created_by, p_purpose, true
      )
      RETURNING id INTO v_ib_tx_id;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id,
        source_investor_id, source_investor_name,
        ib_id, ib_name,
        gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT
        p_fund_id, NULL,
        v_investor.investor_id, v_investor.investor_name,
        v_investor.ib_parent_id,
        trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
        v_investor_gross, v_ib_pct, v_ib_amount,
        p_yield_date, v_fund_asset, v_ib_tx_id, p_created_by
      FROM profiles ib
      WHERE ib.id = v_investor.ib_parent_id;
    END IF;

    -- Update cumulative yield tracking
    UPDATE investor_positions
    SET cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
        last_yield_crystallization_date = p_yield_date,
        updated_at = now()
    WHERE fund_id = p_fund_id
      AND investor_id = v_investor.investor_id;

    v_investor_count := v_investor_count + 1;
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;
  END LOOP;

  IF v_investor_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No investors');
  END IF;

  v_dust := v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib);

  INSERT INTO yield_distributions (
    fund_id, effective_date, purpose, is_month_end,
    recorded_aum, previous_aum, opening_aum, closing_aum,
    gross_yield, net_yield, total_fees, total_ib, yield_percentage,
    investor_count, period_start, period_end, reference_id,
    dust_amount, dust_receiver_id, status, created_by
  )
  VALUES (
    p_fund_id, p_yield_date, p_purpose, false,
    v_fund_aum + v_gross_yield_amount, v_fund_aum, v_fund_aum, v_fund_aum + v_gross_yield_amount,
    v_gross_yield_amount, v_total_net, v_total_fees, v_total_ib, p_gross_yield_pct,
    v_investor_count, p_yield_date, p_yield_date, v_reference_id,
    v_dust, v_dust_receiver_id, 'applied', p_created_by
  )
  RETURNING id INTO v_distribution_id;

  UPDATE platform_fee_ledger
  SET yield_distribution_id = v_distribution_id
  WHERE fund_id = p_fund_id
    AND effective_date = p_yield_date
    AND yield_distribution_id IS NULL;

  UPDATE ib_commission_ledger
  SET yield_distribution_id = v_distribution_id
  WHERE fund_id = p_fund_id
    AND effective_date = p_yield_date
    AND yield_distribution_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'gross_yield', v_gross_yield_amount,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'investor_count', v_investor_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$function$;

COMMENT ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) IS
  'Apply yield distribution using AS-OF balances at p_yield_date (no time travel). Negative yield: fees=0 and net=gross.';

-- ============================================================================
-- 3) Yield v3 preview: AS-OF balances, negative yield fees = 0
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_code text;
  v_fund_asset text;
  v_opening_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_yield_pct numeric(28,10);
  v_total_fees numeric(28,10) := 0;
  v_total_ib_fees numeric(28,10) := 0;
  v_total_net numeric(28,10) := 0;
  v_indigo_fees_credit numeric(28,10) := 0;
  v_indigo_fees_id uuid;
  v_investor_count int := 0;
  v_distributions jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_existing_conflicts text[] := ARRAY[]::text[];
  v_result jsonb;
  v_inv record;
  v_inv_gross numeric(28,10);
  v_inv_fee numeric(28,10);
  v_inv_net numeric(28,10);
  v_inv_new_balance numeric(28,10);
  v_inv_pct numeric(28,10);
  v_fee_pct numeric(28,10);
  v_ib_parent_id uuid;
  v_ib_parent_name text;
  v_ib_pct numeric(28,10);
  v_ib_amount numeric(28,10);
  v_indigo_fee numeric(28,10);
  v_reference_id text;
  v_would_skip boolean;
  v_is_month_end boolean;
BEGIN
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Opening AUM is AS-OF balances at p_yield_date (no time travel)
  WITH tx_summary AS (
    SELECT
      t.investor_id,
      SUM(CASE WHEN t.type IN ('DEPOSIT','FIRST_INVESTMENT','TOP_UP') THEN t.amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.is_voided = false
      AND t.investor_id IS NOT NULL
      AND t.tx_date <= p_yield_date
    GROUP BY t.investor_id
  ),
  yield_summary AS (
    SELECT
      ye.investor_id,
      SUM(ye.net_yield_amount) AS net_yield_total
    FROM investor_yield_events ye
    WHERE ye.fund_id = p_fund_id
      AND ye.is_voided = false
      AND ye.event_date <= p_yield_date
    GROUP BY ye.investor_id
  ),
  balances AS (
    SELECT
      p.id AS investor_id,
      (COALESCE(tx.deposits,0) - COALESCE(tx.withdrawals,0) + COALESCE(ys.net_yield_total,0))::numeric(28,10) AS balance
    FROM profiles p
    LEFT JOIN tx_summary tx ON tx.investor_id = p.id
    LEFT JOIN yield_summary ys ON ys.investor_id = p.id
    WHERE p.account_type = 'investor'
  )
  SELECT COALESCE(SUM(balance), 0)::numeric(28,10)
  INTO v_opening_aum
  FROM balances
  WHERE balance > 0;

  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No positions found for this fund as-of this date. Create deposits first.',
      'fundId', p_fund_id,
      'fundCode', v_fund_code
    );
  END IF;

  v_gross_yield := round((p_new_aum - v_opening_aum)::numeric, 10)::numeric(28,10);

  IF v_opening_aum > 0 THEN
    v_yield_pct := round((v_gross_yield / v_opening_aum * 100)::numeric, 6);
  ELSE
    v_yield_pct := 0;
  END IF;

  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Process each investor (AS-OF)
  FOR v_inv IN
    WITH tx_summary AS (
      SELECT
        t.investor_id,
        SUM(CASE WHEN t.type IN ('DEPOSIT','FIRST_INVESTMENT','TOP_UP') THEN t.amount ELSE 0 END) AS deposits,
        SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.investor_id IS NOT NULL
        AND t.tx_date <= p_yield_date
      GROUP BY t.investor_id
    ),
    yield_summary AS (
      SELECT
        ye.investor_id,
        SUM(ye.net_yield_amount) AS net_yield_total
      FROM investor_yield_events ye
      WHERE ye.fund_id = p_fund_id
        AND ye.is_voided = false
        AND ye.event_date <= p_yield_date
      GROUP BY ye.investor_id
    ),
    balances AS (
      SELECT
        p.id AS investor_id,
        trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
        p.account_type,
        (COALESCE(tx.deposits,0) - COALESCE(tx.withdrawals,0) + COALESCE(ys.net_yield_total,0))::numeric(28,10) AS balance,
        COALESCE(
          (SELECT ifs1.fee_pct / 100
           FROM investor_fee_schedule ifs1
           WHERE ifs1.investor_id = p.id
             AND ifs1.fund_id = p_fund_id
             AND p_yield_date >= ifs1.effective_date
             AND (ifs1.end_date IS NULL OR p_yield_date <= ifs1.end_date)
           ORDER BY ifs1.effective_date DESC
           LIMIT 1),
          (SELECT ifs2.fee_pct / 100
           FROM investor_fee_schedule ifs2
           WHERE ifs2.investor_id = p.id
             AND ifs2.fund_id IS NULL
             AND p_yield_date >= ifs2.effective_date
             AND (ifs2.end_date IS NULL OR p_yield_date <= ifs2.end_date)
           ORDER BY ifs2.effective_date DESC
           LIMIT 1),
          p.fee_pct / 100,
          0
        ) as fee_pct,
        p.ib_parent_id,
        COALESCE(p.ib_percentage, 0) as ib_pct_raw
      FROM profiles p
      LEFT JOIN tx_summary tx ON tx.investor_id = p.id
      LEFT JOIN yield_summary ys ON ys.investor_id = p.id
      WHERE p.account_type = 'investor'
    )
    SELECT *
    FROM balances
    WHERE balance > 0
    ORDER BY balance DESC
  LOOP
    v_investor_count := v_investor_count + 1;

    v_inv_pct := round((v_inv.balance / v_opening_aum * 100)::numeric, 6);
    v_inv_gross := round((v_inv.balance / v_opening_aum * v_gross_yield)::numeric, 10);

    v_fee_pct := v_inv.fee_pct;
    v_ib_pct := v_inv.ib_pct_raw / 100;

    v_ib_amount := 0;
    v_ib_parent_id := v_inv.ib_parent_id;
    v_ib_parent_name := NULL;

    IF v_inv_gross <= 0 THEN
      v_indigo_fee := 0;
      v_ib_amount := 0;
    ELSE
      v_indigo_fee := round((v_inv_gross * v_fee_pct)::numeric, 10);
      IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
        v_ib_amount := round((v_inv_gross * v_ib_pct)::numeric, 10);
        v_total_ib_fees := v_total_ib_fees + v_ib_amount;
        SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        INTO v_ib_parent_name
        FROM profiles WHERE id = v_ib_parent_id;
      END IF;
    END IF;

    v_inv_fee := v_indigo_fee + v_ib_amount;
    v_inv_net := v_inv_gross - v_inv_fee;
    v_inv_new_balance := v_inv.balance + v_inv_net;

    v_total_fees := v_total_fees + v_inv_fee;
    v_total_net := v_total_net + v_inv_net;

    v_reference_id := 'yield_' || v_fund_code || '_' || p_yield_date::text || '_' || v_inv.investor_id::text;

    SELECT EXISTS(
      SELECT 1 FROM yield_distributions
      WHERE reference_id = v_reference_id AND voided_at IS NULL
    ) INTO v_would_skip;

    IF v_would_skip THEN
      v_existing_conflicts := array_append(v_existing_conflicts, v_reference_id);
    END IF;

    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_ib_amount > 0 THEN
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_ib_parent_id,
        'ibInvestorName', v_ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_ib_amount,
        'ibPercentage', v_inv.ib_pct_raw,
        'source', 'yield_fee',
        'referenceId', 'ib_' || v_reference_id,
        'wouldSkip', v_would_skip
      );
    END IF;

    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', v_inv.balance,
      'allocationPercentage', v_inv_pct,
      'feePercentage', v_fee_pct * 100,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'indigoFee', v_indigo_fee,
      'netYield', v_inv_net,
      'newBalance', v_inv_new_balance,
      'positionDelta', v_inv_net,
      'ibParentId', v_ib_parent_id,
      'ibParentName', v_ib_parent_name,
      'ibPercentage', v_inv.ib_pct_raw,
      'ibAmount', v_ib_amount,
      'referenceId', v_reference_id,
      'wouldSkip', v_would_skip
    );
  END LOOP;

  v_indigo_fees_credit := v_total_fees - v_total_ib_fees;

  v_result := jsonb_build_object(
    'success', true,
    'preview', true,
    'fundId', p_fund_id,
    'fundCode', v_fund_code,
    'fundAsset', v_fund_asset,
    'effectiveDate', p_yield_date,
    'purpose', p_purpose,
    'isMonthEnd', v_is_month_end,
    'currentAUM', v_opening_aum,
    'newAUM', p_new_aum,
    'grossYield', v_gross_yield,
    'netYield', v_total_net,
    'totalFees', v_total_fees,
    'totalIbFees', v_total_ib_fees,
    'yieldPercentage', v_yield_pct,
    'investorCount', v_investor_count,
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', v_indigo_fees_credit,
    'indigoFeesId', v_indigo_fees_id,
    'existingConflicts', to_jsonb(v_existing_conflicts),
    'hasConflicts', array_length(v_existing_conflicts, 1) > 0,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ibFees', v_total_ib_fees,
      'net', v_total_net,
      'indigoCredit', v_indigo_fees_credit
    ),
    'status', 'preview'
  );

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) IS
  'Preview yield distribution using AS-OF balances at p_yield_date (no time travel). Negative yield: fees=0 and net=gross.';

-- ============================================================================
-- 4) Tighten EXECUTE grants for critical finance RPCs (no PUBLIC/anon)
-- ============================================================================

DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) TO service_role;
    GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.ensure_preflow_aum(uuid, date, aum_purpose, numeric, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO service_role;
    GRANT EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO service_role;
  END IF;
END;
$$;

COMMIT;
