-- Create support tickets system
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'account', 'trading')),
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Create support ticket messages for conversation history
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS on support tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Support ticket policies
CREATE POLICY "Users can view own tickets" ON public.support_tickets 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own tickets" ON public.support_tickets 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own open tickets" ON public.support_tickets 
  FOR UPDATE USING (user_id = auth.uid() AND status = 'open');

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets 
  FOR ALL USING (is_admin_v2());

-- Support ticket message policies  
CREATE POLICY "Users can view messages for own tickets" ON public.support_ticket_messages 
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages to own tickets" ON public.support_ticket_messages 
  FOR INSERT WITH CHECK (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "Admins can manage all messages" ON public.support_ticket_messages 
  FOR ALL USING (is_admin_v2());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- Create function to get ticket statistics
CREATE OR REPLACE FUNCTION public.get_support_ticket_stats()
RETURNS TABLE(
  total_tickets INTEGER,
  open_tickets INTEGER,
  in_progress_tickets INTEGER,
  resolved_tickets INTEGER,
  avg_resolution_time INTERVAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_tickets,
    COUNT(*) FILTER (WHERE status = 'open')::INTEGER as open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress')::INTEGER as in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved')::INTEGER as resolved_tickets,
    AVG(resolved_at - created_at) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time
  FROM public.support_tickets;
END;
$$;

-- Create reconciliation table for admin tools
CREATE TABLE IF NOT EXISTS public.reconciliation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fund_id UUID REFERENCES public.funds(id),
  total_nav NUMERIC(28,10) NOT NULL DEFAULT 0,
  total_positions NUMERIC(28,10) NOT NULL DEFAULT 0,
  variance NUMERIC(28,10) NOT NULL DEFAULT 0,
  variance_percentage NUMERIC(10,4) NOT NULL DEFAULT 0,
  discrepancies JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'resolved')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on reconciliation table
ALTER TABLE public.reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reconciliation reports" ON public.reconciliation_reports 
  FOR ALL USING (is_admin_v2());

-- Create function for daily reconciliation
CREATE OR REPLACE FUNCTION public.generate_daily_reconciliation(p_date DATE DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fund RECORD;
  v_nav_total NUMERIC(28,10);
  v_positions_total NUMERIC(28,10);
  v_variance NUMERIC(28,10);
  v_variance_pct NUMERIC(10,4);
  v_discrepancies JSONB := '[]'::jsonb;
  v_report_id UUID;
BEGIN
  -- Only allow admins
  IF NOT is_admin_v2() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Process each active fund
  FOR v_fund IN 
    SELECT * FROM public.funds WHERE status = 'active'
  LOOP
    -- Get NAV total from daily_nav table
    SELECT COALESCE(aum, 0) INTO v_nav_total
    FROM public.daily_nav
    WHERE fund_id = v_fund.id 
      AND nav_date = p_date
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get positions total
    SELECT COALESCE(SUM(current_value), 0) INTO v_positions_total
    FROM public.investor_positions
    WHERE fund_id = v_fund.id;

    -- Calculate variance
    v_variance := v_positions_total - v_nav_total;
    v_variance_pct := CASE 
      WHEN v_nav_total > 0 THEN (v_variance / v_nav_total) * 100
      ELSE 0
    END;

    -- Create reconciliation report
    INSERT INTO public.reconciliation_reports (
      report_date,
      fund_id,
      total_nav,
      total_positions,
      variance,
      variance_percentage,
      discrepancies,
      created_by
    ) VALUES (
      p_date,
      v_fund.id,
      v_nav_total,
      v_positions_total,
      v_variance,
      v_variance_pct,
      v_discrepancies,
      auth.uid()
    ) RETURNING id INTO v_report_id;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'report_date', p_date,
    'funds_processed', (SELECT COUNT(*) FROM public.funds WHERE status = 'active')
  );
END;
$$;