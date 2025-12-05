-- Create missing set_fund_daily_aum function
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id uuid, 
  p_aum_amount numeric, 
  p_aum_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_fund_code TEXT;
  v_current_investor_count INTEGER := 0;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get fund code
  SELECT code INTO v_fund_code
  FROM public.funds
  WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RAISE EXCEPTION 'Fund not found';
  END IF;
  
  -- Count current investors for this fund
  SELECT COUNT(DISTINCT ip.investor_id) INTO v_current_investor_count
  FROM public.investor_positions ip
  WHERE ip.fund_id = p_fund_id
  AND ip.current_value > 0;
  
  -- Insert or update AUM entry
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
    v_current_investor_count,
    auth.uid()
  )
  ON CONFLICT (fund_id, aum_date) 
  DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    investor_count = EXCLUDED.investor_count,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'aum_date', p_aum_date,
    'total_aum', p_aum_amount,
    'investor_count', v_current_investor_count,
    'fund_code', v_fund_code
  );
END;
$function$;
