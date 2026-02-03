-- Fix: preview_adb_yield_distribution_v3 IB commission calculated on wrong base
-- ============================================================================
-- BUG: Preview calculated IB as percentage of FEE (v_fee_share * ib_rate)
--      Apply v3 calculates IB as percentage of GROSS (v_gross_share * ib_rate)
--
-- This caused preview to show smaller IB and higher net than what apply produces.
-- Example: gross=100, fee=20%, IB=5%
--   Preview (WRONG): IB = 5% of 20 = 1,   net = 100 - 20 = 80
--   Apply (CORRECT):  IB = 5% of 100 = 5,  net = 100 - 20 - 5 = 75
--
-- Changes:
-- 1. IB calculation: fee-based -> gross-based (matches apply_adb_yield_distribution_v3)
-- 2. Net calculation: gross - fee -> gross - fee - ib (matches apply)
-- 3. IB condition: remove v_fee_share > 0 guard (IB applies regardless of fee)
-- 4. Conservation check: include IB in total (gross = net + fees + ib)
-- 5. Platform fees: full fees (IB is separate deduction from gross, not from fee pool)
-- ============================================================================

DROP FUNCTION IF EXISTS preview_adb_yield_distribution_v3(uuid, date, date, numeric, text);

CREATE OR REPLACE FUNCTION preview_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Calculate total ADB
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'total_adb', 0,
      'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance'
    );
  END IF;

  -- Calculate allocations
  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- INDIGO FEES (fees_account) always has 0% fee
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct,
        0
      ) END as fee_pct,
      -- Get IB info from profiles table
      CASE WHEN p.account_type = 'fees_account' THEN NULL
           ELSE p.ib_parent_id
      END as ib_parent_id,
      CASE WHEN p.account_type = 'fees_account' THEN 0
           ELSE COALESCE(p.ib_percentage, 0)
      END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);

    -- FIX: IB commission on GROSS (not fee) - matches apply_adb_yield_distribution_v3
    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 THEN
      v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
      -- Get IB parent name for display
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    -- FIX: Net = gross - fee - ib (matches apply_adb_yield_distribution_v3)
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

      -- Track IB summary if commission applies
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
    -- FIX: Platform gets full fees (IB is separate deduction from gross, not from fee pool)
    'platform_fees', v_total_fees,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    -- FIX: Conservation check includes IB (gross = net + fees + ib)
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < v_dust_tolerance,
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fees_account_0pct', 'ib_commission']
  );
END;
$$;

GRANT EXECUTE ON FUNCTION preview_adb_yield_distribution_v3(uuid, date, date, numeric, text) TO authenticated;

COMMENT ON FUNCTION preview_adb_yield_distribution_v3 IS
'Preview ADB yield distribution. FIXED: IB commission now calculated on GROSS (not fee) to match apply_adb_yield_distribution_v3. Conservation check includes IB.';
