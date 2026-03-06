-- Fix apply_daily_yield_to_fund_v3: correct column names in yield_distributions INSERT
CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v3(
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
  v_current_aum numeric;
  v_gross_yield numeric;
  v_yield_pct numeric;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib_fees numeric := 0;
  v_investor_count int := 0;
  v_distribution_id uuid;
  v_aum_event_id uuid;
  v_is_month_end boolean;
  v_inv record;
  v_result jsonb;
  v_distributions jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_existing_count int;
BEGIN
  -- Validate purpose
  IF p_purpose NOT IN ('reporting', 'transaction') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid purpose. Must be reporting or transaction.'
    );
  END IF;

  -- Get fund info
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Check for month-end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get current AUM from latest non-voided fund_daily_aum
  SELECT total_aum INTO v_current_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND is_voided = false
    AND aum_date <= p_yield_date
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;

  IF v_current_aum IS NULL THEN
    v_current_aum := 0;
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;
  
  IF v_current_aum > 0 THEN
    v_yield_pct := (v_gross_yield / v_current_aum) * 100;
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Check for existing distribution on same date
  SELECT COUNT(*) INTO v_existing_count
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date = p_yield_date
    AND is_voided = false;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Yield already distributed for %s on %s', v_fund_code, p_yield_date)
    );
  END IF;

  -- Insert AUM event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, opening_aum, closing_aum, post_flow_aum,
    trigger_type, trigger_reference, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, now(), v_current_aum, p_new_aum, p_new_aum,
    'yield', 'yield_v3_' || p_yield_date::text, p_purpose::aum_purpose, p_actor_id
  ) RETURNING id INTO v_aum_event_id;

  -- Insert fund_daily_aum record
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, source, purpose, is_month_end, created_by
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, 'yield_distribution_v3', p_purpose::aum_purpose, v_is_month_end, p_actor_id
  );

  -- Process each investor position
  FOR v_inv IN 
    SELECT 
      ip.investor_id,
      p.full_name as investor_name,
      ip.current_value as balance,
      COALESCE(ifs.fee_pct, 20) as fee_pct,
      COALESCE(p.ib_parent_id, NULL) as ib_parent_id,
      COALESCE(ibp.full_name, NULL) as ib_parent_name,
      COALESCE(p.ib_percentage, 0) as ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id 
      AND ifs.fund_id = p_fund_id
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
    LEFT JOIN profiles ibp ON ibp.id = p.ib_parent_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    DECLARE
      v_ownership_pct numeric;
      v_inv_gross numeric;
      v_inv_fee numeric;
      v_inv_net numeric;
      v_inv_ib numeric := 0;
      v_ref_id text;
    BEGIN
      v_investor_count := v_investor_count + 1;
      
      -- Calculate ownership and yield
      v_ownership_pct := (v_inv.balance / v_current_aum) * 100;
      v_inv_gross := v_gross_yield * (v_inv.balance / v_current_aum);
      v_inv_fee := v_inv_gross * (v_inv.fee_pct / 100);
      v_inv_net := v_inv_gross - v_inv_fee;
      
      -- Calculate IB commission if applicable
      IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_percentage > 0 THEN
        v_inv_ib := v_inv_net * (v_inv.ib_percentage / 100);
      END IF;
      
      v_ref_id := 'yield_' || v_fund_code || '_' || p_yield_date::text || '_' || v_inv.investor_id::text;
      
      -- Accumulate totals
      v_total_net := v_total_net + v_inv_net;
      v_total_fees := v_total_fees + v_inv_fee;
      v_total_ib_fees := v_total_ib_fees + v_inv_ib;
      
      -- Add to distributions array
      v_distributions := v_distributions || jsonb_build_object(
        'investor_id', v_inv.investor_id,
        'investor_name', v_inv.investor_name,
        'current_balance', v_inv.balance,
        'ownership_pct', round(v_ownership_pct, 4),
        'gross_yield', round(v_inv_gross, 8),
        'fee_pct', v_inv.fee_pct,
        'fee_amount', round(v_inv_fee, 8),
        'net_yield', round(v_inv_net, 8),
        'ib_parent_id', v_inv.ib_parent_id,
        'ib_percentage', v_inv.ib_percentage,
        'ib_amount', round(v_inv_ib, 8),
        'reference_id', v_ref_id
      );
      
      -- Add IB credit if applicable
      IF v_inv.ib_parent_id IS NOT NULL AND v_inv_ib > 0 THEN
        v_ib_credits := v_ib_credits || jsonb_build_object(
          'ib_investor_id', v_inv.ib_parent_id,
          'ib_investor_name', v_inv.ib_parent_name,
          'source_investor_id', v_inv.investor_id,
          'source_investor_name', v_inv.investor_name,
          'amount', round(v_inv_ib, 8),
          'ib_percentage', v_inv.ib_percentage
        );
      END IF;
      
      -- Insert yield transaction for investor
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, value_date, 
        asset, fund_class, source, visibility_scope, reference_id, created_by
      ) VALUES (
        v_inv.investor_id, p_fund_id, 'INTEREST', v_inv_net, p_yield_date,
        v_fund_asset, 'standard', 'system', 'investor_visible', v_ref_id, p_actor_id
      );
      
      -- Update investor position
      UPDATE investor_positions
      SET current_value = current_value + v_inv_net,
          cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_inv_net,
          last_yield_crystallization_date = p_yield_date,
          updated_at = now()
      WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;
    END;
  END LOOP;

  -- Create yield distribution record with CORRECT column names
  INSERT INTO yield_distributions (
    fund_id, effective_date, is_month_end, recorded_aum, 
    gross_yield, net_yield, total_fees, total_ib,
    yield_percentage, purpose, distribution_type, status,
    reference_id, created_by
  ) VALUES (
    p_fund_id, p_yield_date, v_is_month_end, p_new_aum,
    v_gross_yield, v_total_net, v_total_fees, v_total_ib_fees,
    v_yield_pct, p_purpose::aum_purpose, 'standard', 'applied',
    'batch_' || v_fund_code || '_' || p_yield_date::text, p_actor_id
  ) RETURNING id INTO v_distribution_id;

  -- Insert fee allocations
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_distributions)
  LOOP
    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      fee_amount, fee_percentage, base_net_income,
      period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, (v_inv.value->>'investor_id')::uuid,
      '00000000-0000-0000-0000-000000000001',
      (v_inv.value->>'fee_amount')::numeric, (v_inv.value->>'fee_pct')::numeric,
      (v_inv.value->>'gross_yield')::numeric,
      p_yield_date, p_yield_date, p_purpose::aum_purpose, p_actor_id
    );
  END LOOP;

  -- Insert IB allocations
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_ib_credits)
  LOOP
    INSERT INTO ib_allocations (
      distribution_id, fund_id, ib_investor_id, source_investor_id,
      ib_fee_amount, ib_percentage, source_net_income,
      effective_date, period_start, period_end, purpose, source, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, 
      (v_inv.value->>'ib_investor_id')::uuid,
      (v_inv.value->>'source_investor_id')::uuid,
      (v_inv.value->>'amount')::numeric, (v_inv.value->>'ib_percentage')::numeric,
      (v_inv.value->>'amount')::numeric / ((v_inv.value->>'ib_percentage')::numeric / 100),
      p_yield_date, p_yield_date, p_yield_date, p_purpose::aum_purpose, 'yield_distribution', p_actor_id
    );
  END LOOP;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'aum_event_id', v_aum_event_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'fund_asset', v_fund_asset,
    'effective_date', p_yield_date,
    'purpose', p_purpose,
    'is_month_end', v_is_month_end,
    'current_aum', v_current_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'yield_percentage', round(v_yield_pct, 4),
    'investor_count', v_investor_count,
    'distributions', v_distributions,
    'ib_credits', v_ib_credits
  );

  RETURN v_result;
END;
$$;