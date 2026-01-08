-- Fix apply_daily_yield_to_fund_v3: use 'yield' instead of 'yield_distribution' for trigger_type
-- The constraint fund_aum_events_trigger_type_check only allows: deposit, withdrawal, yield, month_end, manual

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_actor_id uuid, p_purpose text DEFAULT 'reporting'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_indigo_fee numeric(28,10);
  v_reference_id text;
  v_distribution_id uuid;
  v_yield_tx_id uuid;
  v_ib_tx_id uuid;
  v_is_month_end boolean;
  v_aum_event_id uuid;
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

  -- Use sum of current investor positions as opening AUM
  SELECT COALESCE(SUM(current_value), 0)::numeric(28,10) INTO v_opening_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  -- If zero, can't calculate yield
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

  -- Create AUM event for this yield distribution
  -- FIX: Use 'yield' instead of 'yield_distribution' to satisfy constraint
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, now(), 'yield', 'yield_' || v_fund_code || '_' || p_yield_date::text,
    v_opening_aum, p_new_aum, p_purpose::aum_purpose, p_actor_id
  ) RETURNING id INTO v_aum_event_id;

  -- Process each investor with a position in this fund
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
      p.account_type,
      ip.current_value as balance,
      -- FIX: Lookup fee with priority: fund-specific > global > default 20%
      COALESCE(
        -- Priority 1: Fund-specific fee
        (SELECT ifs.fee_pct / 100 
         FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id
           AND ifs.fund_id = p_fund_id
           AND p_yield_date >= ifs.effective_date
           AND (ifs.end_date IS NULL OR p_yield_date <= ifs.end_date)
         ORDER BY ifs.effective_date DESC 
         LIMIT 1),
        -- Priority 2: Global fee (fund_id IS NULL)
        (SELECT ifs.fee_pct / 100 
         FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id
           AND ifs.fund_id IS NULL
           AND p_yield_date >= ifs.effective_date
           AND (ifs.end_date IS NULL OR p_yield_date <= ifs.end_date)
         ORDER BY ifs.effective_date DESC 
         LIMIT 1),
        -- Priority 3: Default 20%
        0.20
      ) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_pct_raw
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type != 'fees_account'
    ORDER BY ip.current_value DESC
  LOOP
    -- Generate reference ID for idempotency
    v_reference_id := 'yield_' || v_fund_code || '_' || p_yield_date::text || '_' || v_inv.investor_id::text;
    
    -- Check if already distributed (idempotency)
    IF EXISTS(SELECT 1 FROM yield_distributions WHERE reference_id = v_reference_id AND voided_at IS NULL) THEN
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
    
    -- Convert IB percentage from whole number to decimal
    v_ib_pct := v_inv.ib_pct_raw / 100;
    
    -- Calculate INDIGO fee on gross yield
    v_indigo_fee := round((v_inv_gross * v_fee_pct)::numeric, 10);
    
    -- Calculate IB fee on gross yield
    v_ib_amount := 0;
    v_ib_parent_id := v_inv.ib_parent_id;
    v_ib_parent_name := NULL;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      v_ib_amount := round((v_inv_gross * v_ib_pct)::numeric, 10);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      SELECT trim(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
      INTO v_ib_parent_name
      FROM profiles WHERE id = v_ib_parent_id;
    END IF;
    
    -- Total fee = INDIGO fee + IB fee
    v_inv_fee := v_indigo_fee + v_ib_amount;
    
    -- Calculate net yield
    v_inv_net := v_inv_gross - v_inv_fee;
    
    -- Calculate new balance
    v_inv_new_balance := v_inv.balance + v_inv_net;
    
    -- Track totals
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_net := v_total_net + v_inv_net;

    -- Create yield distribution record (first investor creates the batch record)
    IF v_distribution_id IS NULL THEN
      INSERT INTO yield_distributions (
        fund_id, yield_date, gross_yield, net_yield, total_fees, total_ib,
        yield_percentage, purpose, reference_id, created_by
      ) VALUES (
        p_fund_id, p_yield_date, v_gross_yield, v_total_net, v_total_fees, v_total_ib_fees,
        v_yield_pct, p_purpose::aum_purpose, 'batch_' || v_fund_code || '_' || p_yield_date::text, p_actor_id
      ) RETURNING id INTO v_distribution_id;
    END IF;

    -- Create yield transaction for investor
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, effective_date, 
      reference_id, notes, created_by
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'yield', v_inv_net, p_yield_date,
      v_reference_id, 'Yield distribution: ' || v_yield_pct || '%', p_actor_id
    ) RETURNING id INTO v_yield_tx_id;

    -- Update investor position
    UPDATE investor_positions
    SET current_value = v_inv_new_balance,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_inv_net,
        updated_at = now()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- Record fee allocation
    INSERT INTO fee_allocations (
      distribution_id, investor_id, fund_id, fee_amount, fee_percentage,
      base_net_income, period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, v_inv.investor_id, p_fund_id, v_indigo_fee, v_fee_pct * 100,
      v_inv_gross, p_yield_date, p_yield_date, p_purpose::aum_purpose, p_actor_id
    );

    -- Handle IB allocation if applicable
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      INSERT INTO ib_allocations (
        distribution_id, source_investor_id, ib_investor_id, fund_id,
        ib_fee_amount, ib_percentage, source_net_income, effective_date, purpose, created_by
      ) VALUES (
        v_distribution_id, v_inv.investor_id, v_ib_parent_id, p_fund_id,
        v_ib_amount, v_inv.ib_pct_raw, v_inv_gross, p_yield_date, p_purpose::aum_purpose, p_actor_id
      );

      -- Credit IB parent position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount,
          updated_at = now()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;

      -- If IB doesn't have position in this fund, create one
      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares)
        VALUES (v_ib_parent_id, p_fund_id, v_ib_amount, 0, 0);
      END IF;

      -- Create IB credit transaction
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, effective_date,
        reference_id, notes, created_by
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'ib_credit', v_ib_amount, p_yield_date,
        'ib_' || v_reference_id, 'IB credit from ' || v_inv.investor_name, p_actor_id
      );

      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ibInvestorId', v_ib_parent_id,
        'ibInvestorName', v_ib_parent_name,
        'sourceInvestorId', v_inv.investor_id,
        'sourceInvestorName', v_inv.investor_name,
        'amount', v_ib_amount,
        'ibPercentage', v_inv.ib_pct_raw,
        'source', 'yield_fee',
        'referenceId', 'ib_' || v_reference_id,
        'wouldSkip', false
      );
    END IF;

    -- Add to distributions output
    v_distributions := v_distributions || jsonb_build_object(
      'investorId', v_inv.investor_id,
      'investorName', v_inv.investor_name,
      'accountType', v_inv.account_type,
      'currentBalance', v_inv.balance,
      'allocationPercentage', v_inv_pct,
      'feePercentage', v_fee_pct * 100,
      'grossYield', v_inv_gross,
      'feeAmount', v_inv_fee,
      'indigoFee', v_indigo_fee,
      'netYield', v_inv_net,
      'newBalance', v_inv_new_balance,
      'positionDelta', v_inv_net,
      'ibParentId', v_ib_parent_id,
      'ibParentName', v_ib_parent_name,
      'ibPercentage', v_inv.ib_pct_raw,
      'ibAmount', v_ib_amount,
      'referenceId', v_reference_id,
      'wouldSkip', false,
      'transactionId', v_yield_tx_id
    );
  END LOOP;

  -- Indigo fees credit = total fees - IB fees
  v_indigo_fees_credit := v_total_fees - v_total_ib_fees;

  -- Update the distribution record with final totals
  IF v_distribution_id IS NOT NULL THEN
    UPDATE yield_distributions
    SET net_yield = v_total_net,
        total_fees = v_total_fees,
        total_ib = v_total_ib_fees
    WHERE id = v_distribution_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'applied', true,
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
    'distributionId', v_distribution_id,
    'distributions', v_distributions,
    'ibCredits', v_ib_credits,
    'indigoFeesCredit', v_indigo_fees_credit,
    'indigoFeesId', v_indigo_fees_id,
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
$function$;