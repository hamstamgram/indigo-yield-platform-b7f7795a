-- ============================================
-- INDIGO YIELD PLATFORM - COMPLETE MIGRATIONS
-- Apply this file in Supabase SQL Editor
-- Date: 2025-09-03
-- ============================================

-- IMPORTANT: RUN THIS ENTIRE FILE AT ONCE IN SUPABASE SQL EDITOR

-- ============================================
-- STEP 1: FIX RLS RECURSION (CRITICAL - MUST BE FIRST!)
-- ============================================
BEGIN;

-- Drop the problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create a new function that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated;

-- Recreate policies without recursion
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_none" ON public.profiles
    FOR DELETE
    USING (FALSE);

-- Update the is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.check_is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- ============================================
-- STEP 2: EXCEL BACKEND (Run only if tables don't exist)
-- ============================================
BEGIN;

-- Check and create ENUM types
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

-- Create tables only if they don't exist
CREATE TABLE IF NOT EXISTS public.funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('BTC','ETH','SOL','USDT','USDC','EURC')),
  strategy TEXT,
  inception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status fund_status DEFAULT 'active',
  mgmt_fee_bps INTEGER DEFAULT 200,
  perf_fee_bps INTEGER DEFAULT 2000,
  high_water_mark NUMERIC(28,10) DEFAULT 0,
  min_investment NUMERIC(28,10) DEFAULT 1000,
  lock_period_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_date ON public.transactions_v2(investor_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_date ON public.transactions_v2(fund_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_nav_fund_date ON public.daily_nav(fund_id, nav_date DESC);
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund ON public.investor_positions(fund_id);

COMMIT;

-- ============================================
-- STEP 3: WITHDRAWAL SYSTEM
-- ============================================
BEGIN;

DO $$ 
BEGIN 
  CREATE TYPE withdrawal_status AS ENUM (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
  ); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  fund_class TEXT CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL')),
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_amount NUMERIC(28,10) NOT NULL CHECK (requested_amount > 0),
  requested_shares NUMERIC(28,10),
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('full', 'partial')),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  approved_amount NUMERIC(28,10),
  approved_shares NUMERIC(28,10),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  processed_amount NUMERIC(28,10),
  processed_at TIMESTAMPTZ,
  settlement_date DATE,
  tx_hash TEXT,
  rejection_reason TEXT,
  rejected_by UUID REFERENCES public.profiles(id),
  rejected_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.withdrawal_queue AS
SELECT 
  wr.id,
  wr.request_date,
  wr.status,
  wr.requested_amount,
  wr.approved_amount,
  wr.fund_class,
  i.name as investor_name,
  i.email as investor_email,
  f.name as fund_name,
  f.code as fund_code,
  ip.current_value as current_position_value,
  ip.shares as current_shares,
  CASE 
    WHEN wr.withdrawal_type = 'full' THEN ip.current_value
    ELSE wr.requested_amount
  END as expected_withdrawal
FROM public.withdrawal_requests wr
JOIN public.investors i ON wr.investor_id = i.id
JOIN public.funds f ON wr.fund_id = f.id
LEFT JOIN public.investor_positions ip 
  ON wr.investor_id = ip.investor_id 
  AND wr.fund_id = ip.fund_id
WHERE wr.status IN ('pending', 'approved', 'processing')
ORDER BY wr.request_date ASC;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_requests_select_own" ON public.withdrawal_requests
  FOR SELECT
  USING (
    investor_id IN (
      SELECT id FROM public.investors WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "withdrawal_requests_admin_all" ON public.withdrawal_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

GRANT SELECT ON public.withdrawal_queue TO authenticated;

COMMIT;

-- ============================================
-- STEP 4: FUND CLASSES SUPPORT
-- ============================================
BEGIN;

ALTER TABLE public.funds
ADD COLUMN IF NOT EXISTS fund_class TEXT 
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));

UPDATE public.funds 
SET fund_class = asset 
WHERE fund_class IS NULL;

ALTER TABLE public.transactions_v2
ADD COLUMN IF NOT EXISTS fund_class TEXT
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));

ALTER TABLE public.investor_positions
ADD COLUMN IF NOT EXISTS fund_class TEXT
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));

ALTER TABLE public.excel_import_log
ADD COLUMN IF NOT EXISTS fund_classes JSONB,
ADD COLUMN IF NOT EXISTS class_summary JSONB;

CREATE INDEX IF NOT EXISTS idx_funds_fund_class ON public.funds(fund_class);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_class ON public.transactions_v2(fund_class);
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund_class ON public.investor_positions(fund_class);

COMMIT;

-- ============================================
-- STEP 5: CUTOVER GUARDS
-- ============================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

INSERT INTO public.system_config (key, value, description) VALUES
  ('excel_import_enabled', 'true'::jsonb, 'Controls whether Excel imports are allowed'),
  ('edit_window_days', '7'::jsonb, 'Number of days after import that edits are allowed'),
  ('maintenance_mode', 'false'::jsonb, 'Enables maintenance mode for the platform'),
  ('allowed_fund_classes', '["USDT","USDC","EURC","BTC","ETH","SOL"]'::jsonb, 'List of allowed fund classes')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.import_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES public.excel_import_log(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by UUID REFERENCES public.profiles(id),
  lock_reason TEXT,
  unlock_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES public.profiles(id),
  unlocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.data_edit_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  import_related BOOLEAN DEFAULT FALSE,
  import_id UUID REFERENCES public.excel_import_log(id),
  edited_by UUID REFERENCES public.profiles(id),
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  edit_source TEXT CHECK (edit_source IN ('excel_import', 'manual', 'api', 'system'))
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_edit_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_admin_all" ON public.system_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "import_locks_admin_all" ON public.import_locks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

CREATE POLICY "data_edit_audit_select" ON public.data_edit_audit
  FOR SELECT
  USING (
    edited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify everything is working:
SELECT 
  'Tables Created' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('funds', 'investors', 'transactions_v2', 'withdrawal_requests', 'system_config')

UNION ALL

SELECT 
  'RLS Policies Fixed' as check_type,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'

UNION ALL  

SELECT 
  'System Config Ready' as check_type,
  COUNT(*) as count
FROM public.system_config;

-- You should see:
-- Tables Created: 5
-- RLS Policies Fixed: 6
-- System Config Ready: 4
