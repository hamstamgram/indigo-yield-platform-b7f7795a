-- Migration: Allow zero yield distributions for record-keeping
-- Created: 2026-01-21
--
-- This migration fixes an issue where the platform rejected 0% yield months.
-- Zero yield is a valid scenario (fund performance was flat) and should be
-- allowed for record-keeping purposes.
--
-- Changes:
-- 1. preview_adb_yield_distribution_v3: Include allocations even when yield = 0
-- 2. apply_adb_yield_distribution: Allow p_gross_yield_amount = 0 (only reject negative)

-- ============================================================================
-- FIX 1: preview_adb_yield_distribution_v3 - handle zero yield months
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_is_zero_yield boolean;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if this is a zero yield month (allows record-keeping for 0% months)
  v_is_zero_yield := (p_gross_yield_amount = 0);

  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'total_adb', 0, 'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance',
      'is_zero_yield', v_is_zero_yield
    );
  END IF;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct, 0
      ) END as fee_pct,
      CASE WHEN p.account_type = 'fees_account' THEN NULL ELSE p.ib_parent_id END as ib_parent_id,
      CASE WHEN p.account_type = 'fees_account' THEN 0 ELSE COALESCE(p.ib_percentage, 0) END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;

    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 AND v_fee_share > 0 THEN
      v_ib_share := ROUND((v_fee_share * v_investor.ib_rate / 100)::numeric, 8);
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    -- FIX: Include allocations for zero yield months (for record-keeping)
    -- Only apply dust tolerance for non-zero yield months
    IF v_gross_share >= v_dust_tolerance OR v_is_zero_yield THEN
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
          'source_fee', v_fee_share
        );
      END IF;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'fund_id', p_fund_id, 'fund_code', v_fund.code, 'fund_asset', v_fund.asset,
    'period_start', p_period_start, 'period_end', p_period_end,
    'days_in_period', p_period_end - p_period_start + 1,
    'total_adb', v_total_adb, 'gross_yield_amount', p_gross_yield_amount,
    'gross_yield', v_total_gross, 'net_yield', v_total_net,
    'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'platform_fees', v_total_fees - v_total_ib,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations, 'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < v_dust_tolerance OR v_is_zero_yield,
    'calculation_method', 'adb_v3',
    'is_zero_yield', v_is_zero_yield,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fees_account_0pct', 'ib_commission', 'zero_yield_support']
  );
END;
$function$;


-- ============================================================================
-- FIX 2: apply_adb_yield_distribution - allow zero yield for record-keeping
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_adb_yield_distribution(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'month_end'::text,
  p_dust_tolerance numeric DEFAULT 0.01
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_ib_allocation_id uuid;
  v_platform_fee_amount numeric;
  v_is_zero_yield boolean;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- FIX: Allow zero yield for record-keeping, only reject negative
  IF p_gross_yield_amount < 0 THEN
    RAISE EXCEPTION 'Gross yield amount cannot be negative. Use 0 for zero yield months.';
  END IF;

  v_is_zero_yield := (p_gross_yield_amount = 0);

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  IF p_period_end > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot distribute yield for future dates. Period end (%) is after today (%)', p_period_end, CURRENT_DATE;
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_lock_key := ('x' || substr(md5(p_fund_id::text || p_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = p_period_end AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, p_period_end;
  END IF;

  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  -- Create distribution record (even for zero yield months for record-keeping)
  INSERT INTO yield_distributions (
    fund_id, yield_date, period_start, period_end, gross_yield_amount,
    net_yield, total_fees, total_ib, status, created_by, calculation_method, purpose
  ) VALUES (
    p_fund_id, p_period_end, p_period_start, p_period_end, p_gross_yield_amount,
    0, 0, 0, 'applied'::yield_distribution_status, v_admin, 'ADB', p_purpose
  ) RETURNING id INTO v_distribution_id;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.first_name || ' ' || p.last_name as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct, 0
      ) END as fee_pct,
      CASE WHEN p.account_type = 'fees_account' THEN NULL ELSE p.ib_parent_id END as ib_parent_id,
      CASE WHEN p.account_type = 'fees_account' THEN 0 ELSE COALESCE(p.ib_percentage, 0) END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;

    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 AND v_fee_share > 0 THEN
      v_ib_share := ROUND((v_fee_share * v_investor.ib_rate / 100)::numeric, 8);
    ELSE
      v_ib_share := 0;
    END IF;

    -- FIX: For zero yield months, still create allocation records (with 0 values) for record-keeping
    -- Only skip for non-zero yield when below dust tolerance
    IF v_gross_share < p_dust_tolerance AND NOT v_is_zero_yield THEN
      CONTINUE;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, fee_pct, ib_amount, adb_share, created_at
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id, v_gross_share, v_net_share,
      v_fee_share, v_investor.fee_pct, v_ib_share, v_investor.adb, NOW()
    );

    -- Only create YIELD transaction if there's actual yield to distribute
    IF v_net_share != 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, value_date,
        reference_id, notes, created_by, is_voided, source, distribution_id, created_at
      ) VALUES (
        v_investor.investor_id, p_fund_id, 'YIELD', v_fund.asset, v_net_share,
        p_period_end, p_period_end,
        'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        CASE WHEN v_is_zero_yield
          THEN '0% yield month - ADB record for period ' || p_period_start::text || ' to ' || p_period_end::text
          ELSE 'ADB yield distribution for period ' || p_period_start::text || ' to ' || p_period_end::text
        END,
        v_admin, false, 'rpc', v_distribution_id, NOW()
      );

      UPDATE investor_positions
      SET current_value = current_value + v_net_share, updated_at = NOW()
      WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;
    END IF;

    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount,
        effective_date, asset, created_at, created_by, is_voided
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, v_investor.investor_name,
        v_gross_share, v_investor.fee_pct, v_fee_share,
        p_period_end, v_fund.asset, NOW(), v_admin, false
      );
    END IF;

    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        ib_percentage, ib_fee_amount, source_net_income, is_voided, created_at
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.ib_parent_id, v_investor.investor_id,
        v_investor.ib_rate, v_ib_share, v_net_share, false, NOW()
      ) RETURNING id INTO v_ib_allocation_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, value_date,
        reference_id, notes, created_by, is_voided, source, distribution_id, created_at
      ) VALUES (
        v_investor.ib_parent_id, p_fund_id, 'IB_CREDIT', v_fund.asset, v_ib_share,
        p_period_end, p_period_end,
        'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        'IB commission (' || v_investor.ib_rate || '%) from ' || v_investor.investor_name || ' yield',
        v_admin, false, 'rpc', v_distribution_id, NOW()
      ) RETURNING id INTO v_ib_tx_id;

      INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
      VALUES (v_investor.ib_parent_id, p_fund_id, v_ib_share, true, NOW())
      ON CONFLICT (investor_id, fund_id)
      DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                    is_active = true, updated_at = NOW();
    END IF;

    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  IF v_total_fees > 0 THEN
    v_platform_fee_amount := v_total_fees - v_total_ib;
    IF v_platform_fee_amount > 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, value_date,
        reference_id, notes, created_by, is_voided, source, distribution_id, created_at
      ) VALUES (
        v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_platform_fee_amount,
        p_period_end, p_period_end,
        'fee_credit_' || v_distribution_id::text,
        'Platform fees from yield distribution for ' || v_fund.code || ' (after IB commissions)',
        v_admin, false, 'rpc', v_distribution_id, NOW()
      ) RETURNING id INTO v_fee_tx_id;

      INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
      VALUES (v_indigo_fees_id, p_fund_id, v_platform_fee_amount, true, NOW())
      ON CONFLICT (investor_id, fund_id)
      DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                    is_active = true, updated_at = NOW();
    END IF;
  END IF;

  UPDATE yield_distributions
  SET net_yield = v_total_net, total_fees = v_total_fees, total_fee_amount = v_total_fees,
      total_net_amount = v_total_net, total_ib = v_total_ib, total_ib_amount = v_total_ib,
      allocation_count = v_allocation_count, gross_yield = v_total_gross
  WHERE id = v_distribution_id;

  RETURN jsonb_build_object(
    'success', true, 'distribution_id', v_distribution_id, 'fund_id', p_fund_id,
    'period_start', p_period_start, 'period_end', p_period_end, 'total_adb', v_total_adb,
    'gross_yield', p_gross_yield_amount, 'allocated_gross', v_total_gross,
    'allocated_net', v_total_net, 'net_yield', v_total_net, 'total_fees', v_total_fees,
    'total_ib', v_total_ib, 'platform_fees', v_total_fees - v_total_ib,
    'allocation_count', v_allocation_count, 'investor_count', v_allocation_count,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < p_dust_tolerance OR v_is_zero_yield,
    'days_in_period', p_period_end - p_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'is_zero_yield', v_is_zero_yield,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'zero_yield_support']
  );
END;
$function$;


-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION preview_adb_yield_distribution_v3 IS
'Preview ADB yield distribution. Supports zero yield months (is_zero_yield=true) for record-keeping purposes.';

COMMENT ON FUNCTION apply_adb_yield_distribution IS
'Apply ADB yield distribution. Supports zero yield months (gross=0) for record-keeping. Rejects negative gross amounts.';
