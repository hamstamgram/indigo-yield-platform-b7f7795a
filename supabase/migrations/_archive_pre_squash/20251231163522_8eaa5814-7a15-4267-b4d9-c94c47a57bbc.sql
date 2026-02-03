-- ============================================================================
-- PHASE 7: Enable INDIGO FEES Yield Participation
-- INDIGO FEES should earn yield on its accumulated fee balances ("compound in fund")
-- ============================================================================

-- ============================================================================
-- Step 1: Fix trigger that references wrong column name
-- The column is fee_pct, not fee_percentage
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_fees_account_zero_fee()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ensure fees_account always has fee_pct = 0
  IF NEW.account_type = 'fees_account' AND COALESCE(NEW.fee_pct, 0) != 0 THEN
    NEW.fee_pct := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Step 2: Ensure INDIGO FEES profile has correct settings
-- fee_pct = 0 (no fees on itself)
-- ib_parent_id = NULL (no IB commissions)
-- ============================================================================
UPDATE profiles
SET 
  fee_pct = 0,
  ib_parent_id = NULL,
  ib_percentage = 0
WHERE id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';

-- ============================================================================
-- Step 3: Update preview_daily_yield_to_fund_v2 to INCLUDE INDIGO FEES
-- Remove the exclusion from AUM calculation and investor loop
-- ============================================================================
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);

CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_yield numeric,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund RECORD;
  v_current_aum numeric;
  v_investor RECORD;
  v_investor_rows jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_net numeric := 0;
  v_investor_count integer := 0;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current AUM from investor positions (NOW INCLUDES INDIGO FEES)
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id 
    AND current_value > 0;
    -- REMOVED: AND investor_id != v_indigo_fees_id

  IF v_current_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for fund');
  END IF;

  -- Loop through each investor with a position (NOW INCLUDES INDIGO FEES)
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') as investor_name,
      ip.current_value,
      CASE 
        WHEN v_current_aum > 0 THEN ip.current_value / v_current_aum 
        ELSE 0 
      END as allocation_pct,
      p.account_type,
      -- Fee resolution: 
      -- 1. INDIGO FEES always gets 0% fee
      -- 2. investor_fee_schedule
      -- 3. profiles.fee_pct
      -- 4. Default 20%
      CASE 
        WHEN ip.investor_id = v_indigo_fees_id THEN 0
        ELSE COALESCE(
          (SELECT fee_pct FROM investor_fee_schedule ifs 
           WHERE ifs.investor_id = ip.investor_id 
             AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
             AND ifs.effective_date <= p_date
             AND (ifs.end_date IS NULL OR ifs.end_date >= p_date)
           ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
           LIMIT 1),
          COALESCE(p.fee_pct, 20)
        )
      END as fee_pct,
      -- INDIGO FEES has no IB parent
      CASE WHEN ip.investor_id = v_indigo_fees_id THEN NULL ELSE p.ib_parent_id END as ib_parent_id,
      -- INDIGO FEES has no IB percentage
      CASE WHEN ip.investor_id = v_indigo_fees_id THEN 0 ELSE COALESCE(p.ib_percentage, 0) END as ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      -- REMOVED: AND ip.investor_id != v_indigo_fees_id
      AND (p.status IS NULL OR p.status = 'active')
    ORDER BY ip.current_value DESC
  LOOP
    DECLARE
      v_gross numeric;
      v_fee numeric;
      v_ib numeric;
      v_net numeric;
      v_ib_parent_name text;
    BEGIN
      -- Calculate pro-rata gross yield
      v_gross := p_gross_yield * v_investor.allocation_pct;
      
      -- Calculate fee as percentage of gross yield
      v_fee := v_gross * (v_investor.fee_pct / 100);
      
      -- Calculate IB commission from fee (not additional)
      IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_percentage > 0 THEN
        v_ib := v_fee * (v_investor.ib_percentage / 100);
        SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
        FROM profiles WHERE id = v_investor.ib_parent_id;
      ELSE
        v_ib := 0;
        v_ib_parent_name := NULL;
      END IF;
      
      -- Net to investor = gross - fee
      v_net := v_gross - v_fee;
      
      -- Accumulate totals
      v_total_gross := v_total_gross + v_gross;
      v_total_fees := v_total_fees + v_fee;
      v_total_ib := v_total_ib + v_ib;
      v_total_net := v_total_net + v_net;
      v_investor_count := v_investor_count + 1;
      
      -- Add to results
      v_investor_rows := v_investor_rows || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'current_value', v_investor.current_value,
        'allocation_pct', v_investor.allocation_pct,
        'fee_pct', v_investor.fee_pct,
        'gross_yield', v_gross,
        'fee_amount', v_fee,
        'ib_amount', v_ib,
        'net_yield', v_net,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_percentage', v_investor.ib_percentage,
        'is_fees_account', v_investor.investor_id = v_indigo_fees_id
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_asset', v_fund.asset,
    'effective_date', p_date,
    'purpose', p_purpose::text,
    'current_aum', v_current_aum,
    'gross_yield', p_gross_yield,
    'total_gross', v_total_gross,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'total_net', v_total_net,
    'platform_fees', v_total_fees - v_total_ib,
    'investor_count', v_investor_count,
    'investors', v_investor_rows,
    'indigo_fees_included', true
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose) TO authenticated;

-- ============================================================================
-- Step 4: Recompute INDIGO FEES positions to fix zero balances
-- This ensures current_value matches the sum of non-voided transactions
-- ============================================================================
DO $$
DECLARE
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_fund_rec RECORD;
BEGIN
  FOR v_fund_rec IN SELECT id FROM funds
  LOOP
    PERFORM public.recompute_investor_position(v_indigo_fees_id, v_fund_rec.id);
  END LOOP;
END $$;

-- ============================================================================
-- Step 5: Audit log for this change
-- ============================================================================
INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
VALUES (
  'INDIGO_FEES_YIELD_ENABLED',
  'profiles',
  '169bb053-36cb-4f6e-93ea-831f0dfeaf1d',
  NULL,
  jsonb_build_object(
    'fee_pct', 0,
    'ib_parent_id', NULL,
    'ib_percentage', 0,
    'change', 'INDIGO FEES now participates in yield distributions at 0% fee'
  ),
  jsonb_build_object('phase', 'Phase 7', 'reason', 'Enable fee compounding in fund')
);