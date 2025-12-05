-- Create investor_monthly_reports table for historical data management
CREATE TABLE public.investor_monthly_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  report_month date NOT NULL, -- First day of month (2024-06-01, 2024-07-01, etc.)
  asset_code text NOT NULL, -- SOL, BTC, ETH, USDC, USDT, EURC
  opening_balance numeric(28,10) DEFAULT 0, -- Token amount at start of month
  closing_balance numeric(28,10) DEFAULT 0, -- Token amount at end of month (EDITABLE)
  additions numeric(28,10) DEFAULT 0, -- Deposits during month (EDITABLE)
  withdrawals numeric(28,10) DEFAULT 0, -- Redemptions during month (EDITABLE)
  yield_earned numeric(28,10) DEFAULT 0, -- Cumulative yield earned in tokens (EDITABLE)
  aum_manual_override numeric(28,10), -- Manually set AUM if needed (EDITABLE)
  entry_date date, -- When investor first joined fund
  exit_date date, -- When investor left fund (nullable)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  edited_by uuid REFERENCES auth.users(id),
  
  -- Unique constraint to prevent duplicate entries
  UNIQUE(investor_id, report_month, asset_code)
);

-- Add indexes for better performance
CREATE INDEX idx_investor_monthly_reports_investor_id ON public.investor_monthly_reports(investor_id);
CREATE INDEX idx_investor_monthly_reports_month ON public.investor_monthly_reports(report_month);
CREATE INDEX idx_investor_monthly_reports_asset ON public.investor_monthly_reports(asset_code);

-- Enable RLS
ALTER TABLE public.investor_monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access historical reports
CREATE POLICY "Admin can manage monthly reports" ON public.investor_monthly_reports
FOR ALL USING (is_admin_v2()) WITH CHECK (is_admin_v2());

-- Add updated_at trigger
CREATE TRIGGER update_investor_monthly_reports_updated_at
  BEFORE UPDATE ON public.investor_monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create helper function to generate monthly report templates
CREATE OR REPLACE FUNCTION public.generate_monthly_report_template(
  p_month date DEFAULT date_trunc('month', CURRENT_DATE),
  p_investor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_investor RECORD;
  v_assets text[] := ARRAY['SOL', 'BTC', 'ETH', 'USDC', 'USDT', 'EURC'];
  v_asset text;
  v_created_count integer := 0;
BEGIN
  -- Only allow admins to run this
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Process specific investor or all investors
  FOR v_investor IN 
    SELECT * FROM public.investors 
    WHERE (p_investor_id IS NULL OR id = p_investor_id)
    AND status = 'active'
  LOOP
    -- Create template for each supported asset
    FOREACH v_asset IN ARRAY v_assets
    LOOP
      INSERT INTO public.investor_monthly_reports (
        investor_id,
        report_month,
        asset_code,
        opening_balance,
        closing_balance,
        additions,
        withdrawals,
        yield_earned,
        entry_date,
        edited_by
      ) VALUES (
        v_investor.id,
        p_month,
        v_asset,
        0, -- Will be manually filled
        0, -- Will be manually filled
        0, -- Will be manually filled
        0, -- Will be manually filled
        0, -- Will be manually filled
        v_investor.onboarding_date,
        auth.uid()
      )
      ON CONFLICT (investor_id, report_month, asset_code) DO NOTHING;
      
      IF FOUND THEN
        v_created_count := v_created_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'month', p_month,
    'templates_created', v_created_count,
    'message', 'Monthly report templates generated successfully'
  );
END;
$function$;