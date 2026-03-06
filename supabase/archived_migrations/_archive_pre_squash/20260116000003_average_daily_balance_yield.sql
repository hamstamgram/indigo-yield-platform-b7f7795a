-- ============================================================================
-- Phase 4: Average Daily Balance Yield Calculation
-- Date: 2026-01-16
-- Purpose: Fair mid-month deposit handling using time-weighted balances
-- ============================================================================
--
-- PROBLEM: Point-in-time balance gives same yield rate to someone who deposited
--          on day 1 vs day 15 of a 30-day period.
--
-- SOLUTION: Calculate average daily balance over the yield period:
--   avg_daily_balance = SUM(balance * days_at_balance) / total_days
--
-- This function computes time-weighted balances and allocates yield proportionally.
-- ============================================================================

BEGIN;

-- Helper function: Calculate average daily balance for an investor in a period
CREATE OR REPLACE FUNCTION public.calc_avg_daily_balance(
  p_investor_id uuid,
  p_fund_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS numeric(28,10)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_weighted_sum numeric(28,10) := 0;
  v_total_days integer;
  v_running_balance numeric(28,10) := 0;
  v_last_date date;
  v_tx record;
BEGIN
  v_total_days := (p_period_end - p_period_start) + 1;
  IF v_total_days <= 0 THEN
    RETURN 0;
  END IF;

  -- Get opening balance (all transactions before period start)
  SELECT COALESCE(SUM(
    CASE
      WHEN type::text IN ('DEPOSIT', 'INTEREST', 'ADJUSTMENT') THEN amount
      WHEN type::text IN ('WITHDRAWAL', 'FEE') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_running_balance
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND tx_date < p_period_start
    AND is_voided = false;

  v_last_date := p_period_start;

  -- Process each transaction in the period
  FOR v_tx IN
    SELECT tx_date, type, amount
    FROM transactions_v2
    WHERE investor_id = p_investor_id
      AND fund_id = p_fund_id
      AND tx_date >= p_period_start
      AND tx_date <= p_period_end
      AND is_voided = false
    ORDER BY tx_date, created_at
  LOOP
    -- Add weighted balance for days from last_date to this tx_date
    IF v_tx.tx_date > v_last_date THEN
      v_weighted_sum := v_weighted_sum + (v_running_balance * (v_tx.tx_date - v_last_date));
      v_last_date := v_tx.tx_date;
    END IF;

    -- Update running balance
    IF v_tx.type::text IN ('DEPOSIT', 'INTEREST', 'ADJUSTMENT') THEN
      v_running_balance := v_running_balance + v_tx.amount;
    ELSIF v_tx.type::text IN ('WITHDRAWAL', 'FEE') THEN
      v_running_balance := v_running_balance - ABS(v_tx.amount);
    END IF;
  END LOOP;

  -- Add remaining days after last transaction
  IF p_period_end >= v_last_date THEN
    v_weighted_sum := v_weighted_sum + (v_running_balance * ((p_period_end - v_last_date) + 1));
  END IF;

  RETURN v_weighted_sum / v_total_days;
END;
$$;

COMMENT ON FUNCTION calc_avg_daily_balance(uuid, uuid, date, date) IS
  'Calculate average daily balance for an investor over a period. Used for fair mid-month deposit yield allocation.';

-- Preview function for average daily balance yield distribution
CREATE OR REPLACE FUNCTION public.preview_adb_yield(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund_code text;
  v_fund_asset text;
  v_total_adb numeric(28,10) := 0;
  v_investor_count integer := 0;
  v_distributions jsonb := '[]'::jsonb;
  v_inv record;
  v_adb numeric(28,10);
  v_ownership_pct numeric(28,10);
  v_gross numeric(28,10);
  v_fee_pct numeric(28,10);
  v_fee numeric(28,10);
  v_ib_pct numeric(28,10);
  v_ib numeric(28,10);
  v_net numeric(28,10);
BEGIN
  -- Get fund info
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Calculate total average daily balance for all investors
  FOR v_inv IN
    SELECT DISTINCT ip.investor_id
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
  LOOP
    v_adb := calc_avg_daily_balance(v_inv.investor_id, p_fund_id, p_period_start, p_period_end);
    IF v_adb > 0 THEN
      v_total_adb := v_total_adb + v_adb;
    END IF;
  END LOOP;

  IF v_total_adb = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'fund_code', v_fund_code,
      'fund_asset', v_fund_asset,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'gross_yield', p_gross_yield_amount,
      'total_avg_daily_balance', 0,
      'investor_count', 0,
      'distributions', '[]'::jsonb,
      'message', 'No eligible investors with positive average daily balance'
    );
  END IF;

  -- Calculate per-investor distributions
  FOR v_inv IN
    SELECT
      ip.investor_id,
      p.email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) AS investor_name,
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id
           AND ifs.fund_id = p_fund_id
           AND p_period_end >= ifs.effective_date
           AND (ifs.end_date IS NULL OR p_period_end <= ifs.end_date)
         ORDER BY ifs.effective_date DESC LIMIT 1),
        20
      ) AS fee_pct,
      COALESCE(p.ib_percentage, 0) AS ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
  LOOP
    v_adb := calc_avg_daily_balance(v_inv.investor_id, p_fund_id, p_period_start, p_period_end);
    IF v_adb <= 0 THEN
      CONTINUE;
    END IF;

    v_investor_count := v_investor_count + 1;
    v_ownership_pct := (v_adb / v_total_adb) * 100;
    v_gross := p_gross_yield_amount * (v_ownership_pct / 100);

    -- Handle negative yield
    IF v_gross <= 0 THEN
      v_fee := 0;
      v_ib := 0;
      v_net := v_gross;
      v_fee_pct := 0;
      v_ib_pct := 0;
    ELSE
      v_fee_pct := COALESCE(v_inv.fee_pct, 20);
      v_fee := v_gross * (v_fee_pct / 100);
      v_ib_pct := COALESCE(v_inv.ib_pct, 0);
      v_ib := v_gross * (v_ib_pct / 100);
      v_net := v_gross - v_fee - v_ib;
    END IF;

    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_inv.investor_id,
      'investor_name', v_inv.investor_name,
      'avg_daily_balance', ROUND(v_adb, 10),
      'ownership_pct', ROUND(v_ownership_pct, 6),
      'gross_yield', ROUND(v_gross, 10),
      'fee_pct', v_fee_pct,
      'fee_amount', ROUND(v_fee, 10),
      'ib_pct', v_ib_pct,
      'ib_amount', ROUND(v_ib, 10),
      'net_yield', ROUND(v_net, 10)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_code', v_fund_code,
    'fund_asset', v_fund_asset,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'period_days', (p_period_end - p_period_start) + 1,
    'gross_yield', p_gross_yield_amount,
    'total_avg_daily_balance', ROUND(v_total_adb, 10),
    'investor_count', v_investor_count,
    'distributions', v_distributions
  );
END;
$$;

COMMENT ON FUNCTION preview_adb_yield(uuid, date, date, numeric, text) IS
  'Preview yield distribution using Average Daily Balance method. Fair for mid-month deposits.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION calc_avg_daily_balance(uuid, uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_adb_yield(uuid, date, date, numeric, text) TO authenticated;

COMMIT;
