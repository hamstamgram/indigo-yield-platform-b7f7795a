-- Fix: Drop conflicting preview_adb_yield_distribution_v3 overload
-- Issue: PostgreSQL cannot resolve between 4-param and 5-param versions
-- Error: "Could not choose the best candidate function between..."

-- ============================================================================
-- Drop the old 4-parameter version (without p_purpose)
-- ============================================================================
DROP FUNCTION IF EXISTS public.preview_adb_yield_distribution_v3(uuid, date, date, numeric);

-- ============================================================================
-- Recreate with single canonical 5-parameter signature
-- The p_purpose parameter has a DEFAULT so it remains backward compatible
-- ============================================================================
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
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        (SELECT gs.setting_value::numeric FROM global_fee_settings gs WHERE gs.setting_key = 'default_fee_pct'),
        0
      ) as fee_pct,
      COALESCE(
        (SELECT iba.commission_rate FROM ib_allocations iba
         WHERE iba.investor_id = ip.investor_id AND iba.fund_id = p_fund_id
         AND iba.is_voided = false
         ORDER BY iba.created_at DESC LIMIT 1),
        0
      ) as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;
    v_ib_share := ROUND((v_fee_share * v_investor.ib_rate)::numeric, 8);

    IF v_gross_share >= v_dust_tolerance THEN
      v_allocations := v_allocations || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_email', v_investor.investor_email,
        'investor_name', v_investor.investor_name,
        'adb', v_investor.adb,
        'adb_share_pct', ROUND((v_investor.adb / v_total_adb * 100)::numeric, 4),
        'gross_yield', v_gross_share,
        'fee_pct', v_investor.fee_pct,
        'fee_amount', v_fee_share,
        'net_yield', v_net_share,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share
      );

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
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < v_dust_tolerance,
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward']
  );
END;
$$;

GRANT EXECUTE ON FUNCTION preview_adb_yield_distribution_v3(uuid, date, date, numeric, text) TO authenticated;

COMMENT ON FUNCTION preview_adb_yield_distribution_v3(uuid, date, date, numeric, text) IS
'Preview ADB yield distribution. Returns per-investor breakdown with time-weighted allocations.
Single canonical signature with p_purpose DEFAULT. No database writes.';
