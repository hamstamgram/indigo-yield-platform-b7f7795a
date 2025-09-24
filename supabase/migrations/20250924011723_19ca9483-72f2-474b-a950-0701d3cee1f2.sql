-- Disable USD-based calculations and update yield functions to work with native tokens

-- Update apply_daily_yield_to_fund function to work purely with native token amounts
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(p_fund_id uuid, p_daily_yield_percentage numeric, p_application_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_fund_aum NUMERIC(28,10);
  v_total_yield NUMERIC(28,10);
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_position RECORD;
  v_yield_amount NUMERIC(28,10);
  v_new_value NUMERIC(28,10);
  v_fund_code TEXT;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get fund code and latest AUM for this fund (stored in native token amount)
  SELECT f.code, fda.total_aum INTO v_fund_code, v_fund_aum
  FROM public.funds f
  LEFT JOIN public.fund_daily_aum fda ON fda.fund_id = f.id 
    AND fda.aum_date <= p_application_date
  WHERE f.id = p_fund_id 
  ORDER BY fda.aum_date DESC
  LIMIT 1;
  
  IF v_fund_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM data found for fund. Please set daily AUM first.';
  END IF;
  
  -- Calculate total yield in native tokens
  v_total_yield := v_fund_aum * (p_daily_yield_percentage / 100);
  
  -- Update AUM percentages before applying yield (based on native token values)
  PERFORM public.update_investor_aum_percentages(p_fund_id, v_fund_aum);
  
  -- Create yield application record
  INSERT INTO public.daily_yield_applications (
    application_date,
    asset_code,
    total_aum,
    daily_yield_percentage,
    total_yield_generated,
    applied_by
  ) VALUES (
    p_application_date,
    v_fund_code,
    v_fund_aum,
    p_daily_yield_percentage,
    v_total_yield,
    auth.uid()
  ) RETURNING id INTO v_application_id;
  
  -- Apply yield to each investor based on their native token percentage
  FOR v_position IN 
    SELECT * FROM public.investor_positions 
    WHERE fund_id = p_fund_id 
    AND current_value > 0
    AND aum_percentage > 0
  LOOP
    -- Calculate individual yield amount in native tokens
    v_yield_amount := v_position.current_value * (p_daily_yield_percentage / 100);
    v_new_value := v_position.current_value + v_yield_amount;
    
    -- Update position value (all in native token amounts)
    UPDATE public.investor_positions 
    SET 
      current_value = v_new_value,
      unrealized_pnl = unrealized_pnl + v_yield_amount,
      updated_at = now(),
      last_modified_by = auth.uid()
    WHERE investor_id = v_position.investor_id 
    AND fund_id = p_fund_id;
    
    -- Log the yield distribution (all amounts in native tokens)
    INSERT INTO public.yield_distribution_log (
      application_date,
      user_id,
      asset_code,
      balance_before,
      yield_amount,
      balance_after,
      percentage_owned,
      daily_yield_application_id
    ) VALUES (
      p_application_date,
      v_position.investor_id,
      v_fund_code,
      v_position.current_value,
      v_yield_amount,
      v_new_value,
      v_position.aum_percentage,
      v_application_id
    );
    
    v_investors_affected := v_investors_affected + 1;
  END LOOP;
  
  -- Update application with final count
  UPDATE public.daily_yield_applications
  SET investors_affected = v_investors_affected
  WHERE id = v_application_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'fund_aum_native', v_fund_aum,
    'total_yield_generated_native', v_total_yield,
    'investors_affected', v_investors_affected,
    'asset_code', v_fund_code
  );
END;
$function$;

-- Update set_fund_daily_aum to work with native token amounts
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(p_fund_id uuid, p_aum_amount numeric, p_aum_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_investor_count INTEGER;
  v_fund_code TEXT;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get fund code
  SELECT code INTO v_fund_code FROM public.funds WHERE id = p_fund_id;
  
  -- Count active investors in this fund
  SELECT COUNT(DISTINCT investor_id) INTO v_investor_count
  FROM public.investor_positions
  WHERE fund_id = p_fund_id 
  AND current_value > 0;
  
  -- Insert or update AUM entry (amount is in native tokens)
  INSERT INTO public.fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    investor_count,
    updated_by
  ) VALUES (
    p_fund_id,
    p_aum_date,
    p_aum_amount,
    v_investor_count,
    auth.uid()
  )
  ON CONFLICT (fund_id, aum_date) 
  DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    investor_count = EXCLUDED.investor_count,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
    
  -- Update investor AUM percentages based on native token amounts
  PERFORM public.update_investor_aum_percentages(p_fund_id, p_aum_amount);
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'aum_date', p_aum_date,
    'total_aum_native', p_aum_amount,
    'investor_count', v_investor_count
  );
END;
$function$;