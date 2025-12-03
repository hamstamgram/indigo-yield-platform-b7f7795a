-- ========================================
-- CREATE MISSING TABLES V2
-- Date: December 3, 2025
-- Purpose: Create tables needed by services (idempotent)
-- ========================================

-- 1. ASSETS_V2 TABLE
CREATE TABLE IF NOT EXISTS public.assets_v2 (
  asset_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'crypto',
  decimals INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default assets
INSERT INTO public.assets_v2 (asset_id, symbol, name, kind, decimals)
VALUES
  ('btc', 'BTC', 'Bitcoin', 'crypto', 8),
  ('eth', 'ETH', 'Ethereum', 'crypto', 18),
  ('sol', 'SOL', 'Solana', 'crypto', 9),
  ('usdt', 'USDT', 'Tether USD', 'stablecoin', 6),
  ('usdc', 'USDC', 'USD Coin', 'stablecoin', 6),
  ('eurc', 'EURC', 'Euro Coin', 'stablecoin', 6),
  ('xrp', 'XRP', 'XRP', 'crypto', 6),
  ('xaut', 'XAUT', 'Tether Gold', 'gold', 6)
ON CONFLICT (asset_id) DO NOTHING;

ALTER TABLE public.assets_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_v2_read_all" ON public.assets_v2;
CREATE POLICY "assets_v2_read_all" ON public.assets_v2 FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "assets_v2_admin_write" ON public.assets_v2;
CREATE POLICY "assets_v2_admin_write" ON public.assets_v2 FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 2. ASSET_PRICES TABLE
CREATE TABLE IF NOT EXISTS public.asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL,
  price_usd NUMERIC(28,10) NOT NULL,
  price_btc NUMERIC(28,10),
  price_eth NUMERIC(28,10),
  volume_24h NUMERIC(28,10),
  market_cap NUMERIC(28,10),
  source TEXT DEFAULT 'manual',
  as_of TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_id ON public.asset_prices(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_prices_as_of ON public.asset_prices(as_of DESC);

ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asset_prices_read_all" ON public.asset_prices;
CREATE POLICY "asset_prices_read_all" ON public.asset_prices FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "asset_prices_admin_write" ON public.asset_prices;
CREATE POLICY "asset_prices_admin_write" ON public.asset_prices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 3. STATEMENT_PERIODS TABLE
CREATE TABLE IF NOT EXISTS public.statement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  period_name TEXT NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  created_by UUID,
  finalized_by UUID,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

ALTER TABLE public.statement_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statement_periods_admin_all" ON public.statement_periods;
CREATE POLICY "statement_periods_admin_all" ON public.statement_periods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 4. INVESTOR_FUND_PERFORMANCE TABLE
CREATE TABLE IF NOT EXISTS public.investor_fund_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL,
  user_id UUID NOT NULL,
  fund_name TEXT NOT NULL,
  mtd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  mtd_additions NUMERIC(28,10) DEFAULT 0,
  mtd_redemptions NUMERIC(28,10) DEFAULT 0,
  mtd_net_income NUMERIC(28,10) DEFAULT 0,
  mtd_ending_balance NUMERIC(28,10) DEFAULT 0,
  mtd_rate_of_return NUMERIC(10,4) DEFAULT 0,
  qtd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  qtd_additions NUMERIC(28,10) DEFAULT 0,
  qtd_redemptions NUMERIC(28,10) DEFAULT 0,
  qtd_net_income NUMERIC(28,10) DEFAULT 0,
  qtd_ending_balance NUMERIC(28,10) DEFAULT 0,
  qtd_rate_of_return NUMERIC(10,4) DEFAULT 0,
  ytd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  ytd_additions NUMERIC(28,10) DEFAULT 0,
  ytd_redemptions NUMERIC(28,10) DEFAULT 0,
  ytd_net_income NUMERIC(28,10) DEFAULT 0,
  ytd_ending_balance NUMERIC(28,10) DEFAULT 0,
  ytd_rate_of_return NUMERIC(10,4) DEFAULT 0,
  itd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  itd_additions NUMERIC(28,10) DEFAULT 0,
  itd_redemptions NUMERIC(28,10) DEFAULT 0,
  itd_net_income NUMERIC(28,10) DEFAULT 0,
  itd_ending_balance NUMERIC(28,10) DEFAULT 0,
  itd_rate_of_return NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, user_id, fund_name)
);

ALTER TABLE public.investor_fund_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor_fund_performance_admin_all" ON public.investor_fund_performance;
CREATE POLICY "investor_fund_performance_admin_all" ON public.investor_fund_performance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

DROP POLICY IF EXISTS "investor_fund_performance_user_read" ON public.investor_fund_performance;
CREATE POLICY "investor_fund_performance_user_read" ON public.investor_fund_performance FOR SELECT USING (auth.uid() = user_id);

-- 5. GENERATED_STATEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.generated_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL,
  user_id UUID NOT NULL,
  html_content TEXT,
  pdf_storage_path TEXT,
  fund_names TEXT[],
  generated_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, user_id)
);

ALTER TABLE public.generated_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generated_statements_admin_all" ON public.generated_statements;
CREATE POLICY "generated_statements_admin_all" ON public.generated_statements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

DROP POLICY IF EXISTS "generated_statements_user_read" ON public.generated_statements;
CREATE POLICY "generated_statements_user_read" ON public.generated_statements FOR SELECT USING (auth.uid() = user_id);

-- 6. STATEMENT_EMAIL_DELIVERY TABLE
CREATE TABLE IF NOT EXISTS public.statement_email_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL,
  period_id UUID NOT NULL,
  user_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'PENDING',
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.statement_email_delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "statement_email_delivery_admin_all" ON public.statement_email_delivery;
CREATE POLICY "statement_email_delivery_admin_all" ON public.statement_email_delivery FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 7. REPORT_DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  template_config JSONB DEFAULT '{}',
  default_filters JSONB DEFAULT '{}',
  available_formats TEXT[] DEFAULT ARRAY['pdf', 'excel', 'csv'],
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.report_definitions (report_type, name, description, is_admin_only)
VALUES
  ('portfolio_summary', 'Portfolio Summary', 'Overview of portfolio holdings and performance', FALSE),
  ('transaction_history', 'Transaction History', 'Detailed transaction history', FALSE),
  ('yield_report', 'Yield Report', 'Summary of yield earnings', FALSE),
  ('tax_report', 'Tax Report', 'Tax-related transaction summary', FALSE),
  ('admin_aum_report', 'AUM Report', 'Total AUM across all investors', TRUE),
  ('admin_investor_report', 'Investor Report', 'Detailed investor information', TRUE),
  ('admin_withdrawal_report', 'Withdrawal Report', 'Withdrawal request summary', TRUE)
ON CONFLICT (report_type) DO NOTHING;

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_definitions_read_active" ON public.report_definitions;
CREATE POLICY "report_definitions_read_active" ON public.report_definitions FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "report_definitions_admin_all" ON public.report_definitions;
CREATE POLICY "report_definitions_admin_all" ON public.report_definitions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 8. GENERATED_REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  generated_for_user_id UUID,
  generated_by_user_id UUID,
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  storage_path TEXT,
  file_size_bytes BIGINT,
  page_count INTEGER,
  download_url TEXT,
  download_url_expires_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  error_message TEXT,
  error_details JSONB,
  schedule_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "generated_reports_own_read" ON public.generated_reports;
CREATE POLICY "generated_reports_own_read" ON public.generated_reports FOR SELECT USING (
  auth.uid() = generated_for_user_id OR
  auth.uid() = generated_by_user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

DROP POLICY IF EXISTS "generated_reports_admin_all" ON public.generated_reports;
CREATE POLICY "generated_reports_admin_all" ON public.generated_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 9. REPORT_SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  recipient_user_ids UUID[],
  recipient_emails TEXT[],
  delivery_method TEXT[] DEFAULT ARRAY['email'],
  parameters JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  formats TEXT[] DEFAULT ARRAY['pdf'],
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_schedules_own_all" ON public.report_schedules;
CREATE POLICY "report_schedules_own_all" ON public.report_schedules FOR ALL USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "report_schedules_admin_all" ON public.report_schedules;
CREATE POLICY "report_schedules_admin_all" ON public.report_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 10. REPORT_ACCESS_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.report_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_access_logs_admin_all" ON public.report_access_logs;
CREATE POLICY "report_access_logs_admin_all" ON public.report_access_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- 11. RPC FUNCTION: get_user_reports
DROP FUNCTION IF EXISTS public.get_user_reports(UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE FUNCTION public.get_user_reports(
  p_user_id UUID,
  p_report_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.generated_reports
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.generated_reports
  WHERE (generated_for_user_id = p_user_id OR generated_by_user_id = p_user_id)
    AND (p_report_type IS NULL OR report_type = p_report_type)
    AND (p_status IS NULL OR status = p_status)
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- 12. RPC FUNCTION: get_report_statistics
DROP FUNCTION IF EXISTS public.get_report_statistics(UUID, INTEGER);
CREATE FUNCTION public.get_report_statistics(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  report_type TEXT,
  total_count BIGINT,
  completed_count BIGINT,
  failed_count BIGINT,
  avg_processing_ms NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    gr.report_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE gr.status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE gr.status = 'failed') as failed_count,
    AVG(gr.processing_duration_ms) FILTER (WHERE gr.status = 'completed') as avg_processing_ms
  FROM public.generated_reports gr
  WHERE (gr.generated_for_user_id = p_user_id OR gr.generated_by_user_id = p_user_id)
    AND gr.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY gr.report_type
  ORDER BY total_count DESC;
$$;

-- Comments
COMMENT ON TABLE public.assets_v2 IS 'Asset definitions for the platform';
COMMENT ON TABLE public.asset_prices IS 'Historical price data for assets';
COMMENT ON TABLE public.statement_periods IS 'Monthly statement periods';
COMMENT ON TABLE public.investor_fund_performance IS 'Performance data for statements';
COMMENT ON TABLE public.generated_statements IS 'Generated HTML/PDF statements';
COMMENT ON TABLE public.statement_email_delivery IS 'Statement email tracking';
COMMENT ON TABLE public.report_definitions IS 'Report type configurations';
COMMENT ON TABLE public.generated_reports IS 'Generated reports';
COMMENT ON TABLE public.report_schedules IS 'Scheduled report configs';
COMMENT ON TABLE public.report_access_logs IS 'Report access audit log';
