-- Fix all invalid enum references: FIRST_INVESTMENT and TOP_UP are NOT valid tx_type values
-- Version 2: Properly drops functions before recreating them

-- ============================================================================
-- 1. FIX apply_daily_yield_to_fund_v3
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
  -- FIX: Changed from 'FIRST_INVESTMENT','TOP_UP' to just 'DEPOSIT' (valid enum value)
  FOR v_investor IN
    WITH tx_summary AS (
      SELECT
        t.investor_id,
        SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
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

-- ============================================================================
-- 2. FIX get_investor_position_as_of (DROP first due to return type change)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_investor_position_as_of(uuid, uuid, date);

CREATE OR REPLACE FUNCTION public.get_investor_position_as_of(
  p_fund_id uuid,
  p_investor_id uuid,
  p_as_of_date date
)
RETURNS TABLE (
  investor_id uuid,
  fund_id uuid,
  total_deposits numeric,
  total_withdrawals numeric,
  total_yield numeric,
  net_position numeric,
  as_of_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH tx_summary AS (
    SELECT
      -- FIX: Changed from 'FIRST_INVESTMENT','TOP_UP' to just 'DEPOSIT'
      SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END) AS withdrawals,
      SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END) AS yield_amount
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.investor_id = p_investor_id
      AND t.is_voided = false
      AND t.tx_date <= p_as_of_date
  )
  SELECT
    p_investor_id,
    p_fund_id,
    COALESCE(tx.deposits, 0),
    COALESCE(tx.withdrawals, 0),
    COALESCE(tx.yield_amount, 0),
    COALESCE(tx.deposits, 0) - COALESCE(tx.withdrawals, 0) + COALESCE(tx.yield_amount, 0),
    p_as_of_date
  FROM tx_summary tx;
END;
$function$;

-- ============================================================================
-- 3. FIX reconcile_investor_position
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_fund_id uuid,
  p_investor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calculated_position numeric;
  v_stored_position numeric;
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_diff numeric;
BEGIN
  -- SECURITY: Reconciliation is admin-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reconcile positions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Calculate position from transactions
  -- FIX: Changed from 'FIRST_INVESTMENT','TOP_UP' to just 'DEPOSIT'
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.investor_id = p_investor_id
    AND t.is_voided = false;

  v_calculated_position := v_deposits - v_withdrawals + v_yield;

  -- Get stored position
  SELECT current_balance INTO v_stored_position
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id;

  v_diff := COALESCE(v_calculated_position, 0) - COALESCE(v_stored_position, 0);

  -- Update if different
  IF ABS(v_diff) > 0.01 THEN
    UPDATE investor_positions
    SET current_balance = v_calculated_position,
        updated_at = now()
    WHERE fund_id = p_fund_id
      AND investor_id = p_investor_id;

    IF NOT FOUND THEN
      INSERT INTO investor_positions (fund_id, investor_id, current_balance)
      VALUES (p_fund_id, p_investor_id, v_calculated_position);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'calculated_position', v_calculated_position,
    'stored_position', v_stored_position,
    'difference', v_diff,
    'updated', ABS(v_diff) > 0.01,
    'deposits', v_deposits,
    'withdrawals', v_withdrawals,
    'yield', v_yield
  );
END;
$function$;

-- ============================================================================
-- VERIFICATION: List all functions that might still reference invalid enums
-- ============================================================================
DO $$
DECLARE
  v_count int;
BEGIN
  -- This is informational only - helps identify any remaining issues
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosrc LIKE '%FIRST_INVESTMENT%';

  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: % functions still reference FIRST_INVESTMENT', v_count;
  ELSE
    RAISE NOTICE 'SUCCESS: No functions reference FIRST_INVESTMENT';
  END IF;
END $$;
