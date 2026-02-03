-- ============================================================================
-- Fix: Remove invalid enum references from yield functions
-- ============================================================================
-- The tx_type enum does NOT include 'FIRST_INVESTMENT' or 'TOP_UP'.
-- First investments are stored as DEPOSIT with tx_subtype='first_investment'.
-- These invalid references cause "invalid input value for enum" errors.
-- ============================================================================

-- Fix preview_daily_yield_to_fund_v3: Remove FIRST_INVESTMENT/TOP_UP references
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
  -- FIXED: Removed invalid enum values FIRST_INVESTMENT and TOP_UP
  -- First investments are stored as DEPOSIT with tx_subtype='first_investment'
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
      ya.investor_id,
      COALESCE(SUM(ya.net_amount), 0) AS total_yield
    FROM yield_allocations ya
    JOIN yield_distributions yd ON yd.id = ya.distribution_id
    WHERE yd.fund_id = p_fund_id
      AND yd.is_voided = false
      AND yd.yield_date < p_yield_date
    GROUP BY ya.investor_id
  )
  SELECT COALESCE(SUM(
    GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0))
  ), 0)
  INTO v_opening_aum
  FROM tx_summary ts
  LEFT JOIN yield_summary ys ON ys.investor_id = ts.investor_id;

  -- Guard: If opening AUM is 0, can't compute yield
  IF v_opening_aum <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'fundId', p_fund_id,
      'fundCode', v_fund_code,
      'fundAsset', v_fund_asset,
      'yieldDate', p_yield_date,
      'effectiveDate', p_yield_date,
      'purpose', p_purpose,
      'isMonthEnd', v_is_month_end,
      'currentAUM', 0,
      'newAUM', p_new_aum,
      'grossYield', 0,
      'netYield', 0,
      'totalFees', 0,
      'totalIbFees', 0,
      'yieldPercentage', 0,
      'investorCount', 0,
      'distributions', '[]'::jsonb,
      'ibCredits', '[]'::jsonb,
      'indigoFeesCredit', 0,
      'existingConflicts', v_existing_conflicts,
      'hasConflicts', false,
      'totals', jsonb_build_object('gross', 0, 'fees', 0, 'ibFees', 0, 'net', 0, 'indigoCredit', 0)
    );
  END IF;

  v_gross_yield := p_new_aum - v_opening_aum;
  IF v_opening_aum > 0 THEN
    v_yield_pct := (v_gross_yield / v_opening_aum) * 100;
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Get Indigo Fees account
  SELECT i.id INTO v_indigo_fees_id
  FROM investors i
  JOIN profiles p ON p.id = i.profile_id
  WHERE p.email = 'fees@indigowealthgroup.com'
  LIMIT 1;

  -- Check for existing distributions on same date
  SELECT array_agg(yd.id::text)
  INTO v_existing_conflicts
  FROM yield_distributions yd
  WHERE yd.fund_id = p_fund_id
    AND yd.yield_date = p_yield_date
    AND yd.is_voided = false;

  -- AS-OF investor balances (prevents future flows affecting past allocations)
  -- FIXED: Removed invalid enum values FIRST_INVESTMENT and TOP_UP
  FOR v_inv IN
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
        ya.investor_id,
        COALESCE(SUM(ya.net_amount), 0) AS total_yield
      FROM yield_allocations ya
      JOIN yield_distributions yd ON yd.id = ya.distribution_id
      WHERE yd.fund_id = p_fund_id
        AND yd.is_voided = false
        AND yd.yield_date < p_yield_date
      GROUP BY ya.investor_id
    ),
    balances AS (
      SELECT
        ts.investor_id,
        GREATEST(0, COALESCE(ts.deposits, 0) - COALESCE(ts.withdrawals, 0) + COALESCE(ys.total_yield, 0)) AS balance
      FROM tx_summary ts
      LEFT JOIN yield_summary ys ON ys.investor_id = ts.investor_id
    )
    SELECT
      b.investor_id,
      COALESCE(p.full_name, 'Unknown') AS investor_name,
      COALESCE(inv.account_type, 'standard') AS account_type,
      b.balance AS current_balance,
      COALESCE(fs.fee_percentage, 0) AS fee_percentage,
      inv.ib_parent_id,
      (SELECT COALESCE(p2.full_name, 'Unknown') FROM profiles p2 JOIN investors i2 ON i2.profile_id = p2.id WHERE i2.id = inv.ib_parent_id) AS ib_parent_name,
      COALESCE(inv.ib_commission_rate, 0) AS ib_percentage
    FROM balances b
    JOIN investors inv ON inv.id = b.investor_id
    JOIN profiles p ON p.id = inv.profile_id
    LEFT JOIN fee_schedules fs ON fs.investor_id = b.investor_id AND fs.fund_id = p_fund_id
    WHERE b.balance > 0
    ORDER BY b.balance DESC
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Allocation percentage
    v_inv_pct := (v_inv.current_balance / v_opening_aum) * 100;

    -- Gross yield for this investor
    v_inv_gross := v_gross_yield * (v_inv.current_balance / v_opening_aum);

    -- Fee calculation (only if positive yield)
    IF v_inv_gross > 0 THEN
      v_fee_pct := COALESCE(v_inv.fee_percentage, 0);
      v_inv_fee := v_inv_gross * (v_fee_pct / 100);
    ELSE
      v_fee_pct := 0;
      v_inv_fee := 0;
    END IF;

    v_inv_net := v_inv_gross - v_inv_fee;
    v_inv_new_balance := v_inv.current_balance + v_inv_net;

    -- IB calculation (only if positive yield and has IB parent)
    v_ib_parent_id := v_inv.ib_parent_id;
    v_ib_parent_name := v_inv.ib_parent_name;
    v_ib_pct := COALESCE(v_inv.ib_percentage, 0);
    IF v_inv_gross > 0 AND v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      v_ib_amount := v_inv_gross * (v_ib_pct / 100);
    ELSE
      v_ib_amount := 0;
    END IF;

    -- Indigo fee (fee minus IB)
    v_indigo_fee := GREATEST(0, v_inv_fee - v_ib_amount);

    -- Would skip?
    v_would_skip := (abs(v_inv_net) < 0.01);

    -- Reference ID
    v_reference_id := v_fund_code || '-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || v_investor_count;

    -- Track totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_ib_fees := v_total_ib_fees + v_ib_amount;
    v_total_net := v_total_net + v_inv_net;
    v_indigo_fees_credit := v_indigo_fees_credit + v_indigo_fee;

    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', round(v_inv.current_balance, 2),
      'allocationPercentage', round(v_inv_pct, 4),
      'feePercentage', round(v_fee_pct, 4),
      'grossYield', round(v_inv_gross, 2),
      'feeAmount', round(v_inv_fee, 2),
      'netYield', round(v_inv_net, 2),
      'newBalance', round(v_inv_new_balance, 2),
      'positionDelta', round(v_inv_net, 2),
      'ibParentId', v_ib_parent_id,
      'ibParentName', v_ib_parent_name,
      'ibPercentage', round(v_ib_pct, 4),
      'ibAmount', round(v_ib_amount, 2),
      'referenceId', v_reference_id,
      'wouldSkip', v_would_skip
    );

    -- Add IB credit if applicable
    IF v_ib_amount > 0 AND v_ib_parent_id IS NOT NULL THEN
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_ib_parent_id,
        'ibInvestorName', v_ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', round(v_ib_amount, 2),
        'ibPercentage', round(v_ib_pct, 4),
        'source', 'yield',
        'referenceId', v_reference_id || '-IB',
        'wouldSkip', v_would_skip
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fundId', p_fund_id,
    'fundCode', v_fund_code,
    'fundAsset', v_fund_asset,
    'yieldDate', p_yield_date,
    'effectiveDate', p_yield_date,
    'purpose', p_purpose,
    'isMonthEnd', v_is_month_end,
    'currentAUM', round(v_opening_aum, 2),
    'newAUM', round(p_new_aum, 2),
    'grossYield', round(v_gross_yield, 2),
    'netYield', round(v_total_net, 2),
    'totalFees', round(v_total_fees, 2),
    'totalIbFees', round(v_total_ib_fees, 2),
    'yieldPercentage', round(v_yield_pct, 4),
    'investorCount', v_investor_count,
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', round(v_indigo_fees_credit, 2),
    'indigoFeesId', v_indigo_fees_id,
    'existingConflicts', v_existing_conflicts,
    'hasConflicts', (array_length(v_existing_conflicts, 1) > 0),
    'totals', jsonb_build_object(
      'gross', round(v_gross_yield, 2),
      'fees', round(v_total_fees, 2),
      'ibFees', round(v_total_ib_fees, 2),
      'net', round(v_total_net, 2),
      'indigoCredit', round(v_indigo_fees_credit, 2)
    )
  );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) TO service_role;

-- Also fix apply_daily_yield_to_fund_v3 with the same pattern
-- (This function also has the same invalid enum references)
