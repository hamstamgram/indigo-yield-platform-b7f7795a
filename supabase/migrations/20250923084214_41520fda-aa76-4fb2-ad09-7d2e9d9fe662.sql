-- Add daily_aum_entries table for tracking AUM snapshots
CREATE TABLE IF NOT EXISTS public.daily_aum_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date DATE NOT NULL,
  fund_id UUID REFERENCES public.funds(id),
  total_aum NUMERIC(28,10) NOT NULL DEFAULT 0,
  investor_count INTEGER NOT NULL DEFAULT 0,
  asset_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create unique constraint to prevent duplicate entries
ALTER TABLE public.daily_aum_entries 
ADD CONSTRAINT unique_daily_aum_entry UNIQUE (entry_date, fund_id);

-- Enable RLS
ALTER TABLE public.daily_aum_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage AUM entries" 
ON public.daily_aum_entries 
FOR ALL 
USING (is_admin_v2()) 
WITH CHECK (is_admin_v2());

CREATE POLICY "Users can view AUM entries" 
ON public.daily_aum_entries 
FOR SELECT 
USING (true);

-- Create function to create daily AUM entry
CREATE OR REPLACE FUNCTION public.create_daily_aum_entry(
  p_entry_date DATE DEFAULT CURRENT_DATE,
  p_fund_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_fund RECORD;
  v_total_aum NUMERIC(28,10);
  v_investor_count INTEGER;
  v_asset_breakdown JSONB;
  v_entry_id UUID;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Process specific fund or all funds
  FOR v_fund IN 
    SELECT * FROM public.funds 
    WHERE (p_fund_id IS NULL OR id = p_fund_id)
    AND status = 'active'
  LOOP
    -- Calculate total AUM for this fund
    SELECT 
      COALESCE(SUM(ip.current_value), 0),
      COUNT(DISTINCT ip.investor_id),
      jsonb_object_agg(f.asset, SUM(ip.current_value))
    INTO v_total_aum, v_investor_count, v_asset_breakdown
    FROM public.investor_positions ip
    JOIN public.funds f ON f.id = ip.fund_id
    WHERE ip.fund_id = v_fund.id
    AND ip.current_value > 0;
    
    -- Insert or update AUM entry
    INSERT INTO public.daily_aum_entries (
      entry_date,
      fund_id,
      total_aum,
      investor_count,
      asset_breakdown,
      created_by
    ) VALUES (
      p_entry_date,
      v_fund.id,
      v_total_aum,
      v_investor_count,
      v_asset_breakdown,
      auth.uid()
    )
    ON CONFLICT (entry_date, fund_id) 
    DO UPDATE SET
      total_aum = EXCLUDED.total_aum,
      investor_count = EXCLUDED.investor_count,
      asset_breakdown = EXCLUDED.asset_breakdown,
      created_by = EXCLUDED.created_by,
      created_at = now();
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'entry_date', p_entry_date,
    'funds_processed', (SELECT COUNT(*) FROM public.funds WHERE (p_fund_id IS NULL OR id = p_fund_id) AND status = 'active')
  );
END;
$$;

-- Create function to generate statement data
CREATE OR REPLACE FUNCTION public.generate_statement_data(
  p_investor_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_investor RECORD;
  v_positions JSONB;
  v_transactions JSONB;
  v_fees JSONB;
  v_summary JSONB;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate period dates
  v_period_start := DATE(p_period_year || '-' || LPAD(p_period_month::text, 2, '0') || '-01');
  v_period_end := (v_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Get investor details
  SELECT 
    i.*,
    p.first_name,
    p.last_name,
    p.email
  INTO v_investor
  FROM public.investors i
  JOIN public.profiles p ON p.id = i.profile_id
  WHERE i.id = p_investor_id;
  
  IF v_investor IS NULL THEN
    RAISE EXCEPTION 'Investor not found';
  END IF;
  
  -- Get current positions
  SELECT jsonb_agg(
    jsonb_build_object(
      'fund_id', ip.fund_id,
      'fund_name', f.name,
      'fund_class', ip.fund_class,
      'shares', ip.shares,
      'current_value', ip.current_value,
      'cost_basis', ip.cost_basis,
      'unrealized_pnl', ip.unrealized_pnl,
      'realized_pnl', ip.realized_pnl
    )
  ) INTO v_positions
  FROM public.investor_positions ip
  JOIN public.funds f ON f.id = ip.fund_id
  WHERE ip.investor_id = p_investor_id
  AND ip.current_value > 0;
  
  -- Get period transactions (placeholder - would need transactions_v2 table)
  v_transactions := '[]'::JSONB;
  
  -- Get period fees
  SELECT jsonb_agg(
    jsonb_build_object(
      'fee_type', fc.fee_type,
      'fund_id', fc.fund_id,
      'calculation_date', fc.calculation_date,
      'fee_amount', fc.fee_amount,
      'rate_bps', fc.rate_bps
    )
  ) INTO v_fees
  FROM public.fee_calculations fc
  WHERE fc.investor_id = p_investor_id
  AND fc.calculation_date >= v_period_start
  AND fc.calculation_date <= v_period_end;
  
  -- Calculate summary
  SELECT jsonb_build_object(
    'total_aum', COALESCE(SUM(ip.current_value), 0),
    'total_pnl', COALESCE(SUM(ip.unrealized_pnl + ip.realized_pnl), 0),
    'total_fees', COALESCE((
      SELECT SUM(fc.fee_amount) 
      FROM public.fee_calculations fc 
      WHERE fc.investor_id = p_investor_id 
      AND fc.calculation_date >= v_period_start 
      AND fc.calculation_date <= v_period_end
    ), 0)
  ) INTO v_summary
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id;
  
  -- Return complete statement data
  RETURN jsonb_build_object(
    'investor', row_to_json(v_investor),
    'period', jsonb_build_object(
      'year', p_period_year,
      'month', p_period_month,
      'start_date', v_period_start,
      'end_date', v_period_end
    ),
    'positions', COALESCE(v_positions, '[]'::JSONB),
    'transactions', COALESCE(v_transactions, '[]'::JSONB),
    'fees', COALESCE(v_fees, '[]'::JSONB),
    'summary', v_summary,
    'generated_at', now()
  );
END;
$$;