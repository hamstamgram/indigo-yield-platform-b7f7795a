-- =====================================================
-- CRITICAL FIX: Drop ALL function overloads and recreate single versions
-- This fixes the "Could not choose the best candidate function" error
-- =====================================================

-- Drop ALL existing overloads of preview_daily_yield_to_fund_v2
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, public.aum_purpose);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, public.aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(text, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(text, date, numeric, public.aum_purpose);

-- Drop ALL existing overloads of apply_daily_yield_to_fund_v2
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, public.aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, public.aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid, public.aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(text, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(text, date, numeric, public.aum_purpose);

-- =====================================================
-- CREATE preview_daily_yield_to_fund_v2 (text parameter only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purpose aum_purpose;
  v_fund_record RECORD;
  v_prev_aum numeric;
  v_gross_yield numeric;
  v_result jsonb;
  v_investor_results jsonb := '[]'::jsonb;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_net numeric := 0;
  v_investor RECORD;
  v_investor_aum numeric;
  v_investor_share numeric;
  v_investor_gross numeric;
  v_investor_fee_pct numeric;
  v_investor_fee numeric;
  v_investor_ib_pct numeric;
  v_investor_ib numeric;
  v_investor_net numeric;
  v_ib_parent_name text;
BEGIN
  -- Convert text to enum
  v_purpose := p_purpose::aum_purpose;

  -- Get fund details
  SELECT * INTO v_fund_record FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Fund not found');
  END IF;

  -- Get previous AUM for this fund and purpose
  SELECT total_aum INTO v_prev_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND purpose = v_purpose
    AND aum_date < p_date
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_prev_aum IS NULL OR v_prev_aum = 0 THEN
    RETURN jsonb_build_object('error', 'No previous AUM found for this fund');
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_prev_aum;

  -- Get all investors with positions in this fund
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      ip.current_value as position_balance,
      p.first_name,
      p.last_name,
      p.ib_parent_id,
      COALESCE(
        (SELECT ifs.fee_pct 
         FROM investor_fee_schedule ifs 
         WHERE ifs.investor_id = ip.investor_id 
           AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
           AND ifs.effective_date <= p_date
           AND (ifs.end_date IS NULL OR ifs.end_date >= p_date)
         ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
         LIMIT 1),
        0
      ) as fee_pct,
      COALESCE(p.ib_commission_pct, 0) as ib_commission_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND p.is_active = true
  LOOP
    -- Calculate investor's share of the yield
    v_investor_aum := v_investor.position_balance;
    v_investor_share := v_investor_aum / v_prev_aum;
    v_investor_gross := v_gross_yield * v_investor_share;
    
    -- Get fee percentage (already fetched)
    v_investor_fee_pct := v_investor.fee_pct;
    v_investor_fee := v_investor_gross * v_investor_fee_pct;
    
    -- Calculate IB commission (on fee, not on gross)
    v_investor_ib_pct := v_investor.ib_commission_pct;
    v_investor_ib := v_investor_fee * v_investor_ib_pct;
    
    -- Net to investor
    v_investor_net := v_investor_gross - v_investor_fee;
    
    -- Get IB parent name if exists
    IF v_investor.ib_parent_id IS NOT NULL THEN
      SELECT CONCAT(first_name, ' ', last_name) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_parent_name := NULL;
    END IF;
    
    -- Add to results
    v_investor_results := v_investor_results || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', CONCAT(v_investor.first_name, ' ', v_investor.last_name),
      'position_balance', v_investor_aum,
      'share_pct', v_investor_share * 100,
      'gross_yield', v_investor_gross,
      'fee_pct', v_investor_fee_pct * 100,
      'fee_amount', v_investor_fee,
      'ib_parent_id', v_investor.ib_parent_id,
      'ib_parent_name', v_ib_parent_name,
      'ib_commission_pct', v_investor_ib_pct * 100,
      'ib_amount', v_investor_ib,
      'net_yield', v_investor_net
    );
    
    -- Accumulate totals
    v_total_fees := v_total_fees + v_investor_fee;
    v_total_ib := v_total_ib + v_investor_ib;
    v_total_net := v_total_net + v_investor_net;
  END LOOP;

  -- Build final result
  v_result := jsonb_build_object(
    'fund_id', p_fund_id,
    'fund_name', v_fund_record.name,
    'date', p_date,
    'purpose', p_purpose,
    'previous_aum', v_prev_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'total_fees', v_total_fees,
    'total_ib_commission', v_total_ib,
    'total_net_to_investors', v_total_net,
    'indigo_revenue', v_total_fees - v_total_ib,
    'investor_count', jsonb_array_length(v_investor_results),
    'investors', v_investor_results
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- CREATE apply_daily_yield_to_fund_v2 (text parameter only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purpose aum_purpose;
  v_preview jsonb;
  v_distribution_id uuid;
  v_investor jsonb;
  v_investor_id uuid;
  v_created_by uuid;
  v_period_id uuid;
  v_period_start date;
  v_period_end date;
BEGIN
  -- Convert text to enum
  v_purpose := p_purpose::aum_purpose;
  
  -- Get current user
  v_created_by := auth.uid();
  
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

  -- First get preview to use same calculations
  v_preview := preview_daily_yield_to_fund_v2(p_fund_id, p_date, p_new_aum, p_purpose);
  
  IF v_preview ? 'error' THEN
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
    (v_preview->>'gross_yield')::numeric,
    (v_preview->>'total_fees')::numeric,
    (v_preview->>'total_ib_commission')::numeric,
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

  -- Record AUM
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_by)
  VALUES (p_fund_id, p_date, p_new_aum, v_purpose, v_created_by)
  ON CONFLICT (fund_id, aum_date, purpose)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  -- Process each investor
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'investors')
  LOOP
    v_investor_id := (v_investor->>'investor_id')::uuid;
    
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
      (v_investor->>'fee_pct')::numeric / 100,
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

    -- Create IB allocation if applicable
    IF (v_investor->>'ib_parent_id') IS NOT NULL AND (v_investor->>'ib_amount')::numeric > 0 THEN
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
        v_investor_id,
        (v_investor->>'ib_parent_id')::uuid,
        p_fund_id,
        (v_investor->>'gross_yield')::numeric,
        (v_investor->>'ib_commission_pct')::numeric / 100,
        (v_investor->>'ib_amount')::numeric,
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
    END IF;

    -- Update investor position with net yield
    UPDATE investor_positions
    SET current_value = current_value + (v_investor->>'net_yield')::numeric,
        updated_at = now()
    WHERE investor_id = v_investor_id AND fund_id = p_fund_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'preview', v_preview
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;