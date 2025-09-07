-- Migration: 003_excel_backend.sql
-- Date: 2024-02-02
-- Description: Excel Backend Integration - Normalized schema for fund management

-- ========================================
-- Create ENUM types for Excel backend
-- ========================================
DO $$ 
BEGIN 
  CREATE TYPE tx_type AS ENUM ('DEPOSIT','WITHDRAWAL','INTEREST','FEE','ADJUSTMENT'); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN 
  CREATE TYPE fund_status AS ENUM ('active', 'inactive', 'suspended'); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

-- ========================================
-- FUNDS TABLE (Fund configurations)
-- ========================================
CREATE TABLE IF NOT EXISTS public.funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('BTC','ETH','SOL','USDT','USDC','EURC')),
  strategy TEXT,
  inception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status fund_status DEFAULT 'active',
  mgmt_fee_bps INTEGER DEFAULT 200, -- Basis points (200 = 2%)
  perf_fee_bps INTEGER DEFAULT 2000, -- Basis points (2000 = 20%)
  high_water_mark NUMERIC(28,10) DEFAULT 0,
  min_investment NUMERIC(28,10) DEFAULT 1000,
  lock_period_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INVESTORS TABLE (Master investor data)
-- ========================================
CREATE TABLE IF NOT EXISTS public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  tax_id TEXT,
  entity_type TEXT CHECK (entity_type IN ('individual', 'corporate', 'trust', 'foundation')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected', 'expired')),
  kyc_date DATE,
  aml_status TEXT DEFAULT 'pending' CHECK (aml_status IN ('pending', 'approved', 'flagged', 'blocked')),
  accredited BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','suspended','closed')),
  onboarding_date DATE DEFAULT CURRENT_DATE,
  profile_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TRANSACTIONS TABLE (Unified ledger)
-- ========================================
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value_date DATE NOT NULL DEFAULT CURRENT_DATE,
  asset TEXT NOT NULL,
  amount NUMERIC(28,10) NOT NULL,
  type tx_type NOT NULL,
  balance_before NUMERIC(28,10),
  balance_after NUMERIC(28,10),
  tx_hash TEXT,
  reference_id TEXT,
  notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- DAILY NAV TABLE (Net Asset Value tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS public.daily_nav (
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  nav_date DATE NOT NULL,
  aum NUMERIC(28,10) NOT NULL,
  nav_per_share NUMERIC(28,10),
  shares_outstanding NUMERIC(28,10),
  gross_return_pct NUMERIC(12,6),
  net_return_pct NUMERIC(12,6),
  fees_accrued NUMERIC(28,10) DEFAULT 0,
  high_water_mark NUMERIC(28,10),
  total_inflows NUMERIC(28,10) DEFAULT 0,
  total_outflows NUMERIC(28,10) DEFAULT 0,
  investor_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  PRIMARY KEY (fund_id, nav_date)
);

-- ========================================
-- INVESTOR POSITIONS TABLE (Current holdings)
-- ========================================
CREATE TABLE IF NOT EXISTS public.investor_positions (
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  shares NUMERIC(28,10) NOT NULL DEFAULT 0,
  cost_basis NUMERIC(28,10) NOT NULL DEFAULT 0,
  current_value NUMERIC(28,10) NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC(28,10) DEFAULT 0,
  realized_pnl NUMERIC(28,10) DEFAULT 0,
  last_transaction_date DATE,
  lock_until_date DATE,
  high_water_mark NUMERIC(28,10),
  mgmt_fees_paid NUMERIC(28,10) DEFAULT 0,
  perf_fees_paid NUMERIC(28,10) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (investor_id, fund_id)
);

-- ========================================
-- RECONCILIATION TABLE (Balance checks)
-- ========================================
CREATE TABLE IF NOT EXISTS public.reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  reconciliation_date DATE NOT NULL,
  beginning_nav NUMERIC(28,10) NOT NULL,
  net_flows NUMERIC(28,10) NOT NULL,
  gross_pnl NUMERIC(28,10) NOT NULL,
  fees NUMERIC(28,10) NOT NULL,
  ending_nav NUMERIC(28,10) NOT NULL,
  calculated_nav NUMERIC(28,10) NOT NULL,
  variance NUMERIC(28,10) NOT NULL,
  variance_pct NUMERIC(12,6),
  status TEXT CHECK (status IN ('pending', 'approved', 'disputed', 'resolved')),
  notes TEXT,
  reconciled_by UUID REFERENCES public.profiles(id),
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- FEE CALCULATIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  investor_id UUID NOT NULL REFERENCES public.investors(id),
  calculation_date DATE NOT NULL,
  fee_type TEXT CHECK (fee_type IN ('management', 'performance', 'redemption', 'other')),
  calculation_basis NUMERIC(28,10) NOT NULL,
  rate_bps INTEGER NOT NULL,
  fee_amount NUMERIC(28,10) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'posted', 'cancelled')),
  posted_transaction_id UUID REFERENCES public.transactions_v2(id),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- EXCEL IMPORT LOG
-- ========================================
CREATE TABLE IF NOT EXISTS public.excel_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  import_type TEXT CHECK (import_type IN ('investors', 'transactions', 'daily_nav', 'full')),
  rows_processed INTEGER DEFAULT 0,
  rows_succeeded INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  imported_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Create indexes for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_date ON public.transactions_v2(investor_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_date ON public.transactions_v2(fund_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_type ON public.transactions_v2(type);
CREATE INDEX IF NOT EXISTS idx_daily_nav_fund_date ON public.daily_nav(fund_id, nav_date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund ON public.investor_positions(fund_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_fund_date ON public.reconciliation(fund_id, reconciliation_date DESC);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_investor ON public.fee_calculations(investor_id, calculation_date DESC);

-- ========================================
-- KPI Views and Calculation Functions
-- ========================================

-- Function: Calculate period returns (MUST BE CREATED FIRST)
CREATE OR REPLACE FUNCTION public.fund_period_return(
  f UUID, 
  d1 DATE, 
  d2 DATE, 
  net BOOLEAN DEFAULT TRUE
)
RETURNS NUMERIC 
LANGUAGE sql 
STABLE AS $$
  SELECT COALESCE(
    EXP(SUM(LN(1 + (CASE 
      WHEN net THEN COALESCE(dn.net_return_pct, 0) 
      ELSE COALESCE(dn.gross_return_pct, 0) 
    END) / 100.0))) - 1, 
    0
  )
  FROM public.daily_nav dn 
  WHERE dn.fund_id = f 
    AND dn.nav_date >= d1 
    AND dn.nav_date <= d2;
$$;

-- View: Inception-to-date returns
CREATE OR REPLACE VIEW public.v_itd_returns AS 
SELECT 
  fund_id,
  EXP(SUM(LN(1 + COALESCE(net_return_pct, 0) / 100.0))) - 1 AS itd_return
FROM public.daily_nav 
GROUP BY fund_id;

-- View: Fund KPIs
CREATE OR REPLACE VIEW public.v_fund_kpis AS
SELECT 
  f.id AS fund_id,
  f.code,
  f.name,
  f.asset,
  (SELECT dn.net_return_pct 
   FROM public.daily_nav dn 
   WHERE dn.fund_id = f.id 
   ORDER BY dn.nav_date DESC 
   LIMIT 1) AS day_return_pct,
  public.fund_period_return(f.id, date_trunc('month', CURRENT_DATE)::DATE, CURRENT_DATE, true) * 100 AS mtd_return,
  public.fund_period_return(f.id, date_trunc('quarter', CURRENT_DATE)::DATE, CURRENT_DATE, true) * 100 AS qtd_return,
  public.fund_period_return(f.id, date_trunc('year', CURRENT_DATE)::DATE, CURRENT_DATE, true) * 100 AS ytd_return,
  (SELECT itd_return * 100 FROM public.v_itd_returns itd WHERE itd.fund_id = f.id) AS itd_return,
  (SELECT dn.aum 
   FROM public.daily_nav dn 
   WHERE dn.fund_id = f.id 
   ORDER BY dn.nav_date DESC 
   LIMIT 1) AS current_aum,
  (SELECT COUNT(DISTINCT investor_id) 
   FROM public.investor_positions ip 
   WHERE ip.fund_id = f.id 
     AND ip.shares > 0) AS active_investors
FROM public.funds f
WHERE f.status = 'active';

-- View: Investor KPIs
CREATE OR REPLACE VIEW public.v_investor_kpis AS
SELECT 
  i.id AS investor_id,
  i.name,
  i.email,
  i.status,
  i.kyc_status,
  COUNT(DISTINCT ip.fund_id) AS funds_invested,
  SUM(ip.current_value) AS total_value,
  SUM(ip.cost_basis) AS total_invested,
  SUM(ip.unrealized_pnl) AS total_unrealized_pnl,
  SUM(ip.realized_pnl) AS total_realized_pnl,
  SUM(ip.mgmt_fees_paid) AS total_mgmt_fees,
  SUM(ip.perf_fees_paid) AS total_perf_fees,
  MIN(t.tx_date) AS first_investment_date,
  MAX(t.tx_date) AS last_activity_date
FROM public.investors i
LEFT JOIN public.investor_positions ip ON i.id = ip.investor_id
LEFT JOIN public.transactions_v2 t ON i.id = t.investor_id
GROUP BY i.id, i.name, i.email, i.status, i.kyc_status;

-- ========================================
-- Row Level Security Policies
-- ========================================

-- Enable RLS on new tables
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_nav ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_import_log ENABLE ROW LEVEL SECURITY;

-- Funds policies
CREATE POLICY "funds_select_policy" ON public.funds
  FOR SELECT USING (TRUE); -- All authenticated users can view funds

CREATE POLICY "funds_admin_policy" ON public.funds
  FOR ALL USING (public.is_admin());

-- Investors policies
CREATE POLICY "investors_select_own" ON public.investors
  FOR SELECT USING (
    profile_id = auth.uid() OR public.is_admin()
  );

CREATE POLICY "investors_admin_policy" ON public.investors
  FOR ALL USING (public.is_admin());

-- Transactions policies
CREATE POLICY "transactions_v2_select_own" ON public.transactions_v2
  FOR SELECT USING (
    investor_id IN (SELECT id FROM public.investors WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "transactions_v2_admin_policy" ON public.transactions_v2
  FOR ALL USING (public.is_admin());

-- Daily NAV policies
CREATE POLICY "daily_nav_select_policy" ON public.daily_nav
  FOR SELECT USING (TRUE); -- All authenticated users can view NAV

CREATE POLICY "daily_nav_admin_policy" ON public.daily_nav
  FOR ALL USING (public.is_admin());

-- Investor positions policies
CREATE POLICY "investor_positions_select_own" ON public.investor_positions
  FOR SELECT USING (
    investor_id IN (SELECT id FROM public.investors WHERE profile_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "investor_positions_admin_policy" ON public.investor_positions
  FOR ALL USING (public.is_admin());

-- Other tables - admin only
CREATE POLICY "reconciliation_admin_policy" ON public.reconciliation
  FOR ALL USING (public.is_admin());

CREATE POLICY "fee_calculations_admin_policy" ON public.fee_calculations
  FOR ALL USING (public.is_admin());

CREATE POLICY "excel_import_log_admin_policy" ON public.excel_import_log
  FOR ALL USING (public.is_admin());

-- ========================================
-- Seed initial fund data
-- ========================================
INSERT INTO public.funds (code, name, asset, strategy, mgmt_fee_bps, perf_fee_bps) 
VALUES 
  ('BTCYF', 'BTC Yield Fund', 'BTC', 'DeFi Yield Farming', 200, 2000),
  ('ETHYF', 'ETH Yield Fund', 'ETH', 'Staking and DeFi', 200, 2000),
  ('USDTYF', 'USDT Yield Fund', 'USDT', 'Stable Yield', 100, 1000)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- Create trigger for updated_at columns
-- ========================================
CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON public.funds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_investors_updated_at
  BEFORE UPDATE ON public.investors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_investor_positions_updated_at
  BEFORE UPDATE ON public.investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
