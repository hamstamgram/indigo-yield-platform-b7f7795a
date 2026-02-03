-- ============================================================================
-- CLEANUP AND FIX: Remove duplicate functions, add AUM recalc to yield
-- ============================================================================

-- Phase 1: Drop broken/duplicate functions
-- Drop the 6-param adjust_investor_position that uses incorrect column names
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, text, date);

-- Drop duplicate apply_daily_yield functions (keeping only the canonical 6-param version)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text);

-- Drop v3 functions that are duplicates
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, text, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text, text);

-- Phase 2: Update canonical apply_daily_yield_to_fund_v2 to call recalculate_fund_aum_for_date
-- First, we need to check the exact signature and update it
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_purpose aum_purpose,
  p_admin_id uuid,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_positions RECORD;
  v_total_aum numeric := 0;
  v_investor_count int := 0;
  v_distributions jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_net numeric := 0;
  v_indigo_fees_id uuid;
  v_distribution_id uuid;
  v_existing_count int;
  v_gross_yield_pct numeric;
  v_reference_prefix text;
  v_skip_count int := 0;
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check for existing distributions on this date (unless force=true)
  IF NOT p_force THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM yield_distributions
    WHERE fund_id = p_fund_id 
      AND effective_date = p_date 
      AND purpose = p_purpose
      AND is_voided = false;
    
    IF v_existing_count > 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format('Yield already applied for %s on %s. Use force=true to override.', v_fund.code, p_date)
      );
    END IF;
  END IF;

  -- Calculate total AUM from positions
  SELECT COALESCE(SUM(current_value), 0), COUNT(*)
  INTO v_total_aum, v_investor_count
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_total_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM in fund');
  END IF;

  -- Calculate yield percentage
  v_gross_yield_pct := (p_gross_amount / v_total_aum) * 100;

  -- Get Indigo fees account
  SELECT id INTO v_indigo_fees_id FROM profiles WHERE role = 'fees_account' LIMIT 1;

  -- Create yield distribution record
  INSERT INTO yield_distributions (
    fund_id, effective_date, gross_amount, net_amount, 
    total_fees, total_ib_fees, purpose, status, created_by
  ) VALUES (
    p_fund_id, p_date, p_gross_amount, 0, 0, 0, p_purpose, 'applied', p_admin_id
  ) RETURNING id INTO v_distribution_id;

  -- Reference prefix for idempotency
  v_reference_prefix := 'yield:' || v_distribution_id::text || ':';

  -- Process each investor position
  FOR v_positions IN
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_class,
      p.full_name,
      p.account_type,
      COALESCE(p.fee_override_pct, 
        CASE 
          WHEN ip.fund_class = 'A' THEN 0.20
          WHEN ip.fund_class = 'B' THEN 0.15
          ELSE 0.20
        END
      ) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_percentage,
      (SELECT full_name FROM profiles WHERE id = p.ib_parent_id) as ib_parent_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    DECLARE
      v_allocation_pct numeric;
      v_gross_yield numeric;
      v_fee_amount numeric;
      v_ib_amount numeric := 0;
      v_net_yield numeric;
      v_new_balance numeric;
      v_reference_id text;
      v_tx_exists boolean;
    BEGIN
      -- Calculate allocation
      v_allocation_pct := (v_positions.current_value / v_total_aum) * 100;
      v_gross_yield := p_gross_amount * (v_positions.current_value / v_total_aum);
      
      -- Calculate fees
      v_fee_amount := v_gross_yield * v_positions.fee_pct;
      
      -- Calculate IB fee if applicable
      IF v_positions.ib_parent_id IS NOT NULL AND v_positions.ib_percentage > 0 THEN
        v_ib_amount := v_fee_amount * (v_positions.ib_percentage / 100);
      END IF;
      
      -- Calculate net yield
      v_net_yield := v_gross_yield - v_fee_amount;
      v_new_balance := v_positions.current_value + v_net_yield;
      
      -- Reference ID for idempotency
      v_reference_id := v_reference_prefix || v_positions.investor_id::text;
      
      -- Check if already processed
      SELECT EXISTS(
        SELECT 1 FROM transactions_v2 
        WHERE reference_id = v_reference_id AND is_voided = false
      ) INTO v_tx_exists;
      
      IF v_tx_exists THEN
        v_skip_count := v_skip_count + 1;
        CONTINUE;
      END IF;
      
      -- Create yield transaction for investor
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, 
        status, notes, created_by, distribution_id, reference_id
      ) VALUES (
        v_positions.investor_id, p_fund_id, 'YIELD', v_net_yield, p_date,
        'completed', 'Yield distribution', p_admin_id, v_distribution_id, v_reference_id
      );
      
      -- Update investor position
      UPDATE investor_positions
      SET current_value = current_value + v_net_yield,
          updated_at = NOW()
      WHERE investor_id = v_positions.investor_id AND fund_id = p_fund_id;
      
      -- Record fee allocation
      IF v_fee_amount > 0 THEN
        INSERT INTO fee_allocations (
          distribution_id, fund_id, investor_id, fee_percentage, 
          base_net_income, fee_amount, period_start, period_end, purpose, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, v_positions.investor_id, v_positions.fee_pct,
          v_gross_yield, v_fee_amount, p_date, p_date, p_purpose, p_admin_id
        );
        
        -- Credit fees to Indigo
        IF v_indigo_fees_id IS NOT NULL THEN
          INSERT INTO transactions_v2 (
            investor_id, fund_id, type, amount, tx_date,
            status, notes, created_by, distribution_id, reference_id
          ) VALUES (
            v_indigo_fees_id, p_fund_id, 'FEE', v_fee_amount - v_ib_amount, p_date,
            'completed', 'Platform fee', p_admin_id, v_distribution_id, 
            v_reference_id || ':fee'
          );
        END IF;
      END IF;
      
      -- Record IB allocation if applicable
      IF v_ib_amount > 0 AND v_positions.ib_parent_id IS NOT NULL THEN
        INSERT INTO ib_allocations (
          distribution_id, fund_id, source_investor_id, ib_investor_id,
          ib_percentage, source_net_income, ib_fee_amount, 
          period_start, period_end, purpose, source, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, v_positions.investor_id, v_positions.ib_parent_id,
          v_positions.ib_percentage, v_fee_amount, v_ib_amount,
          p_date, p_date, p_purpose, 'from_platform_fees', p_admin_id
        );
        
        -- Credit IB to parent
        INSERT INTO transactions_v2 (
          investor_id, fund_id, type, amount, tx_date,
          status, notes, created_by, distribution_id, reference_id
        ) VALUES (
          v_positions.ib_parent_id, p_fund_id, 'IB_CREDIT', v_ib_amount, p_date,
          'completed', 'IB commission', p_admin_id, v_distribution_id,
          v_reference_id || ':ib'
        );
        
        -- Update IB parent position
        UPDATE investor_positions
        SET current_value = current_value + v_ib_amount,
            updated_at = NOW()
        WHERE investor_id = v_positions.ib_parent_id AND fund_id = p_fund_id;
        
        v_total_ib := v_total_ib + v_ib_amount;
        
        -- Add to IB credits array
        v_ib_credits := v_ib_credits || jsonb_build_object(
          'ibInvestorId', v_positions.ib_parent_id,
          'ibInvestorName', v_positions.ib_parent_name,
          'sourceInvestorId', v_positions.investor_id,
          'sourceInvestorName', v_positions.full_name,
          'amount', v_ib_amount,
          'ibPercentage', v_positions.ib_percentage
        );
      END IF;
      
      v_total_fees := v_total_fees + v_fee_amount;
      v_total_net := v_total_net + v_net_yield;
      
      -- Add to distributions array
      v_distributions := v_distributions || jsonb_build_object(
        'investorId', v_positions.investor_id,
        'investorName', v_positions.full_name,
        'currentBalance', v_positions.current_value,
        'allocationPercentage', v_allocation_pct,
        'feePercentage', v_positions.fee_pct * 100,
        'grossYield', v_gross_yield,
        'feeAmount', v_fee_amount,
        'netYield', v_net_yield,
        'newBalance', v_new_balance,
        'ibAmount', v_ib_amount
      );
    END;
  END LOOP;

  -- Update distribution totals
  UPDATE yield_distributions
  SET net_amount = v_total_net,
      total_fees = v_total_fees,
      total_ib_fees = v_total_ib
  WHERE id = v_distribution_id;

  -- *** PHASE 2 ADDITION: Recalculate fund AUM for this date ***
  PERFORM recalculate_fund_aum_for_date(p_fund_id, p_date, p_purpose, p_admin_id);

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'distributionId', v_distribution_id,
    'fundId', p_fund_id,
    'fundCode', v_fund.code,
    'fundAsset', v_fund.asset,
    'effectiveDate', p_date,
    'purpose', p_purpose,
    'currentAUM', v_total_aum,
    'newAUM', v_total_aum + v_total_net + v_total_ib,
    'grossYield', p_gross_amount,
    'netYield', v_total_net,
    'totalFees', v_total_fees,
    'totalIbFees', v_total_ib,
    'yieldPercentage', v_gross_yield_pct,
    'investorCount', v_investor_count,
    'skippedCount', v_skip_count,
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'status', 'applied'
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid, boolean) IS 
'Canonical yield distribution function. Distributes gross yield to all investors in a fund, calculates fees and IB commissions, and automatically recalculates fund_daily_aum for the distribution date.';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';