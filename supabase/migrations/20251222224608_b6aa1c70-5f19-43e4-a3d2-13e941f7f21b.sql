-- Clean up all versions of preview_daily_yield_to_fund_v2 and ensure proper full_name fix
-- Drop all existing overloads to avoid ambiguity
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);

-- Create the correct 4-param version with full_name fix
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_old_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_fund RECORD;
  v_investor_rows JSONB := '[]'::JSONB;
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID;
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_investor_row JSONB;
BEGIN
  -- Validate purpose
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Check if month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  
  -- Get INDIGO FEES account dynamically (using account_type, not full_name)
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees'
  LIMIT 1;
  
  -- Get previous AUM
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_old_aum IS NULL THEN
    -- Try to get from investor positions sum
    SELECT COALESCE(SUM(current_value), 0) INTO v_old_aum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0;
  END IF;
  
  IF v_old_aum IS NULL OR v_old_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No previous AUM found for this fund');
  END IF;
  
  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_old_aum;
  
  -- Process each investor
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_class,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
      p.email,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;
    
    -- Calculate share of yield
    v_share := rec.current_value / v_old_aum;
    v_gross := v_gross_yield * v_share;
    
    -- Get fee percentage (INDIGO FEES doesn't pay fees)
    IF rec.investor_id = v_indigo_fees_id OR rec.account_type = 'fees' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
        AND effective_date <= p_date
      ORDER BY effective_date DESC
      LIMIT 1;
      
      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20;
      END IF;
      
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100.0));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;
    
    -- Calculate IB commission
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_fee > 0 AND rec.account_type != 'fees' THEN
      v_ib_amount := v_fee * (v_ib_pct / 100.0);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
    END IF;
    
    -- Build investor row
    v_investor_row := jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', rec.investor_name,
      'email', rec.email,
      'current_balance', rec.current_value,
      'ownership_pct', ROUND((v_share * 100)::numeric, 4),
      'gross_yield', ROUND(v_gross::numeric, 8),
      'fee_pct', v_fee_pct,
      'fee_amount', ROUND(v_fee::numeric, 8),
      'net_yield', ROUND(v_net::numeric, 8),
      'new_balance', ROUND((rec.current_value + v_net)::numeric, 8),
      'ib_parent_id', v_ib_parent_id,
      'ib_parent_name', CASE WHEN v_ib_parent_id IS NOT NULL THEN 
        (SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) FROM profiles WHERE id = v_ib_parent_id)
      ELSE NULL END,
      'ib_pct', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount::numeric, 8)
    );
    
    v_investor_rows := v_investor_rows || v_investor_row;
  END LOOP;
  
  -- Return preview
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_asset', v_fund.asset,
    'effective_date', p_date,
    'purpose', p_purpose,
    'is_month_end', v_is_month_end,
    'old_aum', ROUND(v_old_aum::numeric, 8),
    'new_aum', ROUND(p_new_aum::numeric, 8),
    'gross_yield', ROUND(v_gross_yield::numeric, 8),
    'growth_rate', ROUND(((v_gross_yield / v_old_aum) * 100)::numeric, 4),
    'total_fees', ROUND(v_total_fees::numeric, 8),
    'total_ib_fees', ROUND(v_total_ib_fees::numeric, 8),
    'net_platform_fees', ROUND((v_total_fees - v_total_ib_fees)::numeric, 8),
    'investor_count', v_investor_count,
    'investors', v_investor_rows
  );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;