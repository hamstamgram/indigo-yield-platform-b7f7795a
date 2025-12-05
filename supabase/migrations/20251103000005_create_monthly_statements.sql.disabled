-- ========================================
-- MONTHLY STATEMENTS SYSTEM
-- Date: November 3, 2025
-- Purpose: Monthly investor statement generation and tracking
-- Time to execute: ~2 minutes
-- ========================================

-- This migration creates tables for:
-- 1. Monthly statement periods
-- 2. Investor fund performance data (MTD/QTD/YTD/ITD)
-- 3. Statement generation tracking
-- 4. Email delivery tracking

BEGIN;

-- ==========================================
-- TABLE 1: STATEMENT PERIODS
-- ==========================================
-- Track each monthly reporting period

CREATE TABLE IF NOT EXISTS statement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Period identification
  year INT NOT NULL CHECK (year >= 2024 AND year <= 2100),
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  period_name TEXT NOT NULL, -- e.g., "October 2025"
  period_end_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'FINALIZED', 'SENT')
  ),

  -- Admin tracking
  created_by UUID REFERENCES profiles(id),
  finalized_by UUID REFERENCES profiles(id),
  finalized_at TIMESTAMPTZ,
  sent_by UUID REFERENCES profiles(id),
  sent_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one period per month/year
  CONSTRAINT unique_period UNIQUE (year, month)
);

-- Indexes
CREATE INDEX idx_statement_periods_period_end_date ON statement_periods(period_end_date DESC);
CREATE INDEX idx_statement_periods_status ON statement_periods(status);

-- RLS
ALTER TABLE statement_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage statement periods"
  ON statement_periods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- TABLE 2: INVESTOR FUND PERFORMANCE
-- ==========================================
-- Store monthly performance data for each investor per fund

CREATE TABLE IF NOT EXISTS investor_fund_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_name TEXT NOT NULL CHECK (
    fund_name IN ('BTC YIELD FUND', 'ETH YIELD FUND', 'SOL YIELD FUND',
                  'USDT YIELD FUND', 'USDC YIELD FUND', 'EURC YIELD FUND')
  ),

  -- Capital Account Summary - MTD
  mtd_beginning_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  mtd_additions NUMERIC(20,8) NOT NULL DEFAULT 0,
  mtd_redemptions NUMERIC(20,8) NOT NULL DEFAULT 0,
  mtd_net_income NUMERIC(20,8) NOT NULL DEFAULT 0,
  mtd_ending_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  mtd_rate_of_return NUMERIC(10,4), -- Percentage with 4 decimals (e.g., 12.3456%)

  -- Capital Account Summary - QTD
  qtd_beginning_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  qtd_additions NUMERIC(20,8) NOT NULL DEFAULT 0,
  qtd_redemptions NUMERIC(20,8) NOT NULL DEFAULT 0,
  qtd_net_income NUMERIC(20,8) NOT NULL DEFAULT 0,
  qtd_ending_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  qtd_rate_of_return NUMERIC(10,4),

  -- Capital Account Summary - YTD
  ytd_beginning_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  ytd_additions NUMERIC(20,8) NOT NULL DEFAULT 0,
  ytd_redemptions NUMERIC(20,8) NOT NULL DEFAULT 0,
  ytd_net_income NUMERIC(20,8) NOT NULL DEFAULT 0,
  ytd_ending_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  ytd_rate_of_return NUMERIC(10,4),

  -- Capital Account Summary - ITD (Inception to Date)
  itd_beginning_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  itd_additions NUMERIC(20,8) NOT NULL DEFAULT 0,
  itd_redemptions NUMERIC(20,8) NOT NULL DEFAULT 0,
  itd_net_income NUMERIC(20,8) NOT NULL DEFAULT 0,
  itd_ending_balance NUMERIC(20,8) NOT NULL DEFAULT 0,
  itd_rate_of_return NUMERIC(10,4),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one performance record per user/fund/period
  CONSTRAINT unique_investor_fund_period UNIQUE (period_id, user_id, fund_name)
);

-- Indexes
CREATE INDEX idx_investor_fund_performance_period_id ON investor_fund_performance(period_id);
CREATE INDEX idx_investor_fund_performance_user_id ON investor_fund_performance(user_id);
CREATE INDEX idx_investor_fund_performance_fund_name ON investor_fund_performance(fund_name);
CREATE INDEX idx_investor_fund_performance_user_period ON investor_fund_performance(user_id, period_id);

-- RLS
ALTER TABLE investor_fund_performance ENABLE ROW LEVEL SECURITY;

-- Investors can view their own performance
CREATE POLICY "Investors can view own fund performance"
  ON investor_fund_performance FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all performance data
CREATE POLICY "Admins can manage all fund performance"
  ON investor_fund_performance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- TABLE 3: GENERATED STATEMENTS
-- ==========================================
-- Track generated HTML statements

CREATE TABLE IF NOT EXISTS generated_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Statement content
  html_content TEXT NOT NULL, -- Full HTML email content

  -- Generation metadata
  generated_by UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Fund information (for tracking)
  fund_names TEXT[] NOT NULL, -- Array of fund names this investor has

  -- Preview/approval
  preview_url TEXT, -- Optional: URL to preview statement
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one statement per user/period
  CONSTRAINT unique_statement_user_period UNIQUE (period_id, user_id)
);

-- Indexes
CREATE INDEX idx_generated_statements_period_id ON generated_statements(period_id);
CREATE INDEX idx_generated_statements_user_id ON generated_statements(user_id);
CREATE INDEX idx_generated_statements_generated_at ON generated_statements(generated_at DESC);

-- RLS
ALTER TABLE generated_statements ENABLE ROW LEVEL SECURITY;

-- Investors can view their own statements
CREATE POLICY "Investors can view own statements"
  ON generated_statements FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all statements
CREATE POLICY "Admins can manage all statements"
  ON generated_statements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- TABLE 4: STATEMENT EMAIL DELIVERY
-- ==========================================
-- Track email delivery status

CREATE TABLE IF NOT EXISTS statement_email_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  statement_id UUID NOT NULL REFERENCES generated_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,

  -- Email details
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Delivery status
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
    status IN ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'BOUNCED')
  ),

  -- Delivery tracking
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Email provider tracking
  message_id TEXT, -- From email provider (Resend, SendGrid, etc.)

  -- Engagement tracking (optional)
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_statement_email_delivery_statement_id ON statement_email_delivery(statement_id);
CREATE INDEX idx_statement_email_delivery_user_id ON statement_email_delivery(user_id);
CREATE INDEX idx_statement_email_delivery_period_id ON statement_email_delivery(period_id);
CREATE INDEX idx_statement_email_delivery_status ON statement_email_delivery(status);
CREATE INDEX idx_statement_email_delivery_queued_at ON statement_email_delivery(queued_at DESC);

-- RLS
ALTER TABLE statement_email_delivery ENABLE ROW LEVEL SECURITY;

-- Investors can view their own delivery status
CREATE POLICY "Investors can view own email delivery"
  ON statement_email_delivery FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all delivery records
CREATE POLICY "Admins can manage all email delivery"
  ON statement_email_delivery FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function: Get currency symbol for fund
CREATE OR REPLACE FUNCTION get_fund_currency(fund_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE fund_name
    WHEN 'BTC YIELD FUND' THEN 'BTC'
    WHEN 'ETH YIELD FUND' THEN 'ETH'
    WHEN 'SOL YIELD FUND' THEN 'SOL'
    WHEN 'USDT YIELD FUND' THEN 'USDT'
    WHEN 'USDC YIELD FUND' THEN 'USDC'
    WHEN 'EURC YIELD FUND' THEN 'EURC'
    ELSE 'USD'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get fund icon URL
CREATE OR REPLACE FUNCTION get_fund_icon_url(fund_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE fund_name
    WHEN 'BTC YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png'
    WHEN 'ETH YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png'
    WHEN 'SOL YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png'
    WHEN 'USDT YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png'
    WHEN 'USDC YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png'
    WHEN 'EURC YIELD FUND' THEN 'https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Format number for display (handles zero/negative)
CREATE OR REPLACE FUNCTION format_statement_number(value NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF value = 0 THEN
    RETURN '-';
  ELSIF value IS NULL THEN
    RETURN '-';
  ELSE
    -- Format with commas and 2-8 decimals
    RETURN to_char(value, 'FM999,999,999.00000000');
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get color for value (green positive, red negative)
CREATE OR REPLACE FUNCTION get_value_color(value NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF value < 0 THEN
    RETURN '#dc2626'; -- Red
  ELSIF value > 0 THEN
    RETURN '#16a34a'; -- Green
  ELSE
    RETURN '#1e293b'; -- Default dark
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Finalize a statement period (prevent further edits)
CREATE OR REPLACE FUNCTION finalize_statement_period(
  p_period_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Check if period exists and is in DRAFT status
  SELECT COUNT(*) INTO v_count
  FROM statement_periods
  WHERE id = p_period_id AND status = 'DRAFT';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Period not found or already finalized';
  END IF;

  -- Update period status
  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_by = p_admin_id,
    finalized_at = NOW(),
    updated_at = NOW()
  WHERE id = p_period_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get statement summary for admin dashboard
CREATE OR REPLACE FUNCTION get_statement_period_summary(p_period_id UUID)
RETURNS TABLE (
  total_investors INT,
  total_funds INT,
  statements_generated INT,
  statements_sent INT,
  statements_pending INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ifp.user_id)::INT AS total_investors,
    COUNT(DISTINCT ifp.fund_name)::INT AS total_funds,
    COUNT(DISTINCT gs.id)::INT AS statements_generated,
    COUNT(DISTINCT CASE WHEN sed.status = 'SENT' THEN sed.statement_id END)::INT AS statements_sent,
    COUNT(DISTINCT CASE WHEN sed.status IN ('QUEUED', 'SENDING') THEN sed.statement_id END)::INT AS statements_pending
  FROM investor_fund_performance ifp
  LEFT JOIN generated_statements gs ON gs.period_id = ifp.period_id AND gs.user_id = ifp.user_id
  LEFT JOIN statement_email_delivery sed ON sed.statement_id = gs.id
  WHERE ifp.period_id = p_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check all new tables were created
SELECT
  table_name,
  CASE
    WHEN table_name IN ('statement_periods', 'investor_fund_performance', 'generated_statements', 'statement_email_delivery')
    THEN '✅ CREATED'
    ELSE '⚠️ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('statement_periods', 'investor_fund_performance', 'generated_statements', 'statement_email_delivery')
ORDER BY table_name;

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('statement_periods', 'investor_fund_performance', 'generated_statements', 'statement_email_delivery')
ORDER BY tablename;

-- Check helper functions created
SELECT
  routine_name,
  '✅ CREATED' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_fund_currency', 'get_fund_icon_url', 'format_statement_number', 'get_value_color', 'finalize_statement_period', 'get_statement_period_summary')
ORDER BY routine_name;
