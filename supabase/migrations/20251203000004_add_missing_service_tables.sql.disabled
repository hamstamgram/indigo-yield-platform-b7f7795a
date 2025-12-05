-- ========================================
-- ADD MISSING SERVICE TABLES
-- Date: December 3, 2025
-- Purpose: Add tables required by assetService, statementsApi, and reportsApi
-- ========================================

BEGIN;

-- ========================================
-- 1. ASSETS_V2 TABLE (for assetService.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.assets_v2 (
  asset_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'crypto' CHECK (kind IN ('crypto', 'stablecoin', 'gold', 'fiat', 'other')),
  decimals INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_v2_symbol ON public.assets_v2(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_v2_kind ON public.assets_v2(kind);
CREATE INDEX IF NOT EXISTS idx_assets_v2_is_active ON public.assets_v2(is_active);

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

-- RLS
ALTER TABLE public.assets_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_v2_read_all" ON public.assets_v2
  FOR SELECT USING (TRUE);

CREATE POLICY "assets_v2_admin_write" ON public.assets_v2
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 2. ASSET_PRICES TABLE (for assetService.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.asset_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT NOT NULL REFERENCES public.assets_v2(asset_id),
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
CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_as_of ON public.asset_prices(asset_id, as_of DESC);

-- RLS
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_prices_read_all" ON public.asset_prices
  FOR SELECT USING (TRUE);

CREATE POLICY "asset_prices_admin_write" ON public.asset_prices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 3. STATEMENT_PERIODS TABLE (for statementsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.statement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  period_name TEXT NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'GENERATING', 'READY', 'FINALIZED', 'ARCHIVED')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  finalized_by UUID REFERENCES public.profiles(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_statement_periods_status ON public.statement_periods(status);
CREATE INDEX IF NOT EXISTS idx_statement_periods_year_month ON public.statement_periods(year, month);

-- RLS
ALTER TABLE public.statement_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statement_periods_admin_all" ON public.statement_periods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 4. INVESTOR_FUND_PERFORMANCE TABLE (for statementsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.investor_fund_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_name TEXT NOT NULL,

  -- MTD (Month to Date)
  mtd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  mtd_additions NUMERIC(28,10) DEFAULT 0,
  mtd_redemptions NUMERIC(28,10) DEFAULT 0,
  mtd_net_income NUMERIC(28,10) DEFAULT 0,
  mtd_ending_balance NUMERIC(28,10) DEFAULT 0,
  mtd_rate_of_return NUMERIC(10,4) DEFAULT 0,

  -- QTD (Quarter to Date)
  qtd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  qtd_additions NUMERIC(28,10) DEFAULT 0,
  qtd_redemptions NUMERIC(28,10) DEFAULT 0,
  qtd_net_income NUMERIC(28,10) DEFAULT 0,
  qtd_ending_balance NUMERIC(28,10) DEFAULT 0,
  qtd_rate_of_return NUMERIC(10,4) DEFAULT 0,

  -- YTD (Year to Date)
  ytd_beginning_balance NUMERIC(28,10) DEFAULT 0,
  ytd_additions NUMERIC(28,10) DEFAULT 0,
  ytd_redemptions NUMERIC(28,10) DEFAULT 0,
  ytd_net_income NUMERIC(28,10) DEFAULT 0,
  ytd_ending_balance NUMERIC(28,10) DEFAULT 0,
  ytd_rate_of_return NUMERIC(10,4) DEFAULT 0,

  -- ITD (Inception to Date)
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

CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_period ON public.investor_fund_performance(period_id);
CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_user ON public.investor_fund_performance(user_id);

-- RLS
ALTER TABLE public.investor_fund_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investor_fund_performance_admin_all" ON public.investor_fund_performance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "investor_fund_performance_user_read" ON public.investor_fund_performance
  FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- 5. GENERATED_STATEMENTS TABLE (for statementsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.generated_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  html_content TEXT,
  pdf_storage_path TEXT,
  fund_names TEXT[],
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_statements_period ON public.generated_statements(period_id);
CREATE INDEX IF NOT EXISTS idx_generated_statements_user ON public.generated_statements(user_id);

-- RLS
ALTER TABLE public.generated_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_statements_admin_all" ON public.generated_statements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "generated_statements_user_read" ON public.generated_statements
  FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- 6. STATEMENT_EMAIL_DELIVERY TABLE (for statementsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.statement_email_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.generated_statements(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.statement_periods(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED', 'BOUNCED')),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_period ON public.statement_email_delivery(period_id);
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_user ON public.statement_email_delivery(user_id);
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_status ON public.statement_email_delivery(status);

-- RLS
ALTER TABLE public.statement_email_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statement_email_delivery_admin_all" ON public.statement_email_delivery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 7. REPORT_DEFINITIONS TABLE (for reportsApi.ts)
-- ========================================
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
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_type ON public.report_definitions(report_type);
CREATE INDEX IF NOT EXISTS idx_report_definitions_active ON public.report_definitions(is_active);

-- Insert default report definitions
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

-- RLS
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_definitions_read_active" ON public.report_definitions
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "report_definitions_admin_all" ON public.report_definitions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 8. GENERATED_REPORTS TABLE (for reportsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID REFERENCES public.report_definitions(id),
  report_type TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'excel', 'csv', 'json')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  generated_for_user_id UUID REFERENCES public.profiles(id),
  generated_by_user_id UUID REFERENCES public.profiles(id),
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

CREATE INDEX IF NOT EXISTS idx_generated_reports_user ON public.generated_reports(generated_for_user_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON public.generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_status ON public.generated_reports(status);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created ON public.generated_reports(created_at DESC);

-- RLS
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generated_reports_own_read" ON public.generated_reports
  FOR SELECT USING (
    auth.uid() = generated_for_user_id OR
    auth.uid() = generated_by_user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "generated_reports_own_delete" ON public.generated_reports
  FOR DELETE USING (
    auth.uid() = generated_by_user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "generated_reports_admin_all" ON public.generated_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 9. REPORT_SCHEDULES TABLE (for reportsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_definition_id UUID NOT NULL REFERENCES public.report_definitions(id),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
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
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON public.report_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON public.report_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_report_schedules_created_by ON public.report_schedules(created_by);

-- RLS
ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_schedules_own_all" ON public.report_schedules
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "report_schedules_admin_all" ON public.report_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 10. REPORT_ACCESS_LOGS TABLE (for reportsApi.ts)
-- ========================================
CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.generated_reports(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'delete', 'share')),
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_access_logs_report ON public.report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user ON public.report_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_action ON public.report_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_created ON public.report_access_logs(created_at DESC);

-- RLS
ALTER TABLE public.report_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_access_logs_admin_all" ON public.report_access_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ========================================
-- 11. UPDATE TRIGGERS FOR updated_at
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'assets_v2', 'statement_periods', 'investor_fund_performance',
    'generated_statements', 'report_definitions', 'generated_reports', 'report_schedules'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%s_updated_at ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ========================================
-- 12. RPC FUNCTION: get_user_reports
-- ========================================
DROP FUNCTION IF EXISTS public.get_user_reports(UUID, TEXT, TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_user_reports(
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

-- ========================================
-- 13. RPC FUNCTION: get_report_statistics
-- ========================================
DROP FUNCTION IF EXISTS public.get_report_statistics(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_report_statistics(
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
    report_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    AVG(processing_duration_ms) FILTER (WHERE status = 'completed') as avg_processing_ms
  FROM public.generated_reports
  WHERE (generated_for_user_id = p_user_id OR generated_by_user_id = p_user_id)
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY report_type
  ORDER BY total_count DESC;
$$;

COMMIT;

-- Comments
COMMENT ON TABLE public.assets_v2 IS 'Asset definitions for the platform';
COMMENT ON TABLE public.asset_prices IS 'Historical price data for assets';
COMMENT ON TABLE public.statement_periods IS 'Monthly statement periods for investor statements';
COMMENT ON TABLE public.investor_fund_performance IS 'Performance data for investor statements';
COMMENT ON TABLE public.generated_statements IS 'Generated HTML/PDF statements';
COMMENT ON TABLE public.statement_email_delivery IS 'Email delivery tracking for statements';
COMMENT ON TABLE public.report_definitions IS 'Available report types and configurations';
COMMENT ON TABLE public.generated_reports IS 'Generated reports for download';
COMMENT ON TABLE public.report_schedules IS 'Scheduled report configurations';
COMMENT ON TABLE public.report_access_logs IS 'Audit log for report access';
