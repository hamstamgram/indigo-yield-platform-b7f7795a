-- Fix column name mismatches in apply_daily_yield_to_fund_v3
-- Issues fixed:
-- 1. full_name -> first_name/last_name pattern
-- 2. ib_commission_pct -> ib_percentage
-- 3. INDIGO FEES lookup via account_type

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
  v_fund_asset TEXT;
  v_prev_aum NUMERIC;
  v_yield_amount NUMERIC;
  v_yield_pct NUMERIC;
  v_distribution_id UUID;
  v_result JSONB;
  v_investors JSONB := '[]'::JSONB;
  v_inv RECORD;
  v_total_balance NUMERIC := 0;
  v_inv_share NUMERIC;
  v_inv_gross NUMERIC;
  v_inv_fee NUMERIC;
  v_inv_net NUMERIC;
  v_ib_amount NUMERIC;
  v_ref_id TEXT;
  v_tx_id UUID;
  v_indigo_fees_id UUID;
  v_total_fees NUMERIC := 0;
  v_total_ib NUMERIC := 0;
  v_aum_event_id UUID;
BEGIN
  -- Validate purpose
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RAISE EXCEPTION 'Invalid purpose: %. Must be reporting or transaction', p_purpose;
  END IF;

  -- Get fund info
  SELECT asset INTO v_fund_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get previous AUM
  SELECT total_aum INTO v_prev_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;

  v_prev_aum := COALESCE(v_prev_aum, 0);
  
  -- Calculate yield
  v_yield_amount := p_new_aum - v_prev_aum;
  v_yield_pct := CASE WHEN v_prev_aum > 0 THEN (v_yield_amount / v_prev_aum) * 100 ELSE 0 END;

  -- Check for duplicate distribution
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND distribution_date = p_yield_date
      AND purpose = p_purpose::aum_purpose
      AND voided_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Yield already distributed for this fund/date/purpose';
  END IF;

  -- Get INDIGO FEES account using account_type
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id, distribution_date, gross_yield_amount, gross_yield_pct,
    purpose, distribution_type, status, created_by
  ) VALUES (
    p_fund_id, p_yield_date, v_yield_amount, v_yield_pct,
    p_purpose::aum_purpose, 'daily', 'applied', p_actor_id
  )
  RETURNING id INTO v_distribution_id;

  -- Get investors with positions
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
      p.account_type,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      TRIM(COALESCE(pb.first_name, '') || ' ' || COALESCE(pb.last_name, '')) as ib_parent_name,
      COALESCE(p.ib_percentage, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN profiles pb ON pb.id = p.ib_parent_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
      AND (ifs.fund_id IS NULL OR ifs.fund_id = p_fund_id)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type NOT IN ('fees_account', 'system_account')
  LOOP
    v_total_balance := v_total_balance + v_inv.balance;
  END LOOP;

  -- Reset and process investors
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name,
      p.account_type,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      TRIM(COALESCE(pb.first_name, '') || ' ' || COALESCE(pb.last_name, '')) as ib_parent_name,
      COALESCE(p.ib_percentage, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN profiles pb ON pb.id = p.ib_parent_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
      AND (ifs.fund_id IS NULL OR ifs.fund_id = p_fund_id)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.account_type NOT IN ('fees_account', 'system_account')
  LOOP
    -- Calculate share
    v_inv_share := CASE WHEN v_total_balance > 0 THEN v_inv.balance / v_total_balance ELSE 0 END;
    v_inv_gross := v_yield_amount * v_inv_share;
    v_inv_fee := v_inv_gross * v_inv.fee_pct;
    v_inv_net := v_inv_gross - v_inv_fee;
    
    -- Calculate IB amount
    v_ib_amount := 0;
    IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_pct > 0 THEN
      v_ib_amount := v_inv_net * (v_inv.ib_pct / 100);
      v_inv_net := v_inv_net - v_ib_amount;
      v_total_ib := v_total_ib + v_ib_amount;
    END IF;
    
    v_total_fees := v_total_fees + v_inv_fee;

    -- Generate reference ID
    v_ref_id := 'YLD-' || TO_CHAR(p_yield_date, 'YYYYMMDD') || '-' || SUBSTRING(v_inv.investor_id::TEXT, 1, 8);

    -- Create yield transaction for investor
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, value_date, 
      asset, fund_class, source, visibility_scope, reference_id, created_by
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD', v_inv_net, p_yield_date,
      v_fund_asset, v_fund_asset, 'yield_distribution', 'investor_visible', v_ref_id, p_actor_id
    )
    RETURNING id INTO v_tx_id;

    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_inv_net,
        updated_at = NOW()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- Record fee allocation
    IF v_inv_fee > 0 AND v_indigo_fees_id IS NOT NULL THEN
      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fee_amount, fee_percentage,
        base_net_income, period_start, period_end, purpose, fees_account_id, created_by
      ) VALUES (
        v_distribution_id, v_inv.investor_id, p_fund_id, v_inv_fee, v_inv.fee_pct,
        v_inv_gross, p_yield_date, p_yield_date, p_purpose::aum_purpose, v_indigo_fees_id, p_actor_id
      );
    END IF;

    -- Record IB allocation
    IF v_ib_amount > 0 THEN
      INSERT INTO ib_allocations (
        distribution_id, source_investor_id, ib_investor_id, fund_id,
        source_net_income, ib_percentage, ib_fee_amount, purpose, created_by
      ) VALUES (
        v_distribution_id, v_inv.investor_id, v_inv.ib_parent_id, p_fund_id,
        v_inv_net + v_ib_amount, v_inv.ib_pct, v_ib_amount, p_purpose::aum_purpose, p_actor_id
      );
    END IF;

    -- Add to result
    v_investors := v_investors || jsonb_build_object(
      'investor_id', v_inv.investor_id,
      'investor_name', v_inv.investor_name,
      'balance', v_inv.balance,
      'share_pct', v_inv_share * 100,
      'gross_yield', v_inv_gross,
      'fee_pct', v_inv.fee_pct,
      'fee_amount', v_inv_fee,
      'ib_amount', v_ib_amount,
      'net_yield', v_inv_net,
      'transaction_id', v_tx_id
    );
  END LOOP;

  -- Create AUM record
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, source, created_by
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, p_purpose::aum_purpose, 'yield_distribution', p_actor_id
  );

  -- Create AUM event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, NOW(), 'yield_distribution', v_distribution_id::TEXT,
    v_prev_aum, p_new_aum, p_purpose::aum_purpose, p_actor_id
  )
  RETURNING id INTO v_aum_event_id;

  -- Credit fees to INDIGO FEES account
  IF v_total_fees > 0 AND v_indigo_fees_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, value_date,
      asset, fund_class, source, visibility_scope, reference_id, created_by
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE', v_total_fees, p_yield_date,
      v_fund_asset, v_fund_asset, 'yield_distribution', 'admin_only', 
      'FEE-' || TO_CHAR(p_yield_date, 'YYYYMMDD') || '-' || SUBSTRING(p_fund_id::TEXT, 1, 8), p_actor_id
    );

    UPDATE investor_positions
    SET current_value = current_value + v_total_fees,
        updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'yield_date', p_yield_date,
    'previous_aum', v_prev_aum,
    'new_aum', p_new_aum,
    'yield_amount', v_yield_amount,
    'yield_pct', v_yield_pct,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'investor_count', jsonb_array_length(v_investors),
    'investors', v_investors
  );

  RETURN v_result;
END;
$$;