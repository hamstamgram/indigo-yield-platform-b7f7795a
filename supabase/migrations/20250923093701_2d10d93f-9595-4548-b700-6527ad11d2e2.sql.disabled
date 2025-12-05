-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;

-- Create the trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- Create enhanced withdrawal request status tracking
CREATE TABLE IF NOT EXISTS public.withdrawal_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.withdrawal_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal history" ON public.withdrawal_status_history 
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.withdrawal_requests 
      WHERE investor_id IN (
        SELECT id FROM public.investors WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage withdrawal history" ON public.withdrawal_status_history 
  FOR ALL USING (is_admin_v2());

-- Create fund performance tracking table
CREATE TABLE IF NOT EXISTS public.fund_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  aum NUMERIC(28,10) NOT NULL DEFAULT 0,
  nav_per_share NUMERIC(28,10),
  daily_return_pct NUMERIC(10,6),
  mtd_return_pct NUMERIC(10,6),
  qtd_return_pct NUMERIC(10,6),
  ytd_return_pct NUMERIC(10,6),
  inception_return_pct NUMERIC(10,6),
  sharpe_ratio NUMERIC(10,6),
  max_drawdown_pct NUMERIC(10,6),
  volatility_pct NUMERIC(10,6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.fund_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fund performance" ON public.fund_performance_metrics 
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage fund performance" ON public.fund_performance_metrics 
  FOR ALL USING (is_admin_v2());