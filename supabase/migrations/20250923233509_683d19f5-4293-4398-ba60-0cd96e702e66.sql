-- ============= AUM AND YIELD MANAGEMENT SYSTEM =============

-- Create fund_daily_aum table for daily AUM snapshots per fund
CREATE TABLE public.fund_daily_aum (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  aum_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_aum NUMERIC(28,10) NOT NULL DEFAULT 0,
  investor_count INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one AUM entry per fund per day
  UNIQUE(fund_id, aum_date)
);

-- Add updated_at trigger
CREATE TRIGGER update_fund_daily_aum_updated_at
  BEFORE UPDATE ON public.fund_daily_aum
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.fund_daily_aum ENABLE ROW LEVEL SECURITY;

-- RLS policies for fund_daily_aum
CREATE POLICY "Admins can manage fund daily AUM" 
ON public.fund_daily_aum FOR ALL 
USING (is_admin_v2()) 
WITH CHECK (is_admin_v2());

CREATE POLICY "Users can view fund daily AUM" 
ON public.fund_daily_aum FOR SELECT 
USING (true);

-- Add AUM percentage to investor_positions
ALTER TABLE public.investor_positions 
ADD COLUMN IF NOT EXISTS aum_percentage NUMERIC(8,4) DEFAULT 0;

-- Create function to update investor AUM percentages for a fund
CREATE OR REPLACE FUNCTION public.update_investor_aum_percentages(p_fund_id UUID, p_total_aum NUMERIC DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_aum NUMERIC(28,10);
  v_position RECORD;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Use provided AUM or calculate from current positions
  IF p_total_aum IS NOT NULL THEN
    v_total_aum := p_total_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0) 
    INTO v_total_aum
    FROM public.investor_positions 
    WHERE fund_id = p_fund_id
    AND current_value > 0;
  END IF;
  
  -- Update AUM percentages for all investors in this fund
  FOR v_position IN 
    SELECT investor_id, current_value
    FROM public.investor_positions 
    WHERE fund_id = p_fund_id
    AND current_value > 0
  LOOP
    UPDATE public.investor_positions
    SET aum_percentage = CASE 
      WHEN v_total_aum > 0 THEN (v_position.current_value / v_total_aum) * 100
      ELSE 0 
    END,
    updated_at = now()
    WHERE investor_id = v_position.investor_id 
    AND fund_id = p_fund_id;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

-- Create function to apply daily yield to fund
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id UUID, 
  p_daily_yield_percentage NUMERIC, 
  p_application_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fund_aum NUMERIC(28,10);
  v_total_yield NUMERIC(28,10);
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_position RECORD;
  v_yield_amount NUMERIC(28,10);
  v_new_value NUMERIC(28,10);
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get the latest AUM for this fund
  SELECT total_aum INTO v_fund_aum
  FROM public.fund_daily_aum 
  WHERE fund_id = p_fund_id 
  AND aum_date <= p_application_date
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_fund_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM data found for fund. Please set daily AUM first.';
  END IF;
  
  v_total_yield := v_fund_aum * (p_daily_yield_percentage / 100);
  
  -- Update AUM percentages before applying yield
  PERFORM public.update_investor_aum_percentages(p_fund_id, v_fund_aum);
  
  -- Create yield application record
  INSERT INTO public.daily_yield_applications (
    application_date,
    asset_code, -- This maps to fund code for tracking
    total_aum,
    daily_yield_percentage,
    total_yield_generated,
    applied_by
  ) VALUES (
    p_application_date,
    (SELECT code FROM public.funds WHERE id = p_fund_id),
    v_fund_aum,
    p_daily_yield_percentage,
    v_total_yield,
    auth.uid()
  ) RETURNING id INTO v_application_id;
  
  -- Apply yield to each investor based on their AUM percentage
  FOR v_position IN 
    SELECT * FROM public.investor_positions 
    WHERE fund_id = p_fund_id 
    AND current_value > 0
    AND aum_percentage > 0
  LOOP
    -- Calculate individual yield amount based on AUM percentage
    v_yield_amount := v_fund_aum * (v_position.aum_percentage / 100) * (p_daily_yield_percentage / 100);
    v_new_value := v_position.current_value + v_yield_amount;
    
    -- Update position value
    UPDATE public.investor_positions 
    SET 
      current_value = v_new_value,
      unrealized_pnl = unrealized_pnl + v_yield_amount,
      updated_at = now(),
      last_modified_by = auth.uid()
    WHERE investor_id = v_position.investor_id 
    AND fund_id = p_fund_id;
    
    -- Log the yield distribution
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
      (SELECT code FROM public.funds WHERE id = p_fund_id),
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
    'fund_aum', v_fund_aum,
    'total_yield_generated', v_total_yield,
    'investors_affected', v_investors_affected
  );
END;
$$;

-- Create function to set daily fund AUM
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id UUID,
  p_aum_amount NUMERIC,
  p_aum_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_investor_count INTEGER;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Count active investors in this fund
  SELECT COUNT(DISTINCT investor_id) INTO v_investor_count
  FROM public.investor_positions
  WHERE fund_id = p_fund_id 
  AND current_value > 0;
  
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
    v_investor_count,
    auth.uid()
  )
  ON CONFLICT (fund_id, aum_date) 
  DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    investor_count = EXCLUDED.investor_count,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
    
  -- Update investor AUM percentages
  PERFORM public.update_investor_aum_percentages(p_fund_id, p_aum_amount);
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'aum_date', p_aum_date,
    'total_aum', p_aum_amount,
    'investor_count', v_investor_count
  );
END;
$$;

-- Update the addAssetToInvestor function to work with funds
CREATE OR REPLACE FUNCTION public.add_fund_to_investor(
  p_investor_id UUID,
  p_fund_id UUID,
  p_initial_investment NUMERIC DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fund_class TEXT;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  IF v_fund_class IS NULL THEN
    RAISE EXCEPTION 'Fund not found';
  END IF;
  
  -- Create or update investor position
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    fund_class,
    shares,
    cost_basis,
    current_value,
    last_modified_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_fund_class,
    p_initial_investment, -- Shares = initial investment for simplicity
    p_initial_investment,
    p_initial_investment,
    auth.uid()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    shares = investor_positions.shares + EXCLUDED.shares,
    cost_basis = investor_positions.cost_basis + EXCLUDED.cost_basis,
    current_value = investor_positions.current_value + EXCLUDED.current_value,
    last_modified_by = EXCLUDED.last_modified_by,
    updated_at = now();
  
  -- Update AUM percentages for this fund
  PERFORM public.update_investor_aum_percentages(p_fund_id);
  
  RETURN TRUE;
END;
$$;