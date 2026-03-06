-- =====================================================
-- COMPLETE SCHEMA FIX MIGRATION (IDEMPOTENT)
-- Generated: 2025-12-06
-- Purpose: Add all missing tables and RPC functions
-- =====================================================

-- =====================================================
-- SECTION 1: MISSING TABLES
-- =====================================================

-- Table: fund_daily_aum (used by aumService.ts)
CREATE TABLE IF NOT EXISTS public.fund_daily_aum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id TEXT NOT NULL,
  aum_date DATE NOT NULL,
  total_aum NUMERIC NOT NULL DEFAULT 0,
  nav_per_share NUMERIC,
  total_shares NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(fund_id, aum_date)
);

CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_fund_date ON public.fund_daily_aum(fund_id, aum_date DESC);

ALTER TABLE public.fund_daily_aum ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage fund_daily_aum
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage fund_daily_aum" ON public.fund_daily_aum;
  CREATE POLICY "Admins can manage fund_daily_aum" ON public.fund_daily_aum
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Policy: Users can view fund_daily_aum
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view fund_daily_aum" ON public.fund_daily_aum;
  CREATE POLICY "Users can view fund_daily_aum" ON public.fund_daily_aum
    FOR SELECT USING (auth.uid() IS NOT NULL);
END $$;

-- Table: generated_reports (used by PerformanceReportPage.tsx)
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  investor_id UUID REFERENCES public.profiles(id),
  fund_id TEXT,
  report_month DATE,
  report_data JSONB DEFAULT '{}',
  html_content TEXT,
  pdf_url TEXT,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED', 'SENT')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_investor ON public.generated_reports(investor_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_month ON public.generated_reports(report_month DESC);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage generated_reports
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage generated_reports" ON public.generated_reports;
  CREATE POLICY "Admins can manage generated_reports" ON public.generated_reports
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Policy: Users can view own reports
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own reports" ON public.generated_reports;
  CREATE POLICY "Users can view own reports" ON public.generated_reports
    FOR SELECT USING (investor_id = auth.uid());
END $$;

-- Table: investments (used by AdminDashboard.tsx, AdminOperationsHub.tsx)
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id TEXT NOT NULL,
  investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  shares NUMERIC,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'REDEEMED', 'CANCELLED')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investments_investor ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_fund ON public.investments(fund_id);
CREATE INDEX IF NOT EXISTS idx_investments_date ON public.investments(investment_date DESC);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage investments
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage investments" ON public.investments;
  CREATE POLICY "Admins can manage investments" ON public.investments
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Policy: Users can view own investments
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own investments" ON public.investments;
  CREATE POLICY "Users can view own investments" ON public.investments
    FOR SELECT USING (investor_id = auth.uid());
END $$;

-- Table: reports (used by reports feature)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parameters JSONB DEFAULT '{}',
  schedule TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage reports
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
  CREATE POLICY "Admins can manage reports" ON public.reports
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Table: report_definitions
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL,
  template_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage report_definitions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage report_definitions" ON public.report_definitions;
  CREATE POLICY "Admins can manage report_definitions" ON public.report_definitions
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Table: report_schedules
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES public.report_definitions(id),
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  recipients JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage report_schedules
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage report_schedules" ON public.report_schedules;
  CREATE POLICY "Admins can manage report_schedules" ON public.report_schedules
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Table: report_access_logs
CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_access_logs_report ON public.report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user ON public.report_access_logs(user_id);

ALTER TABLE public.report_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view report_access_logs
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view report_access_logs" ON public.report_access_logs;
  CREATE POLICY "Admins can view report_access_logs" ON public.report_access_logs
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Table: investment_summary (aggregated view)
CREATE TABLE IF NOT EXISTS public.investment_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  total_invested NUMERIC DEFAULT 0,
  total_current_value NUMERIC DEFAULT 0,
  total_returns NUMERIC DEFAULT 0,
  return_percentage NUMERIC DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(investor_id)
);

ALTER TABLE public.investment_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage investment_summary
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage investment_summary" ON public.investment_summary;
  CREATE POLICY "Admins can manage investment_summary" ON public.investment_summary
    FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
END $$;

-- Policy: Users can view own investment_summary
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own investment_summary" ON public.investment_summary;
  CREATE POLICY "Users can view own investment_summary" ON public.investment_summary
    FOR SELECT USING (investor_id = auth.uid());
END $$;

-- Table: price_alerts
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  asset_code TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ABOVE', 'BELOW', 'CHANGE_PERCENT')),
  threshold_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage own price_alerts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own price_alerts" ON public.price_alerts;
  CREATE POLICY "Users can manage own price_alerts" ON public.price_alerts
    FOR ALL USING (user_id = auth.uid());
END $$;

-- Table: platform_fees_collected
-- CREATE TABLE IF NOT EXISTS public.platform_fees_collected (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   fee_date DATE NOT NULL,
--   fund_id TEXT,
--   fee_type TEXT NOT NULL,
--   amount NUMERIC NOT NULL,
--   description TEXT,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );

-- CREATE INDEX IF NOT EXISTS idx_platform_fees_date ON public.platform_fees_collected(fee_date DESC);

-- ALTER TABLE public.platform_fees_collected ENABLE ROW LEVEL SECURITY;

-- POLICY: Admins can manage platform_fees_collected
-- DO $$ BEGIN
--   DROP POLICY IF EXISTS "Admins can manage platform_fees_collected" ON public.platform_fees_collected;
--   CREATE POLICY "Admins can manage platform_fees_collected" ON public.platform_fees_collected
--     FOR ALL USING (
--       EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
--     );
-- END $$;

-- Table: monthly_fee_summary
-- CREATE TABLE IF NOT EXISTS public.monthly_fee_summary (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   year INTEGER NOT NULL,
--   month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
--   fund_id TEXT,
--   total_management_fees NUMERIC DEFAULT 0,
--   total_performance_fees NUMERIC DEFAULT 0,
--   total_fees NUMERIC DEFAULT 0,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   UNIQUE(year, month, fund_id)
-- );

-- ALTER TABLE public.monthly_fee_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage monthly_fee_summary
-- DO $$ BEGIN
--   DROP POLICY IF EXISTS "Admins can manage monthly_fee_summary" ON public.monthly_fee_summary;
--   CREATE POLICY "Admins can manage monthly_fee_summary" ON public.monthly_fee_summary
--     FOR ALL USING (
--       EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
--     );
-- END $$;

-- =====================================================
-- SECTION 2: MISSING RPC FUNCTIONS
-- =====================================================

-- Function: get_profile_by_id (used by investorService.ts)
CREATE OR REPLACE FUNCTION public.get_profile_by_id(profile_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  is_admin BOOLEAN,
  fee_percentage NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.is_admin,
    p.fee_percentage,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$$;

-- Function: get_investor_portfolio_summary (used by PortfolioService.ts)
CREATE OR REPLACE FUNCTION public.get_investor_portfolio_summary(p_investor_id UUID)
RETURNS TABLE (
  total_value NUMERIC,
  total_shares NUMERIC,
  fund_count BIGINT,
  total_cost_basis NUMERIC,
  unrealized_gain NUMERIC,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ip.current_value), 0)::NUMERIC as total_value,
    COALESCE(SUM(ip.shares), 0)::NUMERIC as total_shares,
    COUNT(DISTINCT ip.fund_id) as fund_count,
    COALESCE(SUM(ip.cost_basis), 0)::NUMERIC as total_cost_basis,
    COALESCE(SUM(ip.current_value) - SUM(ip.cost_basis), 0)::NUMERIC as unrealized_gain,
    MAX(ip.updated_at) as last_updated
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id;
END;
$$;

-- Function: add_fund_to_investor (used by fundService.ts)
CREATE OR REPLACE FUNCTION public.add_fund_to_investor(
  p_investor_id UUID,
  p_fund_id TEXT,
  p_initial_shares NUMERIC DEFAULT 0,
  p_cost_basis NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position_id UUID;
BEGIN
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    shares,
    cost_basis,
    current_value,
    created_at,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_initial_shares,
    p_cost_basis,
    p_cost_basis,
    now(),
    now()
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    shares = investor_positions.shares + EXCLUDED.shares,
    cost_basis = investor_positions.cost_basis + EXCLUDED.cost_basis,
    updated_at = now()
  RETURNING id INTO v_position_id;

  RETURN v_position_id;
END;
$$;

-- Function: admin_create_transaction (used by adminTransactionService.ts)
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id UUID,
  p_fund_id TEXT,
  p_transaction_type TEXT,
  p_amount NUMERIC,
  p_shares NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can create transactions';
  END IF;

  INSERT INTO public.transactions (
    investor_id,
    fund_id,
    type,
    amount,
    shares,
    notes,
    status,
    created_by,
    created_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_transaction_type,
    p_amount,
    p_shares,
    p_notes,
    'COMPLETED',
    auth.uid(),
    now()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- Function: log_security_event (used by security-logger.ts)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    operation,
    user_id,
    new_data,
    created_at
  ) VALUES (
    'security_events',
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    jsonb_build_object(
      'severity', p_severity,
      'details', p_details,
      'timestamp', now()
    ),
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Function: get_report_statistics
CREATE OR REPLACE FUNCTION public.get_report_statistics(p_period_start DATE, p_period_end DATE)
RETURNS TABLE (
  total_reports BIGINT,
  reports_by_type JSONB,
  reports_sent BIGINT,
  reports_pending BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_reports,
    jsonb_object_agg(COALESCE(report_type, 'unknown'), count) as reports_by_type,
    COUNT(*) FILTER (WHERE status = 'SENT')::BIGINT as reports_sent,
    COUNT(*) FILTER (WHERE status IN ('DRAFT', 'FINALIZED'))::BIGINT as reports_pending
  FROM (
    SELECT report_type, status, COUNT(*) as count
    FROM public.generated_reports
    WHERE created_at >= p_period_start AND created_at <= p_period_end
    GROUP BY report_type, status
  ) sub
  GROUP BY ();
END;
$$;

-- Function: get_user_reports
CREATE OR REPLACE FUNCTION public.get_user_reports(p_user_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  report_type TEXT,
  report_name TEXT,
  report_month DATE,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.report_type,
    gr.report_name,
    gr.report_month,
    gr.status,
    gr.created_at
  FROM public.generated_reports gr
  WHERE gr.investor_id = p_user_id
  ORDER BY gr.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: apply_daily_yield_to_fund
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id TEXT,
  p_rate_date DATE,
  p_daily_rate NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.investor_positions
  SET
    current_value = current_value * (1 + p_daily_rate),
    updated_at = now()
  WHERE fund_id = p_fund_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Log the yield application
  INSERT INTO public.audit_log (table_name, operation, new_data)
  VALUES (
    'investor_positions',
    'YIELD_APPLIED',
    jsonb_build_object(
      'fund_id', p_fund_id,
      'rate_date', p_rate_date,
      'daily_rate', p_daily_rate,
      'positions_updated', v_updated_count
    )
  );

  RETURN v_updated_count;
END;
$$;

-- Function: set_fund_daily_aum
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id TEXT,
  p_aum_date DATE,
  p_total_aum NUMERIC,
  p_nav_per_share NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_aum_id UUID;
BEGIN
  INSERT INTO public.fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    nav_per_share,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    p_total_aum,
    p_nav_per_share,
    auth.uid(),
    now()
  )
  ON CONFLICT (fund_id, aum_date)
  DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    nav_per_share = EXCLUDED.nav_per_share,
    updated_at = now()
  RETURNING id INTO v_aum_id;

  RETURN v_aum_id;
END;
$$;

-- Function: get_fund_net_flows
CREATE OR REPLACE FUNCTION public.get_fund_net_flows(
  p_fund_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  period_date DATE,
  inflows NUMERIC,
  outflows NUMERIC,
  net_flow NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.created_at::DATE as period_date,
    COALESCE(SUM(CASE WHEN t.type IN ('DEPOSIT', 'SUBSCRIPTION') THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type IN ('WITHDRAWAL', 'REDEMPTION') THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type IN ('DEPOSIT', 'SUBSCRIPTION') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'REDEMPTION') THEN -t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions t
  WHERE t.fund_id = p_fund_id
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
    AND t.status = 'COMPLETED'
  GROUP BY t.created_at::DATE
  ORDER BY period_date;
END;
$$;

-- Function: get_investor_period_summary
CREATE OR REPLACE FUNCTION public.get_investor_period_summary(
  p_investor_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  beginning_value NUMERIC,
  ending_value NUMERIC,
  additions NUMERIC,
  redemptions NUMERIC,
  net_income NUMERIC,
  rate_of_return NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(current_value)
      FROM public.investor_positions
      WHERE investor_id = p_investor_id
        AND updated_at <= p_start_date
    ), 0)::NUMERIC as beginning_value,
    COALESCE((
      SELECT SUM(current_value)
      FROM public.investor_positions
      WHERE investor_id = p_investor_id
    ), 0)::NUMERIC as ending_value,
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE investor_id = p_investor_id
        AND type IN ('DEPOSIT', 'SUBSCRIPTION')
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ), 0)::NUMERIC as additions,
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE investor_id = p_investor_id
        AND type IN ('WITHDRAWAL', 'REDEMPTION')
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ), 0)::NUMERIC as redemptions,
    0::NUMERIC as net_income, -- Calculated from yield applications
    0::NUMERIC as rate_of_return; -- Calculated as (ending - beginning - additions + redemptions) / beginning
END;
$$;

-- Function: update_fund_aum_baseline
CREATE OR REPLACE FUNCTION public.update_fund_aum_baseline(
  p_fund_id TEXT,
  p_new_baseline NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.funds
  SET
    aum = p_new_baseline,
    updated_at = now()
  WHERE code = p_fund_id OR id::TEXT = p_fund_id;

  RETURN FOUND;
END;
$$;

-- Function: update_investor_aum_percentages
CREATE OR REPLACE FUNCTION public.update_investor_aum_percentages(p_fund_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_aum NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get total AUM for the fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM public.investor_positions
  WHERE fund_id = p_fund_id;

  -- Update each investor's percentage
  IF v_total_aum > 0 THEN
    UPDATE public.investor_positions
    SET
      aum_percentage = (current_value / v_total_aum) * 100,
      updated_at = now()
    WHERE fund_id = p_fund_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$$;

-- Function: apply_daily_yield_with_fees
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_fees(
  p_fund_id TEXT,
  p_rate_date DATE,
  p_gross_rate NUMERIC,
  p_fee_rate NUMERIC DEFAULT 0
)
RETURNS TABLE (
  positions_updated INTEGER,
  gross_yield NUMERIC,
  fees_collected NUMERIC,
  net_yield NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total_value_before NUMERIC;
  v_gross_yield NUMERIC;
  v_fees NUMERIC;
  v_net_rate NUMERIC;
BEGIN
  -- Calculate net rate after fees
  v_net_rate := p_gross_rate * (1 - p_fee_rate);

  -- Get total value before
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_value_before
  FROM public.investor_positions
  WHERE fund_id = p_fund_id;

  -- Apply net yield
  UPDATE public.investor_positions
  SET
    current_value = current_value * (1 + v_net_rate),
    updated_at = now()
  WHERE fund_id = p_fund_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Calculate yields
  v_gross_yield := v_total_value_before * p_gross_rate;
  v_fees := v_total_value_before * p_gross_rate * p_fee_rate;

  RETURN QUERY SELECT
    v_updated_count,
    v_gross_yield,
    v_fees,
    v_gross_yield - v_fees;
END;
$$;

-- Function: distribute_monthly_yield
CREATE OR REPLACE FUNCTION public.distribute_monthly_yield(
  p_fund_id TEXT,
  p_year INTEGER,
  p_month INTEGER,
  p_total_yield NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_shares NUMERIC;
  v_yield_per_share NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get total shares in the fund
  SELECT COALESCE(SUM(shares), 0) INTO v_total_shares
  FROM public.investor_positions
  WHERE fund_id = p_fund_id AND shares > 0;

  IF v_total_shares > 0 THEN
    v_yield_per_share := p_total_yield / v_total_shares;

    -- Distribute yield proportionally
    UPDATE public.investor_positions
    SET
      current_value = current_value + (shares * v_yield_per_share),
      updated_at = now()
    WHERE fund_id = p_fund_id AND shares > 0;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$$;

-- Function: send_daily_rate_notifications (stub - actual email sending done in app)
CREATE OR REPLACE FUNCTION public.send_daily_rate_notifications(p_rate_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_count INTEGER := 0;
BEGIN
  -- Create notification records for users who have enabled rate notifications
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    created_at
  )
  SELECT
    ns.user_id,
    'DAILY_RATE',
    'Daily Rate Update',
    'New daily rates have been published for ' || p_rate_date::TEXT,
    now()
  FROM public.notification_settings ns
  WHERE ns.daily_rates_enabled = true
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_notification_count = ROW_COUNT;

  RETURN v_notification_count;
END;
$$;

-- Function: get_all_non_admin_profiles (if not exists)
CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ,
  fee_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    p.fee_percentage
  FROM public.profiles p
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- SECTION 3: ADD MISSING COLUMNS (if needed)
-- =====================================================

-- Add aum_percentage to investor_positions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'investor_positions'
    AND column_name = 'aum_percentage'
  ) THEN
    ALTER TABLE public.investor_positions ADD COLUMN aum_percentage NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add type column to transactions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN type TEXT DEFAULT 'TRANSFER';
  END IF;
END $$;

-- Add fund_id column to transactions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN fund_id TEXT;
  END IF;
END $$;

-- Add investor_id column to transactions if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'investor_id'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN investor_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Add daily_rates_enabled to notification_settings if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'notification_settings'
    AND column_name = 'daily_rates_enabled'
  ) THEN
    ALTER TABLE public.notification_settings ADD COLUMN daily_rates_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- DONE
-- =====================================================