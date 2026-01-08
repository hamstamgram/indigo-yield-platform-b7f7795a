-- Complete fix for apply_daily_yield_to_fund_v3 with all schema corrections
-- Fixes: is_voided column, transaction type, fund_class, source enum, distribution_type

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id UUID,
  p_yield_date DATE,
  p_new_aum NUMERIC,
  p_actor_id UUID,
  p_purpose TEXT DEFAULT 'reporting'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_code TEXT;
  v_fund_asset TEXT;
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_yield_pct NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_total_net NUMERIC := 0;
  v_distribution_id UUID;
  v_inv RECORD;
  v_inv_gross NUMERIC;
  v_inv_fee NUMERIC;
  v_inv_net NUMERIC;
  v_inv_ib_amount NUMERIC;
  v_inv_fee_pct NUMERIC;
  v_inv_ib_pct NUMERIC;
  v_inv_ib_parent UUID;
  v_ref_id TEXT;
  v_indigo_fees_id UUID;
  v_indigo_credit NUMERIC := 0;
  v_is_month_end BOOLEAN;
  v_result JSONB;
  v_distributions JSONB := '[]'::JSONB;
  v_ib_credits JSONB := '[]'::JSONB;
  v_conflicts TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate purpose
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: must be reporting or transaction');
  END IF;

  -- Get fund info
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if month end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get current AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id;

  IF v_current_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No positions in fund');
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;
  v_yield_pct := CASE WHEN v_current_aum > 0 THEN (v_gross_yield / v_current_aum) * 100 ELSE 0 END;

  -- Check for existing distribution (idempotency) - FIXED: use voided_at IS NULL instead of is_voided
  SELECT array_agg(reference_id) INTO v_conflicts
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date = p_yield_date
    AND purpose = p_purpose::aum_purpose
    AND voided_at IS NULL;

  IF array_length(v_conflicts, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Distribution already exists for this date',
      'existingConflicts', to_jsonb(v_conflicts)
    );
  END IF;

  -- Get INDIGO FEES account
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE LOWER(full_name) = 'indigo fees' OR LOWER(email) LIKE '%indigo%fees%'
  LIMIT 1;

  -- Create distribution record - FIXED: correct column names and values
  INSERT INTO yield_distributions (
    fund_id, effective_date, is_month_end, recorded_aum, 
    gross_yield, net_yield, total_fees, total_ib,
    yield_percentage, purpose, distribution_type, status,
    reference_id, created_by
  ) VALUES (
    p_fund_id, p_yield_date, v_is_month_end, p_new_aum,
    v_gross_yield, 0, 0, 0,
    v_yield_pct, p_purpose::aum_purpose, 'daily', 'applied',
    'batch_' || v_fund_code || '_' || p_yield_date::text, p_actor_id
  ) RETURNING id INTO v_distribution_id;

  -- Process each investor
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      p.full_name as investor_name,
      p.account_type,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      pb.full_name as ib_parent_name,
      COALESCE(p.ib_commission_pct, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.fund_id = p_fund_id
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date > p_yield_date)
    LEFT JOIN profiles pb ON pb.id = p.ib_parent_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    -- Calculate investor allocation
    v_inv_gross := v_gross_yield * (v_inv.balance / v_current_aum);
    v_inv_fee_pct := v_inv.fee_pct;
    v_inv_fee := v_inv_gross * v_inv_fee_pct;
    v_inv_net := v_inv_gross - v_inv_fee;
    
    -- Calculate IB amount
    v_inv_ib_pct := v_inv.ib_pct;
    v_inv_ib_parent := v_inv.ib_parent_id;
    v_inv_ib_amount := CASE WHEN v_inv_ib_parent IS NOT NULL THEN v_inv_fee * v_inv_ib_pct ELSE 0 END;

    -- Generate reference ID
    v_ref_id := 'yield_' || v_fund_code || '_' || v_inv.investor_id || '_' || p_yield_date::text;

    -- Create yield transaction - FIXED: correct type, fund_class, and source values
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, value_date, 
      asset, fund_class, source, visibility_scope, reference_id, created_by
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD', v_inv_net, p_yield_date,
      v_fund_asset, v_fund_asset, 'yield_distribution', 'investor_visible', v_ref_id, p_actor_id
    );

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_inv_net,
        updated_at = now()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- Create fee allocation
    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      fee_percentage, fee_amount, base_net_income,
      period_start, period_end, purpose
    ) VALUES (
      v_distribution_id, p_fund_id, v_inv.investor_id, COALESCE(v_indigo_fees_id, p_actor_id),
      v_inv_fee_pct, v_inv_fee, v_inv_gross,
      p_yield_date, p_yield_date, p_purpose::aum_purpose
    );

    -- Create IB allocation if applicable
    IF v_inv_ib_parent IS NOT NULL AND v_inv_ib_amount > 0 THEN
      INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        ib_percentage, ib_fee_amount, source_net_income,
        effective_date, period_start, period_end, purpose, source
      ) VALUES (
        v_distribution_id, p_fund_id, v_inv_ib_parent, v_inv.investor_id,
        v_inv_ib_pct, v_inv_ib_amount, v_inv_net,
        p_yield_date, p_yield_date, p_yield_date, p_purpose::aum_purpose, 'fee_share'
      );

      v_total_ib_fees := v_total_ib_fees + v_inv_ib_amount;

      -- Add to IB credits array
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_inv_ib_parent,
        'ibInvestorName', v_inv.ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_inv_ib_amount,
        'ibPercentage', v_inv_ib_pct * 100,
        'source', 'fee_share',
        'referenceId', v_ref_id || '_ib',
        'wouldSkip', false
      );
    END IF;

    -- Update totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_net := v_total_net + v_inv_net;

    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', v_inv.balance,
      'allocationPercentage', (v_inv.balance / v_current_aum) * 100,
      'feePercentage', v_inv_fee_pct * 100,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'netYield', v_inv_net,
      'newBalance', v_inv.balance + v_inv_net,
      'positionDelta', v_inv_net,
      'ibParentId', v_inv_ib_parent,
      'ibParentName', v_inv.ib_parent_name,
      'ibPercentage', v_inv_ib_pct * 100,
      'ibAmount', v_inv_ib_amount,
      'referenceId', v_ref_id,
      'wouldSkip', false
    );
  END LOOP;

  -- Calculate Indigo credit (fees minus IB)
  v_indigo_credit := v_total_fees - v_total_ib_fees;

  -- Update distribution with final totals
  UPDATE yield_distributions
  SET net_yield = v_total_net,
      total_fees = v_total_fees,
      total_ib = v_total_ib_fees
  WHERE id = v_distribution_id;

  -- Record AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, p_purpose::aum_purpose, v_is_month_end, 'yield_distribution', p_actor_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'preview', false,
    'fundId', p_fund_id,
    'fundCode', v_fund_code,
    'fundAsset', v_fund_asset,
    'effectiveDate', p_yield_date,
    'purpose', p_purpose,
    'isMonthEnd', v_is_month_end,
    'currentAUM', v_current_aum,
    'newAUM', p_new_aum,
    'grossYield', v_gross_yield,
    'netYield', v_total_net,
    'totalFees', v_total_fees,
    'totalIbFees', v_total_ib_fees,
    'yieldPercentage', v_yield_pct,
    'investorCount', jsonb_array_length(v_distributions),
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', v_indigo_credit,
    'indigoFeesId', v_indigo_fees_id,
    'existingConflicts', '[]'::jsonb,
    'hasConflicts', false,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ibFees', v_total_ib_fees,
      'net', v_total_net,
      'indigoCredit', v_indigo_credit
    ),
    'status', 'applied',
    'distributionId', v_distribution_id
  );

  RETURN v_result;
END;
$$;