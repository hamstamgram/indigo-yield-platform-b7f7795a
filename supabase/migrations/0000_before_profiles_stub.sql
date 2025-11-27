-- Minimal profiles table to allow policy migrations to run in local/shadow environments
-- Adjust/replace with full schema if needed
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  full_name text,
  user_type text,
  is_admin boolean DEFAULT false,
  fee_percentage numeric DEFAULT 0,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed minimal admin profile for downstream grants
INSERT INTO public.profiles (id, email, first_name, last_name, is_admin, fee_percentage, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'hammadou@indigo.fund',
  'Hammadou',
  'Admin',
  true,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Minimal transactions table to satisfy downstream policies (will be extended by later migrations)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  investor_id uuid,
  type text,
  asset_symbol text,
  amount numeric,
  status text,
  created_at timestamptz DEFAULT now()
);

-- Ensure transactions table has expected columns for downstream policies
ALTER TABLE IF EXISTS public.transactions
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- Minimal portfolios table for downstream policies
CREATE TABLE IF NOT EXISTS public.portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid,
  user_id uuid,
  investor_id uuid,
  asset_symbol text,
  current_value numeric,
  total_invested numeric,
  total_return numeric,
  total_return_percentage numeric,
  realized_gains numeric,
  unrealized_gains numeric,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal portfolios_v2 table for sample data migrations
CREATE TABLE IF NOT EXISTS public.portfolios_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid,
  name text,
  status text,
  base_currency text,
  metadata jsonb DEFAULT '{}'::jsonb,
  inception_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_v2_owner ON public.portfolios_v2(owner_user_id);

-- Minimal positions table for downstream policies
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid,
  investor_id uuid,
  user_id uuid,
  asset_symbol text,
  asset_code text,
  asset_name text,
  quantity numeric,
  cost_basis numeric,
  current_value numeric,
  unrealized_gain_loss numeric,
  realized_gain_loss numeric,
  current_balance numeric,
  principal numeric,
  total_earned numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal investor_positions table for sample data migrations
CREATE TABLE IF NOT EXISTS public.investor_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  fund_id uuid,
  fund_class text,
  shares numeric,
  cost_basis numeric,
  current_value numeric,
  unrealized_pnl numeric,
  realized_pnl numeric,
  mgmt_fees_paid numeric,
  perf_fees_paid numeric,
  last_transaction_date timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_positions_investor_fund ON public.investor_positions(investor_id, fund_id);

-- Minimal email_logs table for downstream indexes/policies
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text,
  email_type text,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz DEFAULT now(),
  status text
);

-- Minimal indigo_users table for downstream policies
CREATE TABLE IF NOT EXISTS public.indigo_users (
  user_id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Minimal investors table for downstream policies
CREATE TABLE IF NOT EXISTS public.investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  profile_id uuid,
  name text,
  full_name text,
  email text,
  phone text,
  phone_number text,
  country text,
  address text,
  date_of_birth date,
  status text,
  investor_status text,
  investor_type text,
  kyc_status text,
  created_at timestamptz DEFAULT now()
);

-- Ensure profile_id is unique for conflict handling in later migrations
ALTER TABLE IF EXISTS public.investors
  ADD CONSTRAINT investors_profile_id_key UNIQUE (profile_id);

-- Minimal admin_users table for downstream grants
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY,
  granted_by uuid,
  granted_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

-- Minimal assets_v2 table for downstream migrations
CREATE TABLE IF NOT EXISTS public.assets_v2 (
  asset_id text PRIMARY KEY,
  symbol text,
  name text,
  kind text,
  decimals integer,
  is_active boolean DEFAULT true
);

-- Minimal asset_prices table for downstream sample data
CREATE TABLE IF NOT EXISTS public.asset_prices (
  asset_id text,
  price_usd numeric,
  source text,
  as_of timestamptz,
  high_24h numeric,
  low_24h numeric,
  volume_24h numeric,
  market_cap numeric
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_prices_asset_asof ON public.asset_prices(asset_id, as_of);

-- Minimal yield_sources table for legacy migration helpers
CREATE TABLE IF NOT EXISTS public.yield_sources (
  asset_code text,
  user_id uuid,
  current_balance numeric,
  percentage_of_aum numeric,
  last_updated timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_sources_asset_user ON public.yield_sources(asset_code, user_id);

-- Minimal funds table without strict constraints
CREATE TABLE IF NOT EXISTS public.funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  name text,
  asset text,
  fund_class text,
  strategy text,
  mgmt_fee_bps numeric,
  perf_fee_bps numeric,
  status text,
  inception_date date,
  nav numeric,
  total_assets numeric,
  min_investment numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE IF EXISTS public.funds DROP CONSTRAINT IF EXISTS funds_fund_class_check;

-- Minimal fees table to support RLS policies
CREATE TABLE IF NOT EXISTS public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  user_id uuid,
  asset_code text,
  amount numeric,
  kind text,
  period_year integer,
  period_month integer,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Minimal documents table for audit view
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  user_id uuid,
  type text,
  period_start date,
  period_end date,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Minimal withdrawal_requests table for audit view
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  fund_id uuid,
  request_date date,
  requested_amount numeric,
  approved_amount numeric,
  processed_amount numeric,
  fund_class text,
  withdrawal_type text,
  status text,
  settlement_date date,
  tx_hash text,
  notes text,
  admin_notes text,
  rejection_reason text,
  cancellation_reason text,
  approved_by uuid,
  rejected_by uuid,
  cancelled_by uuid,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stub is_admin_for_jwt to satisfy policy dependencies
CREATE OR REPLACE FUNCTION public.is_admin_for_jwt()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT false;
$$;

-- Stub is_admin_v2 for downstream policies
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_secure()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

-- Minimal statements table for downstream policies
CREATE TABLE IF NOT EXISTS public.statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  investor_id uuid,
  period_year int,
  period_month int,
  period_start date,
  period_end date,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal yield_rates table compatible with legacy and new structures
CREATE TABLE IF NOT EXISTS public.yield_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id integer,
  asset_code text,
  daily_yield_percentage numeric,
  rate_percentage numeric(10,6),
  date date,
  effective_date date DEFAULT CURRENT_DATE,
  entered_by uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE IF EXISTS public.yield_rates
  ADD COLUMN IF NOT EXISTS asset_code text,
  ADD COLUMN IF NOT EXISTS rate_percentage numeric(10,6),
  ADD COLUMN IF NOT EXISTS effective_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS daily_yield_percentage numeric,
  ADD COLUMN IF NOT EXISTS asset_id integer,
  ADD COLUMN IF NOT EXISTS entered_by uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS date date,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_rates_asset_date ON public.yield_rates(asset_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_rates_asset_code_effective ON public.yield_rates(asset_code, effective_date);

-- Minimal daily_yield_applications table for yield processing migrations
CREATE TABLE IF NOT EXISTS public.daily_yield_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_date date,
  asset_code text,
  total_aum numeric,
  daily_yield_percentage numeric,
  total_yield_generated numeric,
  applied_by uuid,
  investors_affected integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal portfolio_members table for policy patches
CREATE TABLE IF NOT EXISTS public.portfolio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal bank_accounts table for RLS migration
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  bank_name text,
  account_number text,
  currency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal wallets table for RLS migration
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  address text,
  network text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal manual_assets table for RLS migration
CREATE TABLE IF NOT EXISTS public.manual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  asset_name text,
  asset_type text,
  value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal nft_holdings table for RLS migration
CREATE TABLE IF NOT EXISTS public.nft_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid,
  asset_name text,
  quantity numeric,
  value numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal prices table for RLS migration
CREATE TABLE IF NOT EXISTS public.prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code text,
  price numeric,
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Minimal assets_raw table for RLS migration
CREATE TABLE IF NOT EXISTS public.assets_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  source text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generic trigger function used across migrations
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;