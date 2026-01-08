-- Fix all column mismatches in apply_daily_yield_to_fund_v3
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
  v_fund RECORD;
  v_current_aum NUMERIC;
  v_yield_amount NUMERIC;
  v_yield_pct NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib NUMERIC := 0;
  v_total_net NUMERIC := 0;
  v_distribution_id UUID;
  v_investors JSONB := '[]'::JSONB;
  v_ib_credits JSONB := '[]'::JSONB;
  v_inv RECORD;
  v_inv_share NUMERIC;
  v_inv_gross NUMERIC;
  v_inv_fee NUMERIC;
  v_inv_net NUMERIC;
  v_ib_amount NUMERIC;
  v_new_balance NUMERIC;
  v_ref_id TEXT;
  v_indigo_id UUID;
  v_indigo_credit NUMERIC := 0;
  v_fee_tx_id UUID;
  v_ib_tx_id UUID;
BEGIN
  -- Validate purpose
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: must be reporting or transaction');
  END IF;

  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions WHERE fund_id = p_fund_id;

  IF v_current_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No positions in fund');
  END IF;

  -- Calculate yield
  v_yield_amount := p_new_aum - v_current_aum;
  v_yield_pct := (v_yield_amount / v_current_aum) * 100;

  -- Check for existing distribution (using correct column: effective_date)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date = p_yield_date
      AND purpose = p_purpose::aum_purpose
      AND is_voided = false
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution already exists for this date and purpose');
  END IF;

  -- Get INDIGO FEES account (using account_type)
  SELECT id INTO v_indigo_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

  -- Create distribution record (using correct columns)
  INSERT INTO yield_distributions (
    fund_id, effective_date, gross_yield, yield_percentage,
    purpose, distribution_type, status, created_by,
    is_month_end, recorded_aum
  ) VALUES (
    p_fund_id, p_yield_date, v_yield_amount, v_yield_pct,
    p_purpose::aum_purpose, 'daily', 'applied', p_actor_id,
    (p_purpose = 'reporting'), p_new_aum
  ) RETURNING id INTO v_distribution_id;

  -- Process each investor
  FOR v_inv IN
    SELECT
      ip.investor_id,
      ip.current_value,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
      p.account_type,
      COALESCE(ifs.fee_pct, 20) AS fee_pct,
      p.ib_parent_id,
      TRIM(COALESCE(ibp.first_name, '') || ' ' || COALESCE(ibp.last_name, '')) AS ib_parent_name,
      COALESCE(p.ib_percentage, 0) AS ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.fund_id = p_fund_id
      AND p_yield_date BETWEEN ifs.effective_date AND COALESCE(ifs.end_date, '9999-12-31')
    LEFT JOIN profiles ibp ON ibp.id = p.ib_parent_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    -- Calculate share
    v_inv_share := v_inv.current_value / v_current_aum;
    v_inv_gross := v_yield_amount * v_inv_share;

    -- Calculate fee (skip for fees_account)
    IF v_inv.account_type = 'fees_account' THEN
      v_inv_fee := 0;
    ELSE
      v_inv_fee := v_inv_gross * (v_inv.fee_pct / 100);
    END IF;

    v_inv_net := v_inv_gross - v_inv_fee;
    v_new_balance := v_inv.current_value + v_inv_net;

    -- Calculate IB amount
    IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_pct > 0 THEN
      v_ib_amount := v_inv_fee * (v_inv.ib_pct / 100);
    ELSE
      v_ib_amount := 0;
    END IF;

    -- Generate reference ID
    v_ref_id := 'YLD-' || v_distribution_id::TEXT || '-' || v_inv.investor_id::TEXT;

    -- Update investor position
    UPDATE investor_positions
    SET current_value = v_new_balance,
        updated_at = NOW()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- Create yield transaction for investor
    INSERT INTO transactions_v2 (
      investor_id, fund_id, tx_type, amount, effective_date,
      reference_id, notes, created_by, purpose
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'yield', v_inv_net, p_yield_date,
      v_ref_id, 'Daily yield distribution', p_actor_id, p_purpose::aum_purpose
    );

    -- Create fee allocation
    IF v_inv_fee > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, base_net_income,
        fee_percentage, fee_amount, period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id, v_inv.investor_id, p_fund_id, v_inv_gross,
        v_inv.fee_pct, v_inv_fee, p_yield_date, p_yield_date, p_purpose::aum_purpose, p_actor_id
      ) RETURNING credit_transaction_id INTO v_fee_tx_id;

      v_total_fees := v_total_fees + v_inv_fee;

      -- Credit fees to INDIGO account
      IF v_indigo_id IS NOT NULL THEN
        v_indigo_credit := v_indigo_credit + (v_inv_fee - v_ib_amount);
      END IF;
    END IF;

    -- Create IB allocation (with effective_date)
    IF v_ib_amount > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
      INSERT INTO ib_allocations (
        distribution_id, source_investor_id, ib_investor_id, fund_id,
        source_net_income, ib_percentage, ib_fee_amount, purpose, created_by,
        effective_date
      ) VALUES (
        v_distribution_id, v_inv.investor_id, v_inv.ib_parent_id, p_fund_id,
        v_inv_net + v_ib_amount, v_inv.ib_pct, v_ib_amount, p_purpose::aum_purpose, p_actor_id,
        p_yield_date
      );

      v_total_ib := v_total_ib + v_ib_amount;

      -- Build IB credits array
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_inv.ib_parent_id,
        'ibInvestorName', v_inv.ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_ib_amount,
        'ibPercentage', v_inv.ib_pct,
        'source', 'fee_share',
        'referenceId', v_ref_id || '-IB',
        'wouldSkip', false
      );
    END IF;

    v_total_net := v_total_net + v_inv_net;

    -- Build investors array
    v_investors := v_investors || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', v_inv.current_value,
      'allocationPercentage', v_inv_share * 100,
      'feePercentage', v_inv.fee_pct,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'netYield', v_inv_net,
      'newBalance', v_new_balance,
      'positionDelta', v_inv_net,
      'ibParentId', v_inv.ib_parent_id,
      'ibParentName', v_inv.ib_parent_name,
      'ibPercentage', v_inv.ib_pct,
      'ibAmount', v_ib_amount,
      'referenceId', v_ref_id,
      'wouldSkip', false
    );
  END LOOP;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'preview', false,
    'fundId', p_fund_id,
    'fundCode', v_fund.code,
    'fundAsset', v_fund.asset,
    'effectiveDate', p_yield_date,
    'purpose', p_purpose,
    'isMonthEnd', (p_purpose = 'reporting'),
    'currentAUM', v_current_aum,
    'newAUM', p_new_aum,
    'grossYield', v_yield_amount,
    'netYield', v_total_net,
    'totalFees', v_total_fees,
    'totalIbFees', v_total_ib,
    'yieldPercentage', v_yield_pct,
    'investorCount', jsonb_array_length(v_investors),
    'distributions', v_investors,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', v_indigo_credit,
    'indigoFeesId', v_indigo_id,
    'existingConflicts', '[]'::JSONB,
    'hasConflicts', false,
    'totals', jsonb_build_object(
      'gross', v_yield_amount,
      'fees', v_total_fees,
      'ibFees', v_total_ib,
      'net', v_total_net,
      'indigoCredit', v_indigo_credit
    ),
    'status', 'applied'
  );
END;
$$;