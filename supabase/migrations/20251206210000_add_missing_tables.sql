-- =====================================================
-- Migration: Add Missing Tables for Statement Generation
-- Created: 2025-12-06
-- Tables: investor_invites, daily_rates, statement_periods,
--         investor_fund_performance, generated_statements,
--         statement_email_delivery
-- =====================================================

-- =====================================================
-- TABLE: investor_invites
-- Used by: src/hooks/useInvestorInvite.ts
-- =====================================================
CREATE TABLE IF NOT EXISTS investor_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_invites_email ON investor_invites(email);
CREATE INDEX IF NOT EXISTS idx_investor_invites_code ON investor_invites(invite_code);

-- RLS Policy
ALTER TABLE investor_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_invites' AND policyname = 'Admins can manage invites') THEN
    CREATE POLICY "Admins can manage invites" ON investor_invites
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- =====================================================
-- TABLE: daily_rates
-- Used by: src/routes/admin/DailyRatesManagement.tsx
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date DATE NOT NULL UNIQUE,
  btc_rate NUMERIC NOT NULL,
  eth_rate NUMERIC NOT NULL,
  sol_rate NUMERIC NOT NULL,
  usdt_rate NUMERIC NOT NULL DEFAULT 1.00,
  usdc_rate NUMERIC NOT NULL DEFAULT 1.00,
  eurc_rate NUMERIC NOT NULL DEFAULT 1.00,
  xaut_rate NUMERIC,
  xrp_rate NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_rates_date ON daily_rates(rate_date DESC);

-- RLS Policy
ALTER TABLE daily_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rates' AND policyname = 'Admins can manage rates') THEN
    CREATE POLICY "Admins can manage rates" ON daily_rates
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_rates' AND policyname = 'All authenticated users can view rates') THEN
    CREATE POLICY "All authenticated users can view rates" ON daily_rates
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- TABLE: statement_periods
-- Used by: src/services/api/statementsApi.ts
-- =====================================================
CREATE TABLE IF NOT EXISTS statement_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  period_name TEXT NOT NULL,
  period_end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, month)
);

CREATE INDEX IF NOT EXISTS idx_statement_periods_year_month ON statement_periods(year, month);

-- RLS Policy
ALTER TABLE statement_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statement_periods' AND policyname = 'Admins can manage statement periods') THEN
    CREATE POLICY "Admins can manage statement periods" ON statement_periods
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- =====================================================
-- TABLE: investor_fund_performance
-- Used by: src/services/api/statementsApi.ts
-- =====================================================
CREATE TABLE IF NOT EXISTS investor_fund_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  fund_name TEXT NOT NULL,
  -- Month-to-Date
  mtd_beginning_balance NUMERIC DEFAULT 0,
  mtd_additions NUMERIC DEFAULT 0,
  mtd_redemptions NUMERIC DEFAULT 0,
  mtd_net_income NUMERIC DEFAULT 0,
  mtd_ending_balance NUMERIC DEFAULT 0,
  mtd_rate_of_return NUMERIC DEFAULT 0,
  -- Quarter-to-Date
  qtd_beginning_balance NUMERIC DEFAULT 0,
  qtd_additions NUMERIC DEFAULT 0,
  qtd_redemptions NUMERIC DEFAULT 0,
  qtd_net_income NUMERIC DEFAULT 0,
  qtd_ending_balance NUMERIC DEFAULT 0,
  qtd_rate_of_return NUMERIC DEFAULT 0,
  -- Year-to-Date
  ytd_beginning_balance NUMERIC DEFAULT 0,
  ytd_additions NUMERIC DEFAULT 0,
  ytd_redemptions NUMERIC DEFAULT 0,
  ytd_net_income NUMERIC DEFAULT 0,
  ytd_ending_balance NUMERIC DEFAULT 0,
  ytd_rate_of_return NUMERIC DEFAULT 0,
  -- Inception-to-Date
  itd_beginning_balance NUMERIC DEFAULT 0,
  itd_additions NUMERIC DEFAULT 0,
  itd_redemptions NUMERIC DEFAULT 0,
  itd_net_income NUMERIC DEFAULT 0,
  itd_ending_balance NUMERIC DEFAULT 0,
  itd_rate_of_return NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, user_id, fund_name)
);

CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_period ON investor_fund_performance(period_id);
CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_user ON investor_fund_performance(user_id);

-- RLS Policy
ALTER TABLE investor_fund_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_fund_performance' AND policyname = 'Admins can manage performance data') THEN
    CREATE POLICY "Admins can manage performance data" ON investor_fund_performance
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_fund_performance' AND policyname = 'Users can view own performance') THEN
    CREATE POLICY "Users can view own performance" ON investor_fund_performance
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- TABLE: generated_statements
-- Used by: src/services/api/statementsApi.ts
-- =====================================================
CREATE TABLE IF NOT EXISTS generated_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES statement_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  html_content TEXT NOT NULL,
  pdf_url TEXT,
  generated_by UUID NOT NULL REFERENCES profiles(id),
  fund_names TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_statements_period ON generated_statements(period_id);
CREATE INDEX IF NOT EXISTS idx_generated_statements_user ON generated_statements(user_id);

-- RLS Policy
ALTER TABLE generated_statements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'generated_statements' AND policyname = 'Admins can manage statements') THEN
    CREATE POLICY "Admins can manage statements" ON generated_statements
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'generated_statements' AND policyname = 'Users can view own statements') THEN
    CREATE POLICY "Users can view own statements" ON generated_statements
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- TABLE: statement_email_delivery
-- Used by: src/services/api/statementsApi.ts
-- =====================================================
CREATE TABLE IF NOT EXISTS statement_email_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES generated_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  period_id UUID NOT NULL REFERENCES statement_periods(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_statement ON statement_email_delivery(statement_id);
CREATE INDEX IF NOT EXISTS idx_statement_email_delivery_status ON statement_email_delivery(status);

-- RLS Policy
ALTER TABLE statement_email_delivery ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statement_email_delivery' AND policyname = 'Admins can manage email delivery') THEN
    CREATE POLICY "Admins can manage email delivery" ON statement_email_delivery
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT ALL ON investor_invites TO authenticated;
GRANT ALL ON daily_rates TO authenticated;
GRANT ALL ON statement_periods TO authenticated;
GRANT ALL ON investor_fund_performance TO authenticated;
GRANT ALL ON generated_statements TO authenticated;
GRANT ALL ON statement_email_delivery TO authenticated;
