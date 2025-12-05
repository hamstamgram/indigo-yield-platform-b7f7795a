-- Create platform fees tracking table
CREATE TABLE IF NOT EXISTS public.platform_fees_collected (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id),
  asset_code TEXT NOT NULL,
  fee_month DATE NOT NULL,
  gross_yield NUMERIC(28,10) NOT NULL DEFAULT 0,
  fee_rate_percentage NUMERIC(5,4) NOT NULL,
  fee_amount NUMERIC(28,10) NOT NULL DEFAULT 0,
  net_yield NUMERIC(28,10) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(investor_id, asset_code, fee_month)
);

-- Create monthly fee summary table
CREATE TABLE IF NOT EXISTS public.monthly_fee_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_month DATE NOT NULL,
  asset_code TEXT NOT NULL,
  total_gross_yield NUMERIC(28,10) NOT NULL DEFAULT 0,
  total_fees_collected NUMERIC(28,10) NOT NULL DEFAULT 0,
  total_net_yield NUMERIC(28,10) NOT NULL DEFAULT 0,
  investor_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(summary_month, asset_code)
);

-- Enable RLS
ALTER TABLE public.platform_fees_collected ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_fee_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for platform_fees_collected
CREATE POLICY "Admin can manage platform fees" ON public.platform_fees_collected
  FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "Investors can view own platform fees" ON public.platform_fees_collected
  FOR SELECT USING (
    investor_id IN (
      SELECT i.id FROM public.investors i WHERE i.profile_id = auth.uid()
    )
  );

-- RLS policies for monthly_fee_summary  
CREATE POLICY "Admin can manage fee summary" ON public.monthly_fee_summary
  FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());

CREATE POLICY "Users can view fee summary" ON public.monthly_fee_summary
  FOR SELECT USING (true);

-- Enhanced function to apply daily yield with platform fee calculation
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_fees(
  p_fund_id UUID,
  p_daily_yield_percentage NUMERIC,
  p_application_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_fund_aum NUMERIC(28,10);
  v_total_yield NUMERIC(28,10);
  v_total_fees NUMERIC(28,10) := 0;
  v_investors_affected INTEGER := 0;
  v_application_id UUID;
  v_position RECORD;
  v_gross_yield NUMERIC(28,10);
  v_fee_amount NUMERIC(28,10);
  v_net_yield NUMERIC(28,10);
  v_fund_code TEXT;
  v_investor_fee_rate NUMERIC(5,4);
BEGIN
  -- Only allow admins
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get fund details
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
  
  -- Calculate total gross yield
  v_total_yield := v_fund_aum * (p_daily_yield_percentage / 100);
  
  -- Update AUM percentages
  PERFORM public.update_investor_aum_percentages(p_fund_id, v_fund_aum);
  
  -- Create yield application record
  INSERT INTO public.daily_yield_applications (
    application_date, asset_code, total_aum, daily_yield_percentage,
    total_yield_generated, applied_by
  ) VALUES (
    p_application_date, v_fund_code, v_fund_aum, p_daily_yield_percentage,
    v_total_yield, auth.uid()
  ) RETURNING id INTO v_application_id;
  
  -- Apply yield with fee calculation for each investor
  FOR v_position IN 
    SELECT 
      ip.*,
      COALESCE(p.fee_percentage, 0.02) as investor_fee_rate
    FROM public.investor_positions ip
    JOIN public.investors i ON i.id = ip.investor_id
    LEFT JOIN public.profiles p ON p.id = i.profile_id
    WHERE ip.fund_id = p_fund_id 
    AND ip.current_value > 0
    AND ip.aum_percentage > 0
  LOOP
    -- Calculate individual gross yield
    v_gross_yield := v_position.current_value * (p_daily_yield_percentage / 100);
    
    -- Calculate platform fee
    v_fee_amount := v_gross_yield * v_position.investor_fee_rate;
    v_net_yield := v_gross_yield - v_fee_amount;
    
    -- Track total fees
    v_total_fees := v_total_fees + v_fee_amount;
    
    -- Update position with net yield
    UPDATE public.investor_positions 
    SET 
      current_value = current_value + v_net_yield,
      unrealized_pnl = unrealized_pnl + v_net_yield,
      updated_at = now(),
      last_modified_by = auth.uid()
    WHERE investor_id = v_position.investor_id 
    AND fund_id = p_fund_id;
    
    -- Record platform fee
    INSERT INTO public.platform_fees_collected (
      investor_id, asset_code, fee_month, gross_yield,
      fee_rate_percentage, fee_amount, net_yield, created_by
    ) VALUES (
      v_position.investor_id, v_fund_code, DATE_TRUNC('month', p_application_date),
      v_gross_yield, v_position.investor_fee_rate, v_fee_amount, v_net_yield, auth.uid()
    ) ON CONFLICT (investor_id, asset_code, fee_month) 
    DO UPDATE SET
      gross_yield = platform_fees_collected.gross_yield + EXCLUDED.gross_yield,
      fee_amount = platform_fees_collected.fee_amount + EXCLUDED.fee_amount,
      net_yield = platform_fees_collected.net_yield + EXCLUDED.net_yield;
    
    -- Log yield distribution
    INSERT INTO public.yield_distribution_log (
      application_date, user_id, asset_code, balance_before,
      yield_amount, balance_after, percentage_owned, daily_yield_application_id
    ) VALUES (
      p_application_date, v_position.investor_id, v_fund_code,
      v_position.current_value, v_net_yield,
      v_position.current_value + v_net_yield, v_position.aum_percentage, v_application_id
    );
    
    v_investors_affected := v_investors_affected + 1;
  END LOOP;
  
  -- Update monthly fee summary
  INSERT INTO public.monthly_fee_summary (
    summary_month, asset_code, total_gross_yield, 
    total_fees_collected, total_net_yield, investor_count
  ) VALUES (
    DATE_TRUNC('month', p_application_date), v_fund_code,
    v_total_yield, v_total_fees, v_total_yield - v_total_fees, v_investors_affected
  ) ON CONFLICT (summary_month, asset_code)
  DO UPDATE SET
    total_gross_yield = monthly_fee_summary.total_gross_yield + EXCLUDED.total_gross_yield,
    total_fees_collected = monthly_fee_summary.total_fees_collected + EXCLUDED.total_fees_collected,
    total_net_yield = monthly_fee_summary.total_net_yield + EXCLUDED.total_net_yield;
  
  -- Update application with final counts
  UPDATE public.daily_yield_applications
  SET investors_affected = v_investors_affected
  WHERE id = v_application_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'fund_aum_native', v_fund_aum,
    'total_gross_yield', v_total_yield,
    'total_platform_fees', v_total_fees,
    'total_net_yield', v_total_yield - v_total_fees,
    'investors_affected', v_investors_affected,
    'asset_code', v_fund_code
  );
END;
$$;

-- Function to generate period aggregations (MTD, QTD, YTD, ITD)
CREATE OR REPLACE FUNCTION public.get_investor_period_summary(
  p_investor_id UUID,
  p_asset_code TEXT,
  p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_inception_date DATE;
  v_result JSONB;
  v_mtd JSONB;
  v_qtd JSONB;
  v_ytd JSONB;
  v_itd JSONB;
BEGIN
  -- Get inception date
  SELECT MIN(report_month) INTO v_inception_date
  FROM public.investor_monthly_reports
  WHERE investor_id = p_investor_id AND asset_code = p_asset_code;
  
  -- MTD
  SELECT jsonb_build_object(
    'beginning_balance', SUM(opening_balance),
    'additions', SUM(additions),
    'withdrawals', SUM(withdrawals),
    'net_income', SUM(yield_earned),
    'ending_balance', SUM(closing_balance),
    'rate_of_return', CASE WHEN SUM(opening_balance + additions) > 0 
      THEN ROUND((SUM(yield_earned) / SUM(opening_balance + additions) * 100)::NUMERIC, 2)
      ELSE 0 END
  ) INTO v_mtd
  FROM public.investor_monthly_reports
  WHERE investor_id = p_investor_id 
    AND asset_code = p_asset_code
    AND DATE_TRUNC('month', report_month) = DATE_TRUNC('month', p_as_of_date);
  
  -- QTD  
  SELECT jsonb_build_object(
    'beginning_balance', SUM(opening_balance),
    'additions', SUM(additions),
    'withdrawals', SUM(withdrawals),
    'net_income', SUM(yield_earned),
    'ending_balance', SUM(closing_balance),
    'rate_of_return', CASE WHEN SUM(opening_balance + additions) > 0 
      THEN ROUND((SUM(yield_earned) / SUM(opening_balance + additions) * 100)::NUMERIC, 2)
      ELSE 0 END
  ) INTO v_qtd
  FROM public.investor_monthly_reports
  WHERE investor_id = p_investor_id 
    AND asset_code = p_asset_code
    AND DATE_TRUNC('quarter', report_month) = DATE_TRUNC('quarter', p_as_of_date);
  
  -- YTD
  SELECT jsonb_build_object(
    'beginning_balance', SUM(opening_balance),
    'additions', SUM(additions),
    'withdrawals', SUM(withdrawals),
    'net_income', SUM(yield_earned),
    'ending_balance', SUM(closing_balance),
    'rate_of_return', CASE WHEN SUM(opening_balance + additions) > 0 
      THEN ROUND((SUM(yield_earned) / SUM(opening_balance + additions) * 100)::NUMERIC, 2)
      ELSE 0 END
  ) INTO v_ytd
  FROM public.investor_monthly_reports
  WHERE investor_id = p_investor_id 
    AND asset_code = p_asset_code
    AND DATE_TRUNC('year', report_month) = DATE_TRUNC('year', p_as_of_date);
  
  -- ITD
  SELECT jsonb_build_object(
    'beginning_balance', SUM(opening_balance),
    'additions', SUM(additions),
    'withdrawals', SUM(withdrawals),
    'net_income', SUM(yield_earned),
    'ending_balance', SUM(closing_balance),
    'rate_of_return', CASE WHEN SUM(opening_balance + additions) > 0 
      THEN ROUND((SUM(yield_earned) / SUM(opening_balance + additions) * 100)::NUMERIC, 2)
      ELSE 0 END
  ) INTO v_itd
  FROM public.investor_monthly_reports
  WHERE investor_id = p_investor_id 
    AND asset_code = p_asset_code;
  
  RETURN jsonb_build_object(
    'MTD', COALESCE(v_mtd, '{"beginning_balance":0,"additions":0,"withdrawals":0,"net_income":0,"ending_balance":0,"rate_of_return":0}'::jsonb),
    'QTD', COALESCE(v_qtd, '{"beginning_balance":0,"additions":0,"withdrawals":0,"net_income":0,"ending_balance":0,"rate_of_return":0}'::jsonb),
    'YTD', COALESCE(v_ytd, '{"beginning_balance":0,"additions":0,"withdrawals":0,"net_income":0,"ending_balance":0,"rate_of_return":0}'::jsonb),
    'ITD', COALESCE(v_itd, '{"beginning_balance":0,"additions":0,"withdrawals":0,"net_income":0,"ending_balance":0,"rate_of_return":0}'::jsonb)
  );
END;
$$;