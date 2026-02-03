
-- Fix preview_daily_yield_to_fund_v2 to match frontend parameter names
-- Frontend sends: p_fund_id, p_date, p_new_aum, p_purpose
-- Current DB expects: p_fund_id, p_nav_date, p_gross_return_pct, p_purpose

DROP FUNCTION IF EXISTS preview_daily_yield_to_fund_v2(uuid, date, numeric, text);

CREATE OR REPLACE FUNCTION preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_current_aum numeric;
  v_gross_yield numeric;
  v_investor_count integer;
  v_total_fees numeric := 0;
  v_total_ib_commission numeric := 0;
  v_total_net_yield numeric := 0;
  v_distributions jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_fund record;
  v_investor record;
  v_fee_pct numeric;
  v_investor_yield numeric;
  v_investor_fee numeric;
  v_investor_net_yield numeric;
  v_ib_parent_id uuid;
  v_ib_commission_pct numeric;
  v_ib_amount numeric;
BEGIN
  -- Get fund info
  SELECT id, code, asset, name INTO v_fund
  FROM funds
  WHERE id = p_fund_id;

  IF v_fund.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  -- Calculate gross yield as difference between new AUM and current
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('New AUM (%s) must be greater than current AUM (%s)', p_new_aum, v_current_aum)
    );
  END IF;

  -- Calculate per-investor distributions
  FOR v_investor IN 
    SELECT 
      ip.investor_id,
      p.first_name || ' ' || p.last_name as investor_name,
      ip.current_value,
      CASE 
        WHEN v_current_aum > 0 THEN ip.current_value / v_current_aum 
        ELSE 0 
      END as allocation_pct,
      p.account_type,
      COALESCE(
        (SELECT fee_pct FROM investor_fee_schedule ifs 
         WHERE ifs.investor_id = ip.investor_id 
           AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
           AND ifs.effective_date <= p_date
           AND (ifs.end_date IS NULL OR ifs.end_date >= p_date)
         ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
         LIMIT 1),
        0.20
      ) as fee_pct,
      (SELECT ib.parent_id FROM ib_relationships ib 
       WHERE ib.child_id = ip.investor_id 
         AND ib.is_active = true
         AND ib.effective_date <= p_date
       LIMIT 1) as ib_parent_id,
      (SELECT ib.commission_pct FROM ib_relationships ib 
       WHERE ib.child_id = ip.investor_id 
         AND ib.is_active = true
         AND ib.effective_date <= p_date
       LIMIT 1) as ib_commission_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    -- Calculate this investor's yield based on allocation
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;
    v_fee_pct := v_investor.fee_pct;
    v_investor_fee := v_investor_yield * v_fee_pct;
    v_investor_net_yield := v_investor_yield - v_investor_fee;
    
    -- Handle IB commission
    v_ib_parent_id := v_investor.ib_parent_id;
    v_ib_commission_pct := COALESCE(v_investor.ib_commission_pct, 0);
    v_ib_amount := 0;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_commission_pct > 0 THEN
      v_ib_amount := v_investor_net_yield * v_ib_commission_pct;
      v_total_ib_commission := v_total_ib_commission + v_ib_amount;
      
      -- Add to IB credits
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ib_investor_id', v_ib_parent_id,
        'ib_investor_name', (SELECT first_name || ' ' || last_name FROM profiles WHERE id = v_ib_parent_id),
        'source_investor_id', v_investor.investor_id,
        'source_investor_name', v_investor.investor_name,
        'amount', v_ib_amount,
        'ib_percentage', v_ib_commission_pct * 100,
        'source', 'yield',
        'reference_id', NULL,
        'would_skip', false
      );
    END IF;

    v_total_fees := v_total_fees + v_investor_fee;
    v_total_net_yield := v_total_net_yield + v_investor_net_yield;

    -- Add distribution record
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'account_type', v_investor.account_type,
      'current_balance', v_investor.current_value,
      'allocation_percentage', v_investor.allocation_pct * 100,
      'fee_percentage', v_fee_pct * 100,
      'gross_yield', v_investor_yield,
      'fee_amount', v_investor_fee,
      'net_yield', v_investor_net_yield,
      'new_balance', v_investor.current_value + v_investor_net_yield,
      'position_delta', v_investor_net_yield,
      'ib_parent_id', v_ib_parent_id,
      'ib_parent_name', CASE WHEN v_ib_parent_id IS NOT NULL THEN (SELECT first_name || ' ' || last_name FROM profiles WHERE id = v_ib_parent_id) ELSE NULL END,
      'ib_percentage', v_ib_commission_pct * 100,
      'ib_amount', v_ib_amount,
      'ib_source', CASE WHEN v_ib_parent_id IS NOT NULL THEN 'yield' ELSE NULL END,
      'reference_id', NULL,
      'would_skip', false
    );

    v_investor_count := COALESCE(v_investor_count, 0) + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'nav_date', p_date,
    'effective_date', p_date,
    'current_aum', v_current_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'investor_count', COALESCE(v_investor_count, 0),
    'distributions', v_distributions,
    'ib_credits', v_ib_credits,
    'totals', jsonb_build_object(
      'gross', v_gross_yield,
      'fees', v_total_fees,
      'ib_fees', v_total_ib_commission,
      'net', v_total_net_yield,
      'indigo_credit', v_total_fees - v_total_ib_commission
    )
  );
END;
$$;

-- Fix apply_daily_yield_to_fund_v2 to match frontend parameter names
-- Frontend sends: p_fund_id, p_date, p_gross_amount, p_admin_id, p_purpose
-- Current DB has: p_fund_id, p_date, p_new_aum, p_purpose (missing p_admin_id)

DROP FUNCTION IF EXISTS apply_daily_yield_to_fund_v2(uuid, date, numeric, text);

CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_purpose aum_purpose;
  v_current_aum numeric;
  v_new_aum numeric;
  v_preview jsonb;
  v_distribution_id uuid;
  v_investor jsonb;
  v_investor_id uuid;
  v_period_id uuid;
  v_period_start date;
  v_period_end date;
  v_transaction_id uuid;
  v_created_by uuid;
BEGIN
  -- Convert text to enum
  v_purpose := p_purpose::aum_purpose;
  
  -- Use provided admin_id or fall back to auth.uid()
  v_created_by := COALESCE(p_admin_id, auth.uid());
  
  IF v_created_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get current AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;
  
  -- Calculate new AUM
  v_new_aum := v_current_aum + p_gross_amount;
  
  -- Get or create statement period
  SELECT id, start_date, end_date INTO v_period_id, v_period_start, v_period_end
  FROM statement_periods
  WHERE EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM p_date)
    AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM p_date)
  LIMIT 1;
  
  IF v_period_id IS NULL THEN
    v_period_start := date_trunc('month', p_date)::date;
    v_period_end := (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date;
    
    INSERT INTO statement_periods (start_date, end_date, status)
    VALUES (v_period_start, v_period_end, 'open')
    RETURNING id INTO v_period_id;
  END IF;

  -- Get preview using the new AUM
  v_preview := preview_daily_yield_to_fund_v2(p_fund_id, p_date, v_new_aum, p_purpose);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id,
    distribution_date,
    period_start,
    period_end,
    total_yield,
    total_fees,
    total_ib_commission,
    status,
    purpose,
    created_by
  ) VALUES (
    p_fund_id,
    p_date,
    v_period_start,
    v_period_end,
    (v_preview->'totals'->>'gross')::numeric,
    (v_preview->'totals'->>'fees')::numeric,
    (v_preview->'totals'->>'ib_fees')::numeric,
    'applied',
    v_purpose,
    v_created_by
  )
  ON CONFLICT (fund_id, distribution_date, purpose) 
  DO UPDATE SET
    total_yield = EXCLUDED.total_yield,
    total_fees = EXCLUDED.total_fees,
    total_ib_commission = EXCLUDED.total_ib_commission,
    status = EXCLUDED.status,
    updated_at = now()
  RETURNING id INTO v_distribution_id;

  -- Record AUM with upsert
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_by)
  VALUES (p_fund_id, p_date, v_new_aum, v_purpose, v_created_by)
  ON CONFLICT (fund_id, aum_date, purpose)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  -- Process each investor distribution
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'distributions')
  LOOP
    v_investor_id := (v_investor->>'investor_id')::uuid;
    
    -- Skip if no yield
    IF (v_investor->>'gross_yield')::numeric <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Create fee allocation
    INSERT INTO fee_allocations (
      distribution_id,
      investor_id,
      fund_id,
      base_net_income,
      fee_percentage,
      fee_amount,
      period_start,
      period_end,
      purpose,
      created_by
    ) VALUES (
      v_distribution_id,
      v_investor_id,
      p_fund_id,
      (v_investor->>'gross_yield')::numeric,
      (v_investor->>'fee_percentage')::numeric / 100,
      (v_investor->>'fee_amount')::numeric,
      v_period_start,
      v_period_end,
      v_purpose,
      v_created_by
    )
    ON CONFLICT (distribution_id, investor_id, fund_id)
    DO UPDATE SET
      base_net_income = EXCLUDED.base_net_income,
      fee_percentage = EXCLUDED.fee_percentage,
      fee_amount = EXCLUDED.fee_amount;

    -- Update investor position with net yield
    UPDATE investor_positions
    SET current_value = current_value + (v_investor->>'net_yield')::numeric,
        updated_at = now()
    WHERE investor_id = v_investor_id AND fund_id = p_fund_id;
  END LOOP;
  
  -- Process IB credits
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'ib_credits')
  LOOP
    INSERT INTO ib_allocations (
      source_investor_id,
      ib_investor_id,
      fund_id,
      source_net_income,
      ib_percentage,
      ib_fee_amount,
      effective_date,
      period_start,
      period_end,
      period_id,
      distribution_id,
      purpose,
      created_by
    ) VALUES (
      (v_investor->>'source_investor_id')::uuid,
      (v_investor->>'ib_investor_id')::uuid,
      p_fund_id,
      (v_investor->>'amount')::numeric / NULLIF((v_investor->>'ib_percentage')::numeric / 100, 0),
      (v_investor->>'ib_percentage')::numeric / 100,
      (v_investor->>'amount')::numeric,
      p_date,
      v_period_start,
      v_period_end,
      v_period_id,
      v_distribution_id,
      v_purpose,
      v_created_by
    )
    ON CONFLICT (source_investor_id, fund_id, effective_date, ib_investor_id)
    DO UPDATE SET
      source_net_income = EXCLUDED.source_net_income,
      ib_percentage = EXCLUDED.ib_percentage,
      ib_fee_amount = EXCLUDED.ib_fee_amount;
  END LOOP;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'YIELD_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    v_created_by,
    v_preview
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'preview', v_preview
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION preview_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text) TO authenticated;
