-- Fix column name: ib_commission_pct -> ib_percentage

DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v3(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, text);

-- ============================================
-- FIX preview_daily_yield_to_fund_v3
-- ============================================
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_reference_id text;
  v_would_skip boolean;
  v_is_month_end boolean;
BEGIN
  -- Get fund info
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if target date is month end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get opening AUM from most recent AUM event (any purpose)
  SELECT closing_aum INTO v_opening_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date < p_yield_date
    AND is_voided = false
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;

  -- FIXED: If no prior AUM event, use sum of current investor positions
  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    SELECT COALESCE(SUM(current_value), 0)::numeric(28,10) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0;
  END IF;

  -- If still zero, can't calculate yield
  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No positions found for this fund. Create deposits first.',
      'fundId', p_fund_id,
      'fundCode', v_fund_code
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := round((p_new_aum - v_opening_aum)::numeric, 10)::numeric(28,10);
  
  -- Calculate yield percentage
  IF v_opening_aum > 0 THEN
    v_yield_pct := round((v_gross_yield / v_opening_aum * 100)::numeric, 6);
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Get INDIGO FEES account
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Process each investor with a position in this fund (FIXED: ib_percentage not ib_commission_pct)
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
      p.account_type,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.fund_id = p_fund_id
      AND p_yield_date >= ifs.effective_date
      AND (ifs.end_date IS NULL OR p_yield_date <= ifs.end_date)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type != 'fees_account'
    ORDER BY ip.current_value DESC
  LOOP
    v_investor_count := v_investor_count + 1;
    
    -- Calculate ownership percentage
    v_inv_pct := round((v_inv.balance / v_opening_aum * 100)::numeric, 6);
    
    -- Calculate gross yield for this investor
    v_inv_gross := round((v_inv.balance / v_opening_aum * v_gross_yield)::numeric, 10);
    
    -- Get fee percentage
    v_fee_pct := v_inv.fee_pct;
    
    -- Calculate fee
    v_inv_fee := round((v_inv_gross * v_fee_pct)::numeric, 10);
    
    -- Calculate net yield
    v_inv_net := v_inv_gross - v_inv_fee;
    
    -- Calculate new balance
    v_inv_new_balance := v_inv.balance + v_inv_net;
    
    -- Track totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_net := v_total_net + v_inv_net;
    
    -- Generate reference ID for idempotency check
    v_reference_id := 'yield_' || v_fund_code || '_' || p_yield_date::text || '_' || v_inv.investor_id::text;
    
    -- Check if this yield was already distributed
    SELECT EXISTS(
      SELECT 1 FROM yield_distributions
      WHERE reference_id = v_reference_id AND is_voided = false
    ) INTO v_would_skip;
    
    IF v_would_skip THEN
      v_existing_conflicts := array_append(v_existing_conflicts, v_reference_id);
    END IF;
    
    -- Handle IB commission if applicable
    v_ib_parent_id := v_inv.ib_parent_id;
    v_ib_pct := v_inv.ib_pct;
    v_ib_amount := 0;
    v_ib_parent_name := NULL;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      -- Get IB parent name
      SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_ib_parent_name
      FROM profiles WHERE id = v_ib_parent_id;
      
      -- IB gets percentage of the fee
      v_ib_amount := round((v_inv_fee * v_ib_pct)::numeric, 10);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- Add to IB credits
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_ib_parent_id,
        'ibInvestorName', v_ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_ib_amount,
        'ibPercentage', v_ib_pct,
        'source', 'yield_fee',
        'referenceId', 'ib_' || v_reference_id,
        'wouldSkip', v_would_skip
      );
    END IF;
    
    -- Add to distributions
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', v_inv.balance,
      'allocationPercentage', v_inv_pct,
      'feePercentage', v_fee_pct,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'netYield', v_inv_net,
      'newBalance', v_inv_new_balance,
      'positionDelta', v_inv_net,
      'ibParentId', v_ib_parent_id,
      'ibParentName', v_ib_parent_name,
      'ibPercentage', v_ib_pct,
      'ibAmount', v_ib_amount,
      'referenceId', v_reference_id,
      'wouldSkip', v_would_skip
    );
  END LOOP;

  -- Indigo fees credit = total fees - IB fees
  v_indigo_fees_credit := v_total_fees - v_total_ib_fees;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'preview', true,
    'fundId', p_fund_id,
    'fundCode', v_fund_code,
    'fundAsset', v_fund_asset,
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
    'indigoFeesId', v_indigo_fees_id,
    'existingConflicts', to_jsonb(v_existing_conflicts),
    'hasConflicts', array_length(v_existing_conflicts, 1) > 0,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ibFees', v_total_ib_fees,
      'net', v_total_net,
      'indigoCredit', v_indigo_fees_credit
    ),
    'status', 'preview'
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- FIX apply_daily_yield_to_fund_v3
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_actor_id uuid,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_code text;
  v_fund_asset text;
  v_fund_class text;
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
  v_reference_id text;
  v_distribution_id uuid;
  v_yield_tx_id uuid;
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_is_month_end boolean;
  v_aum_event_id uuid;
  v_period_id uuid;
  v_skipped_count int := 0;
BEGIN
  -- Get fund info
  SELECT code, asset, fund_class INTO v_fund_code, v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if target date is month end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get current period if exists
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE p_yield_date BETWEEN start_date AND end_date
  LIMIT 1;

  -- Get opening AUM from most recent AUM event (any purpose)
  SELECT closing_aum INTO v_opening_aum
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date < p_yield_date
    AND is_voided = false
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;

  -- FIXED: If no prior AUM event, use sum of current investor positions
  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    SELECT COALESCE(SUM(current_value), 0)::numeric(28,10) INTO v_opening_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0;
  END IF;

  -- If still zero, can't calculate yield
  IF v_opening_aum IS NULL OR v_opening_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No positions found for this fund. Create deposits first.',
      'fundId', p_fund_id,
      'fundCode', v_fund_code
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := round((p_new_aum - v_opening_aum)::numeric, 10)::numeric(28,10);
  
  -- Calculate yield percentage
  IF v_opening_aum > 0 THEN
    v_yield_pct := round((v_gross_yield / v_opening_aum * 100)::numeric, 6);
  ELSE
    v_yield_pct := 0;
  END IF;

  -- FIXED: Get INDIGO FEES account using account_type
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Create AUM event for this yield distribution
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, now(), 'yield_distribution', 'yield_' || v_fund_code || '_' || p_yield_date::text,
    v_opening_aum, p_new_aum, p_purpose::aum_purpose, p_actor_id
  ) RETURNING id INTO v_aum_event_id;

  -- Process each investor with a position in this fund (FIXED: ib_percentage not ib_commission_pct)
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
      p.account_type,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.fund_id = p_fund_id
      AND p_yield_date >= ifs.effective_date
      AND (ifs.end_date IS NULL OR p_yield_date <= ifs.end_date)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type != 'fees_account'
    ORDER BY ip.current_value DESC
  LOOP
    -- Generate reference ID for idempotency
    v_reference_id := 'yield_' || v_fund_code || '_' || p_yield_date::text || '_' || v_inv.investor_id::text;
    
    -- Check if already distributed (idempotency)
    IF EXISTS(SELECT 1 FROM yield_distributions WHERE reference_id = v_reference_id AND is_voided = false) THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;
    
    v_investor_count := v_investor_count + 1;
    
    -- Calculate ownership percentage
    v_inv_pct := round((v_inv.balance / v_opening_aum * 100)::numeric, 6);
    
    -- Calculate gross yield for this investor
    v_inv_gross := round((v_inv.balance / v_opening_aum * v_gross_yield)::numeric, 10);
    
    -- Get fee percentage
    v_fee_pct := v_inv.fee_pct;
    
    -- Calculate fee
    v_inv_fee := round((v_inv_gross * v_fee_pct)::numeric, 10);
    
    -- Calculate net yield
    v_inv_net := v_inv_gross - v_inv_fee;
    
    -- Calculate new balance
    v_inv_new_balance := v_inv.balance + v_inv_net;
    
    -- Track totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_net := v_total_net + v_inv_net;
    
    -- Create yield distribution record
    INSERT INTO yield_distributions (
      fund_id, investor_id, distribution_date, period_id,
      opening_balance, gross_yield, fee_percentage, fee_amount, net_yield, closing_balance,
      yield_percentage, purpose, reference_id, created_by
    ) VALUES (
      p_fund_id, v_inv.investor_id, p_yield_date, v_period_id,
      v_inv.balance, v_inv_gross, v_fee_pct, v_inv_fee, v_inv_net, v_inv_new_balance,
      v_yield_pct, p_purpose::aum_purpose, v_reference_id, p_actor_id
    ) RETURNING id INTO v_distribution_id;
    
    -- FIXED: Create yield transaction with correct column names
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, value_date, amount, 
      asset, fund_class, source, visibility_scope, is_system_generated,
      notes, created_by
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'yield', p_yield_date, v_inv_net,
      v_fund_asset, v_fund_class, 'yield_distribution', 'admin_only', true,
      'Yield distribution: ' || v_reference_id, p_actor_id
    ) RETURNING id INTO v_yield_tx_id;
    
    -- Update investor position
    UPDATE investor_positions
    SET current_value = v_inv_new_balance,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_inv_net,
        updated_at = now()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;
    
    -- Create fee allocation record
    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      base_net_income, fee_percentage, fee_amount,
      period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, v_inv.investor_id, v_indigo_fees_id,
      v_inv_gross, v_fee_pct, v_inv_fee,
      p_yield_date, p_yield_date, p_purpose::aum_purpose, p_actor_id
    );
    
    -- Handle IB commission if applicable
    v_ib_parent_id := v_inv.ib_parent_id;
    v_ib_pct := v_inv.ib_pct;
    v_ib_amount := 0;
    v_ib_parent_name := NULL;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      -- Get IB parent name
      SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_ib_parent_name
      FROM profiles WHERE id = v_ib_parent_id;
      
      -- IB gets percentage of the fee
      v_ib_amount := round((v_inv_fee * v_ib_pct)::numeric, 10);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- Create IB allocation record
      INSERT INTO ib_allocations (
        distribution_id, fund_id, ib_investor_id, source_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_id, purpose, source, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_ib_parent_id, v_inv.investor_id,
        v_inv_fee, v_ib_pct, v_ib_amount,
        p_yield_date, v_period_id, p_purpose::aum_purpose, 'yield_fee', p_actor_id
      );
      
      -- Create IB credit transaction
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, value_date, amount,
        asset, fund_class, source, visibility_scope, is_system_generated,
        notes, created_by
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'ib_commission', p_yield_date, v_ib_amount,
        v_fund_asset, v_fund_class, 'yield_fee', 'admin_only', true,
        'IB commission from ' || v_inv.investor_name, p_actor_id
      ) RETURNING id INTO v_ib_tx_id;
      
      -- Update or create IB position
      INSERT INTO investor_positions (investor_id, fund_id, current_value, fund_class, updated_at)
      VALUES (v_ib_parent_id, p_fund_id, v_ib_amount, v_fund_class, now())
      ON CONFLICT (investor_id, fund_id) 
      DO UPDATE SET 
        current_value = investor_positions.current_value + v_ib_amount,
        updated_at = now();
      
      -- Add to IB credits
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_ib_parent_id,
        'ibInvestorName', v_ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_ib_amount,
        'ibPercentage', v_ib_pct,
        'transactionId', v_ib_tx_id
      );
    END IF;
    
    -- Add to distributions
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'distributionId', v_distribution_id,
      'transactionId', v_yield_tx_id,
      'currentBalance', v_inv.balance,
      'allocationPercentage', v_inv_pct,
      'feePercentage', v_fee_pct,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'netYield', v_inv_net,
      'newBalance', v_inv_new_balance
    );
  END LOOP;

  -- Indigo fees credit = total fees - IB fees
  v_indigo_fees_credit := v_total_fees - v_total_ib_fees;

  -- Credit INDIGO FEES account if we have fees
  IF v_indigo_fees_credit > 0 AND v_indigo_fees_id IS NOT NULL THEN
    -- Create fee credit transaction for INDIGO FEES
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, value_date, amount,
      asset, fund_class, source, visibility_scope, is_system_generated,
      notes, created_by
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'fee_credit', p_yield_date, v_indigo_fees_credit,
      v_fund_asset, v_fund_class, 'yield_distribution', 'admin_only', true,
      'Fee credit from yield distribution: ' || v_fund_code || ' ' || p_yield_date::text, p_actor_id
    );
    
    -- Update or create INDIGO FEES position
    INSERT INTO investor_positions (investor_id, fund_id, current_value, fund_class, updated_at)
    VALUES (v_indigo_fees_id, p_fund_id, v_indigo_fees_credit, v_fund_class, now())
    ON CONFLICT (investor_id, fund_id) 
    DO UPDATE SET 
      current_value = investor_positions.current_value + v_indigo_fees_credit,
      updated_at = now();
  END IF;

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
    'currentAUM', v_opening_aum,
    'newAUM', p_new_aum,
    'grossYield', v_gross_yield,
    'netYield', v_total_net,
    'totalFees', v_total_fees,
    'totalIbFees', v_total_ib_fees,
    'yieldPercentage', v_yield_pct,
    'investorCount', v_investor_count,
    'skippedCount', v_skipped_count,
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', v_indigo_fees_credit,
    'indigoFeesId', v_indigo_fees_id,
    'aumEventId', v_aum_event_id,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ibFees', v_total_ib_fees,
      'net', v_total_net,
      'indigoCredit', v_indigo_fees_credit
    ),
    'status', 'applied'
  );

  RETURN v_result;
END;
$$;