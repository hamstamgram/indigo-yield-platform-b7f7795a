-- =====================================================
-- FINALIZE PORTFOLIO V2 MIGRATION
-- Complete setup for Portfolio V2 with RLS
-- =====================================================

-- Check if tables exist first to avoid errors
DO $$ 
BEGIN
  -- Disable RLS temporarily on existing tables for data insertion
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets_v2') THEN
    ALTER TABLE public.assets_v2 DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolios_v2') THEN
    ALTER TABLE public.portfolios_v2 DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio_members') THEN
    ALTER TABLE public.portfolio_members DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_prices') THEN
    ALTER TABLE public.asset_prices DISABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolio_nav_snapshots') THEN
    ALTER TABLE public.portfolio_nav_snapshots DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;
-- Create admin_users table if not exists
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_admin_users_active 
ON public.admin_users(user_id) 
WHERE revoked_at IS NULL;
-- Create assets_v2 table if not exists
CREATE TABLE IF NOT EXISTS public.assets_v2 (
  asset_id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  chain TEXT,
  decimals INTEGER NOT NULL CHECK (decimals BETWEEN 0 AND 36),
  kind TEXT NOT NULL CHECK (kind IN ('crypto','stablecoin','fiat','fund')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  price_source TEXT NOT NULL DEFAULT 'coingecko',
  coingecko_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_v2_symbol ON public.assets_v2(symbol);
CREATE INDEX IF NOT EXISTS idx_assets_v2_active ON public.assets_v2(is_active) WHERE is_active = TRUE;
-- Create portfolios_v2 table if not exists
CREATE TABLE IF NOT EXISTS public.portfolios_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  inception_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}' 
);
CREATE INDEX IF NOT EXISTS idx_portfolios_v2_owner ON public.portfolios_v2(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_v2_status ON public.portfolios_v2(status) WHERE status = 'active';
-- Create portfolio_members table if not exists
CREATE TABLE IF NOT EXISTS public.portfolio_members (
  portfolio_id UUID NOT NULL REFERENCES public.portfolios_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('investor','viewer','advisor')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (portfolio_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_members_user ON public.portfolio_members(user_id);
-- Create transactions_v2 table if not exists
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios_v2(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES public.assets_v2(asset_id),
  txn_type TEXT NOT NULL CHECK (txn_type IN (
    'deposit','withdrawal','trade_buy','trade_sell',
    'transfer_in','transfer_out','interest','dividend',
    'fee_mgmt','fee_perf','adjustment'
  )),
  quantity NUMERIC(38,18) NOT NULL,
  price_per_unit NUMERIC(28,8),
  total_value NUMERIC(28,8),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ref_code TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_portfolio_asset 
ON public.transactions_v2(portfolio_id, asset_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_portfolio_date 
ON public.transactions_v2(portfolio_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_ref_code 
ON public.transactions_v2(ref_code) WHERE ref_code IS NOT NULL;
-- Create asset_prices table if not exists
CREATE TABLE IF NOT EXISTS public.asset_prices (
  asset_id TEXT NOT NULL REFERENCES public.assets_v2(asset_id),
  price_usd NUMERIC(28,8) NOT NULL CHECK (price_usd > 0),
  as_of TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  high_24h NUMERIC(28,8),
  low_24h NUMERIC(28,8),
  volume_24h NUMERIC(28,8),
  market_cap NUMERIC(28,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (asset_id, as_of)
);
CREATE INDEX IF NOT EXISTS idx_asset_prices_latest 
ON public.asset_prices(asset_id, as_of DESC);
-- Create portfolio_nav_snapshots table if not exists
CREATE TABLE IF NOT EXISTS public.portfolio_nav_snapshots (
  portfolio_id UUID NOT NULL REFERENCES public.portfolios_v2(id) ON DELETE CASCADE,
  as_of TIMESTAMPTZ NOT NULL,
  nav_usd NUMERIC(28,8) NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (portfolio_id, as_of)
);
CREATE INDEX IF NOT EXISTS idx_nav_snapshots_portfolio 
ON public.portfolio_nav_snapshots(portfolio_id, as_of DESC);
-- Clear and insert fresh data
TRUNCATE TABLE public.asset_prices CASCADE;
TRUNCATE TABLE public.assets_v2 CASCADE;
-- Insert assets
INSERT INTO public.assets_v2 (asset_id, symbol, name, decimals, kind, coingecko_id, is_active, price_source) 
VALUES 
  ('BTC', 'BTC', 'Bitcoin', 8, 'crypto', 'bitcoin', true, 'coingecko'),
  ('ETH', 'ETH', 'Ethereum', 18, 'crypto', 'ethereum', true, 'coingecko'),
  ('SOL', 'SOL', 'Solana', 9, 'crypto', 'solana', true, 'coingecko'),
  ('USDT', 'USDT', 'Tether USD', 6, 'stablecoin', 'tether', true, 'coingecko'),
  ('USDC', 'USDC', 'USD Coin', 6, 'stablecoin', 'usd-coin', true, 'coingecko'),
  ('EURC', 'EURC', 'Euro Coin', 6, 'stablecoin', 'euro-coin', true, 'coingecko'),
  ('INDY', 'INDY', 'Indigo Yield Fund', 8, 'fund', NULL, true, 'manual')
ON CONFLICT (asset_id) DO UPDATE
SET 
  name = EXCLUDED.name,
  decimals = EXCLUDED.decimals,
  kind = EXCLUDED.kind,
  coingecko_id = EXCLUDED.coingecko_id,
  updated_at = NOW();
-- Insert current prices
INSERT INTO public.asset_prices (asset_id, price_usd, as_of, source)
VALUES 
  ('BTC', 67500.00, NOW(), 'manual'),
  ('ETH', 3200.00, NOW(), 'manual'),
  ('SOL', 148.00, NOW(), 'manual'),
  ('USDT', 1.00, NOW(), 'manual'),
  ('USDC', 1.00, NOW(), 'manual'),
  ('EURC', 1.08, NOW(), 'manual'),
  ('INDY', 100.00, NOW(), 'manual')
ON CONFLICT (asset_id, as_of) DO UPDATE
SET price_usd = EXCLUDED.price_usd;
-- Populate admin_users from profiles
INSERT INTO public.admin_users (user_id)
SELECT id FROM public.profiles WHERE is_admin = true
ON CONFLICT (user_id) DO NOTHING;
-- Create helper functions
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users a 
    WHERE a.user_id = auth.uid() 
    AND a.revoked_at IS NULL
  );
$$;
CREATE OR REPLACE FUNCTION public.has_portfolio_access(p_portfolio_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.portfolios_v2 p
    WHERE p.id = p_portfolio_id
    AND (
      p.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 
        FROM public.portfolio_members m 
        WHERE m.portfolio_id = p.id 
        AND m.user_id = auth.uid()
      )
      OR public.is_admin_v2()
    )
  );
$$;
CREATE OR REPLACE FUNCTION public.calculate_positions(p_portfolio_id UUID)
RETURNS TABLE (
  asset_id TEXT,
  quantity NUMERIC(38,18),
  last_price_usd NUMERIC(28,8),
  value_usd NUMERIC(28,8)
)
LANGUAGE SQL
STABLE
AS $$
  WITH position_sums AS (
    SELECT 
      t.asset_id,
      SUM(CASE 
        WHEN t.txn_type IN ('deposit','trade_buy','transfer_in','interest','dividend') THEN t.quantity
        WHEN t.txn_type IN ('withdrawal','trade_sell','transfer_out','fee_mgmt','fee_perf') THEN -t.quantity
        WHEN t.txn_type = 'adjustment' THEN t.quantity
        ELSE 0
      END) as net_quantity
    FROM public.transactions_v2 t
    WHERE t.portfolio_id = p_portfolio_id
    GROUP BY t.asset_id
    HAVING SUM(CASE 
      WHEN t.txn_type IN ('deposit','trade_buy','transfer_in','interest','dividend') THEN t.quantity
      WHEN t.txn_type IN ('withdrawal','trade_sell','transfer_out','fee_mgmt','fee_perf') THEN -t.quantity
      WHEN t.txn_type = 'adjustment' THEN t.quantity
      ELSE 0
    END) > 0
  ),
  latest_prices AS (
    SELECT DISTINCT ON (asset_id)
      asset_id,
      price_usd
    FROM public.asset_prices
    ORDER BY asset_id, as_of DESC
  )
  SELECT 
    ps.asset_id,
    ps.net_quantity as quantity,
    COALESCE(lp.price_usd, 0) as last_price_usd,
    ps.net_quantity * COALESCE(lp.price_usd, 0) as value_usd
  FROM position_sums ps
  LEFT JOIN latest_prices lp ON ps.asset_id = lp.asset_id;
$$;
-- Create views
CREATE OR REPLACE VIEW public.positions_current_v AS
SELECT 
  p.id as portfolio_id,
  p.owner_user_id,
  p.name as portfolio_name,
  pos.asset_id,
  a.symbol,
  a.name as asset_name,
  pos.quantity,
  pos.last_price_usd,
  pos.value_usd
FROM public.portfolios_v2 p
CROSS JOIN LATERAL public.calculate_positions(p.id) pos
LEFT JOIN public.assets_v2 a ON pos.asset_id = a.asset_id
WHERE p.status = 'active';
CREATE OR REPLACE VIEW public.portfolio_overview_v AS
SELECT 
  p.id,
  p.owner_user_id,
  p.name,
  p.status,
  p.inception_date,
  COALESCE(SUM(pos.value_usd), 0) as total_value_usd,
  COUNT(DISTINCT pos.asset_id) as asset_count,
  p.created_at,
  p.updated_at
FROM public.portfolios_v2 p
LEFT JOIN LATERAL public.calculate_positions(p.id) pos ON true
GROUP BY p.id, p.owner_user_id, p.name, p.status, p.inception_date, p.created_at, p.updated_at;
CREATE OR REPLACE VIEW public.admin_portfolio_overview_v AS
SELECT 
  p.*,
  pr.email,
  pr.first_name,
  pr.last_name,
  COALESCE(pr.first_name || ' ' || pr.last_name, pr.email) as full_name,
  pov.total_value_usd,
  pov.asset_count
FROM public.portfolios_v2 p
LEFT JOIN public.profiles pr ON p.owner_user_id = pr.id
LEFT JOIN public.portfolio_overview_v pov ON p.id = pov.id;
-- Re-enable RLS with proper policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_nav_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_prices ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Assets are publicly readable" ON public.assets_v2;
  DROP POLICY IF EXISTS "Asset prices are publicly readable" ON public.asset_prices;
  DROP POLICY IF EXISTS "Admins can manage assets" ON public.assets_v2;
  DROP POLICY IF EXISTS "Admins can manage prices" ON public.asset_prices;
  DROP POLICY IF EXISTS "Admins can view admin roster" ON public.admin_users;
  DROP POLICY IF EXISTS "Users can view own portfolios" ON public.portfolios_v2;
  DROP POLICY IF EXISTS "Admins can manage portfolios" ON public.portfolios_v2;
  DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions_v2;
  DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions_v2;
  DROP POLICY IF EXISTS "Users can view portfolio members" ON public.portfolio_members;
  DROP POLICY IF EXISTS "Admins can manage portfolio members" ON public.portfolio_members;
  DROP POLICY IF EXISTS "Users can view NAV snapshots" ON public.portfolio_nav_snapshots;
  DROP POLICY IF EXISTS "Admins can manage NAV snapshots" ON public.portfolio_nav_snapshots;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
-- Create permissive policies for assets (read-only for all)
CREATE POLICY "Assets are publicly readable" ON public.assets_v2
  FOR SELECT USING (true);
CREATE POLICY "Asset prices are publicly readable" ON public.asset_prices
  FOR SELECT USING (true);
-- Admin policies for assets
CREATE POLICY "Admins can manage assets" ON public.assets_v2
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
CREATE POLICY "Admins can manage prices" ON public.asset_prices
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
-- Admin users policies
CREATE POLICY "Admins can view admin roster" ON public.admin_users
  FOR SELECT USING (public.is_admin_v2());
-- Portfolios policies
CREATE POLICY "Users can view own portfolios" ON public.portfolios_v2
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.portfolio_members m 
      WHERE m.portfolio_id = id AND m.user_id = auth.uid()
    )
    OR public.is_admin_v2()
  );
CREATE POLICY "Admins can manage portfolios" ON public.portfolios_v2
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
-- Portfolio members policies
CREATE POLICY "Users can view portfolio members" ON public.portfolio_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolios_v2 p
      WHERE p.id = portfolio_id
      AND (p.owner_user_id = auth.uid() OR public.is_admin_v2())
    )
  );
CREATE POLICY "Admins can manage portfolio members" ON public.portfolio_members
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions_v2
  FOR SELECT USING (public.has_portfolio_access(portfolio_id));
CREATE POLICY "Admins can manage transactions" ON public.transactions_v2
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
-- NAV snapshots policies
CREATE POLICY "Users can view NAV snapshots" ON public.portfolio_nav_snapshots
  FOR SELECT USING (public.has_portfolio_access(portfolio_id));
CREATE POLICY "Admins can manage NAV snapshots" ON public.portfolio_nav_snapshots
  FOR ALL USING (public.is_admin_v2())
  WITH CHECK (public.is_admin_v2());
