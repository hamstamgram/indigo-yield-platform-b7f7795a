-- ============================================================================
-- COMPREHENSIVE SCHEMA FIX MIGRATION
-- ============================================================================
-- Fixes ALL known schema mismatches between SQL functions and actual tables:
-- 1. yield_date column doesn't exist in yield_distributions (use effective_date)
-- 2. Invalid tx_type enum references (FIRST_INVESTMENT, TOP_UP)
-- 3. Column name inconsistencies
-- ============================================================================

-- ============================================================================
-- STEP 1: Add yield_date column to yield_distributions as alias
-- This is the safest approach - backward compatible with all functions
-- ============================================================================

-- First check if yield_date column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yield_distributions'
    AND column_name = 'yield_date'
    AND table_schema = 'public'
  ) THEN
    -- Add yield_date column that mirrors effective_date
    ALTER TABLE public.yield_distributions
    ADD COLUMN yield_date date;

    -- Populate from effective_date if it exists
    UPDATE public.yield_distributions
    SET yield_date = effective_date
    WHERE yield_date IS NULL AND effective_date IS NOT NULL;

    -- Or populate from period_start if effective_date doesn't exist
    UPDATE public.yield_distributions
    SET yield_date = period_start
    WHERE yield_date IS NULL AND period_start IS NOT NULL;

    RAISE NOTICE 'Added yield_date column to yield_distributions';
  ELSE
    RAISE NOTICE 'yield_date column already exists';
  END IF;
END $$;

-- Create index on yield_date for performance
CREATE INDEX IF NOT EXISTS idx_yield_distributions_yield_date
ON public.yield_distributions(yield_date);

-- ============================================================================
-- STEP 2: Fix preview_daily_yield_to_fund_v3 function
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

  -- Opening AUM is AS-OF balances at p_yield_date
  -- FIX: Use only valid tx_type enum values (DEPOSIT, not FIRST_INVESTMENT/TOP_UP)
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
      -- FIX: Use COALESCE to handle both yield_date and effective_date
      AND COALESCE(yd.yield_date, yd.effective_date, yd.period_start) < p_yield_date
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
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Check for existing distributions on same date
  -- FIX: Use COALESCE to handle both yield_date and effective_date
  SELECT array_agg(yd.id::text)
  INTO v_existing_conflicts
  FROM yield_distributions yd
  WHERE yd.fund_id = p_fund_id
    AND COALESCE(yd.yield_date, yd.effective_date, yd.period_start) = p_yield_date
    AND yd.is_voided = false;

  -- AS-OF investor balances
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
        -- FIX: Use COALESCE for flexible column access
        AND COALESCE(yd.yield_date, yd.effective_date, yd.period_start) < p_yield_date
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
      COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') AS investor_name,
      b.balance AS current_balance,
      COALESCE(p.fee_pct, 20) AS fee_percentage,
      p.ib_parent_id,
      (SELECT COALESCE(p2.first_name || ' ' || p2.last_name, 'Unknown') FROM profiles p2 WHERE p2.id = p.ib_parent_id) AS ib_parent_name,
      COALESCE(p.ib_percentage, 0) AS ib_percentage
    FROM balances b
    JOIN profiles p ON p.id = b.investor_id
    WHERE b.balance > 0
      AND p.account_type = 'investor'
    ORDER BY b.balance DESC
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Allocation percentage
    v_inv_pct := (v_inv.current_balance / v_opening_aum) * 100;

    -- Gross yield for this investor
    v_inv_gross := v_gross_yield * (v_inv.current_balance / v_opening_aum);

    -- Fee calculation
    v_fee_pct := COALESCE(v_inv.fee_percentage, 20);

    -- Only charge fees on positive yield
    IF v_inv_gross > 0 THEN
      v_inv_fee := v_inv_gross * (v_fee_pct / 100);
    ELSE
      v_inv_fee := 0;
    END IF;

    -- IB commission (only on positive yield)
    v_ib_pct := COALESCE(v_inv.ib_percentage, 0);
    IF v_inv_gross > 0 AND v_ib_pct > 0 THEN
      v_ib_amount := v_inv_gross * (v_ib_pct / 100);
    ELSE
      v_ib_amount := 0;
    END IF;

    -- Net yield
    v_inv_net := v_inv_gross - v_inv_fee - v_ib_amount;
    v_inv_new_balance := v_inv.current_balance + v_inv_net;

    -- Calculate Indigo's portion (fee minus IB commission)
    v_indigo_fee := v_inv_fee - v_ib_amount;

    -- Accumulate totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_ib_fees := v_total_ib_fees + v_ib_amount;
    v_total_net := v_total_net + v_inv_net;
    v_indigo_fees_credit := v_indigo_fees_credit + v_indigo_fee;

    -- Build distribution record
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'currentBalance', v_inv.current_balance,
      'allocationPct', v_inv_pct,
      'grossYield', v_inv_gross,
      'feePct', v_fee_pct,
      'feeAmount', v_inv_fee,
      'ibPct', v_ib_pct,
      'ibAmount', v_ib_amount,
      'netYield', v_inv_net,
      'newBalance', v_inv_new_balance
    );

    -- IB credit record (if applicable)
    IF v_ib_amount > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibId', v_inv.ib_parent_id,
        'ibName', v_inv.ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'grossYield', v_inv_gross,
        'ibPct', v_ib_pct,
        'ibAmount', v_ib_amount
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
    'existingConflicts', COALESCE(v_existing_conflicts, ARRAY[]::text[]),
    'hasConflicts', COALESCE(array_length(v_existing_conflicts, 1), 0) > 0,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ibFees', v_total_ib_fees,
      'net', v_total_net,
      'indigoCredit', v_indigo_fees_credit
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$function$;

-- ============================================================================
-- STEP 3: Create trigger to sync yield_date with effective_date
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_yield_date()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT or UPDATE, sync yield_date with effective_date or period_start
  IF NEW.yield_date IS NULL THEN
    NEW.yield_date := COALESCE(NEW.effective_date, NEW.period_start);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_yield_date ON yield_distributions;
CREATE TRIGGER trg_sync_yield_date
  BEFORE INSERT OR UPDATE ON yield_distributions
  FOR EACH ROW
  EXECUTE FUNCTION sync_yield_date();

-- ============================================================================
-- STEP 4: Backfill yield_date for existing records
-- ============================================================================
UPDATE yield_distributions
SET yield_date = COALESCE(effective_date, period_start)
WHERE yield_date IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_null_count int;
  v_total_count int;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM yield_distributions;
  SELECT COUNT(*) INTO v_null_count FROM yield_distributions WHERE yield_date IS NULL;

  IF v_null_count > 0 THEN
    RAISE WARNING 'yield_distributions has % records with NULL yield_date out of % total', v_null_count, v_total_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All % yield_distributions records have yield_date populated', v_total_count;
  END IF;
END $$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text) TO service_role;
