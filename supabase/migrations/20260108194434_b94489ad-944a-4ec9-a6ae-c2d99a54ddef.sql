
-- ================================================
-- Complete Yield Distribution Fix
-- 1. Bootstrap AUM for XRP fund
-- 2. Drop all overloads and recreate function
-- ================================================

-- 1. Bootstrap AUM for XRP fund (Ripple Yield Fund)
INSERT INTO fund_daily_aum (
  fund_id, aum_date, total_aum, is_month_end, purpose, source, is_voided, created_by
) VALUES (
  '2c123c4f-76b4-4504-867e-059649855417',
  '2025-11-25',
  184003,
  false,
  'transaction',
  'manual_bootstrap',
  false,
  '55586442-641c-4d9e-939a-85f09b816073'
) ON CONFLICT DO NOTHING;

-- 2. Drop the function with the exact signature that exists
DROP FUNCTION IF EXISTS apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, text);

CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v3(
  p_fund_id UUID,
  p_yield_date DATE,
  p_new_aum NUMERIC,
  p_actor_id UUID,
  p_purpose TEXT DEFAULT 'reporting'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_prev_aum NUMERIC;
  v_yield_amount NUMERIC;
  v_yield_pct NUMERIC;
  v_inv RECORD;
  v_inv_net NUMERIC;
  v_inv_fee NUMERIC;
  v_indigo_fee NUMERIC;
  v_inv_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ref_id TEXT;
  v_dist_id UUID;
  v_total_distributed NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_total_ib NUMERIC := 0;
  v_total_indigo_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_result JSONB;
  v_is_month_end BOOLEAN;
  v_period_id UUID;
  v_ib_parent RECORD;
  v_inv_pct NUMERIC;
  v_indigo_fees_account_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Validate purpose
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose. Must be reporting or transaction');
  END IF;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get previous AUM
  SELECT total_aum INTO v_prev_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_yield_date
    AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_prev_aum IS NULL OR v_prev_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No previous AUM found. Create a baseline AUM record first.');
  END IF;

  -- Calculate yield
  v_yield_amount := p_new_aum - v_prev_aum;
  IF v_yield_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'New AUM must be greater than previous AUM for positive yield');
  END IF;
  
  v_yield_pct := (v_yield_amount / v_prev_aum) * 100;

  -- Check for duplicate distribution
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date = p_yield_date
      AND purpose = p_purpose::aum_purpose
      AND voided_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution already exists for this date');
  END IF;

  -- Check if month end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get statement period if exists
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE p_yield_date BETWEEN period_start AND period_end
  LIMIT 1;

  -- Process each investor with a position
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.allocation_pct,
      COALESCE(ifs.fee_pct, p.fee_pct, 0) as fee_pct,
      COALESCE(p.ib_percentage, 0) as ib_pct,
      p.ib_parent_id,
      p.first_name,
      p.last_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      -- Exclude system accounts from yield distribution
      AND ip.investor_id != v_indigo_fees_account_id
  LOOP
    -- Calculate investor's share percentage
    v_inv_pct := (v_inv.current_value / v_prev_aum) * 100;
    
    -- Calculate investor's share of yield (gross)
    v_inv_gross := (v_inv.current_value / v_prev_aum) * v_yield_amount;
    
    -- Fee calculations: Both INDIGO and IB are % of GROSS yield
    v_fee_pct := v_inv.fee_pct;
    v_indigo_fee := v_inv_gross * (v_fee_pct / 100);
    
    -- IB fee is also % of GROSS yield (not net)
    v_ib_amount := 0;
    IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_pct > 0 THEN
      v_ib_amount := v_inv_gross * (v_inv.ib_pct / 100);
    END IF;
    
    -- Calculate fee amount (INDIGO portion only - IB is separate)
    v_inv_fee := v_indigo_fee;
    
    -- Net to investor = Gross - INDIGO Fee - IB Fee
    v_inv_net := v_inv_gross - v_indigo_fee - v_ib_amount;

    -- Generate reference ID
    v_ref_id := 'YLD-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || substr(v_inv.investor_id::text, 1, 8);

    -- Create yield distribution record (per investor)
    INSERT INTO yield_distributions (
      fund_id, investor_id, effective_date, gross_yield, fee_amount, 
      net_yield, fee_percentage, purpose, is_month_end, recorded_aum,
      distribution_type, status, created_by, reference_id
    ) VALUES (
      p_fund_id, v_inv.investor_id, p_yield_date, v_inv_gross, v_inv_fee,
      v_inv_net, v_fee_pct, p_purpose::aum_purpose, v_is_month_end, v_inv.current_value,
      'daily', 'applied', p_actor_id, v_ref_id
    ) RETURNING id INTO v_dist_id;

    -- Create transaction for the investor's net yield
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, created_by, purpose, asset, source
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD'::tx_type, v_inv_net, p_yield_date, p_yield_date,
      v_ref_id, 'Daily yield distribution (net after fees)', p_actor_id, p_purpose::aum_purpose,
      v_fund.asset, 'yield_distribution'::tx_source
    );

    -- Update investor position with NET yield
    UPDATE investor_positions
    SET current_value = current_value + v_inv_net,
        updated_at = now()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- ============================================
    -- INSERT FEE ALLOCATION (INDIGO FEES)
    -- ============================================
    IF v_indigo_fee > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount,
        created_by, is_voided
      ) VALUES (
        v_dist_id, p_fund_id, v_inv.investor_id, v_indigo_fees_account_id,
        p_yield_date, p_yield_date, p_purpose::aum_purpose,
        v_inv_gross, v_fee_pct, v_indigo_fee,
        p_actor_id, false
      );
    END IF;

    -- ============================================
    -- INSERT IB ALLOCATION (if applicable)
    -- ============================================
    IF v_inv.ib_parent_id IS NOT NULL AND v_ib_amount > 0 THEN
      INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_start, period_end, purpose,
        source, created_by, is_voided, payout_status
      ) VALUES (
        v_dist_id, p_fund_id, v_inv.ib_parent_id, v_inv.investor_id,
        v_inv_gross, v_inv.ib_pct, v_ib_amount,
        p_yield_date, p_yield_date, p_yield_date, p_purpose::aum_purpose,
        'yield_distribution', p_actor_id, false, 'pending'
      );
    END IF;

    -- ============================================
    -- INSERT INVESTOR YIELD EVENT (audit trail)
    -- ============================================
    INSERT INTO investor_yield_events (
      investor_id, fund_id, event_date, trigger_type,
      fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period, visibility_scope,
      reference_id, created_by, is_voided
    ) VALUES (
      v_inv.investor_id, p_fund_id, p_yield_date, 'yield',
      v_prev_aum, p_new_aum, v_inv.current_value, v_inv_pct,
      v_yield_pct, v_inv_gross, v_fee_pct, v_inv_fee, v_inv_net,
      p_yield_date, p_yield_date, 1, 'investor_visible',
      v_ref_id, p_actor_id, false
    );

    -- Track totals
    v_total_distributed := v_total_distributed + v_inv_net;
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_ib := v_total_ib + v_ib_amount;
    v_total_indigo_fees := v_total_indigo_fees + v_indigo_fee;
    v_investor_count := v_investor_count + 1;
  END LOOP;

  -- ============================================
  -- CREDIT INDIGO FEES ACCOUNT
  -- ============================================
  IF v_total_indigo_fees > 0 THEN
    -- Create FEE_CREDIT transaction for INDIGO FEES
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, asset, source, created_by, purpose
    ) VALUES (
      v_indigo_fees_account_id, p_fund_id, 'FEE_CREDIT'::tx_type, 
      v_total_indigo_fees, p_yield_date, p_yield_date,
      'FEE-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || substr(p_fund_id::text, 1, 8),
      'Platform fees from yield distribution', v_fund.asset,
      'yield_distribution'::tx_source, p_actor_id, p_purpose::aum_purpose
    );

    -- Update INDIGO FEES position
    INSERT INTO investor_positions (investor_id, fund_id, current_value, updated_at)
    VALUES (v_indigo_fees_account_id, p_fund_id, v_total_indigo_fees, now())
    ON CONFLICT (investor_id, fund_id) 
    DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                  updated_at = now();
  END IF;

  -- ============================================
  -- CREDIT EACH IB PARENT
  -- ============================================
  FOR v_ib_parent IN
    SELECT ib_investor_id, SUM(ib_fee_amount) as total_ib_amount
    FROM ib_allocations
    WHERE distribution_id IN (
      SELECT id FROM yield_distributions 
      WHERE fund_id = p_fund_id 
        AND effective_date = p_yield_date 
        AND purpose = p_purpose::aum_purpose
        AND voided_at IS NULL
    )
    AND is_voided = false
    GROUP BY ib_investor_id
  LOOP
    -- Create IB_CREDIT transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, asset, source, created_by, purpose
    ) VALUES (
      v_ib_parent.ib_investor_id, p_fund_id, 'IB_CREDIT'::tx_type,
      v_ib_parent.total_ib_amount, p_yield_date, p_yield_date,
      'IB-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || substr(v_ib_parent.ib_investor_id::text, 1, 8),
      'IB commission from yield distribution', v_fund.asset,
      'yield_distribution'::tx_source, p_actor_id, p_purpose::aum_purpose
    );

    -- Update IB parent position
    INSERT INTO investor_positions (investor_id, fund_id, current_value, updated_at)
    VALUES (v_ib_parent.ib_investor_id, p_fund_id, v_ib_parent.total_ib_amount, now())
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                  updated_at = now();
  END LOOP;

  -- Create AUM record for this date
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, is_month_end, purpose, source, is_voided, created_by
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, v_is_month_end, p_purpose::aum_purpose,
    'yield_distribution', false, p_actor_id
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'yield_date', p_yield_date,
    'previous_aum', v_prev_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_yield_amount,
    'yield_percentage', v_yield_pct,
    'total_distributed_net', v_total_distributed,
    'total_indigo_fees', v_total_indigo_fees,
    'total_ib_fees', v_total_ib,
    'investor_count', v_investor_count,
    'is_month_end', v_is_month_end,
    'purpose', p_purpose
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION apply_daily_yield_to_fund_v3 IS 'Complete yield distribution with fee_allocations, ib_allocations, investor_yield_events, and credits to INDIGO FEES and IB parents';
