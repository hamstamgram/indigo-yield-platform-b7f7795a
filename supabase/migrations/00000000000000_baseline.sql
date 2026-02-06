-- Squashed baseline from archive and truth sources
-- ==============================================================================
-- BASE TYPES & EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE asset_code AS ENUM ('BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC', 'xAUT', 'XRP', 'ADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('investor', 'ib', 'fees_account');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE fund_status AS ENUM ('active', 'inactive', 'suspended', 'deprecated', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM (
        'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT', 
        'FEE_CREDIT', 'IB_CREDIT', 'YIELD', 'INTERNAL_WITHDRAWAL', 
        'INTERNAL_CREDIT', 'IB_DEBIT'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tx_source AS ENUM (
        'manual_admin', 'yield_distribution', 'fee_allocation', 'ib_allocation', 
        'system_bootstrap', 'investor_wizard', 'internal_routing', 'yield_correction', 
        'withdrawal_completion', 'rpc_canonical', 'crystallization', 'system', 
        'migration', 'stress_test'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE aum_purpose AS ENUM ('reporting', 'transaction', 'daily', 'monthly', 'quarterly', 'special');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE yield_distribution_status AS ENUM (
        'pending', 'applied', 'voided', 'failed', 'draft', 'previewed', 'corrected', 'rolled_back'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE visibility_scope AS ENUM ('investor_visible', 'admin_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM (
        'pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- CORE TABLES
-- ==============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    account_type account_type DEFAULT 'investor',
    fee_pct NUMERIC DEFAULT 20.0,
    ib_parent_id UUID REFERENCES public.profiles(id),
    ib_percentage NUMERIC DEFAULT 0,
    ib_commission_source TEXT,
    entity_type TEXT,
    kyc_status TEXT DEFAULT 'pending',
    onboarding_date DATE DEFAULT CURRENT_DATE,
    phone TEXT,
    include_in_reporting BOOLEAN DEFAULT TRUE,
    is_system_account BOOLEAN DEFAULT FALSE,
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Funds
CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    asset TEXT NOT NULL,
    fund_class TEXT NOT NULL,
    status fund_status DEFAULT 'active',
    inception_date DATE,
    mgmt_fee_bps INTEGER DEFAULT 0,
    perf_fee_bps INTEGER DEFAULT 2000,
    min_investment NUMERIC DEFAULT 0,
    min_withdrawal_amount NUMERIC DEFAULT 0,
    logo_url TEXT,
    lock_period_days INTEGER DEFAULT 0,
    cooling_off_hours INTEGER DEFAULT 0,
    max_daily_yield_pct NUMERIC,
    large_withdrawal_threshold NUMERIC,
    strategy TEXT,
    high_water_mark NUMERIC,
    total_aum NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statement Periods
CREATE TABLE IF NOT EXISTS public.statement_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    period_name TEXT NOT NULL,
    period_end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- Fund Daily AUM
CREATE TABLE IF NOT EXISTS public.fund_daily_aum (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES public.funds(id),
    aum_date DATE NOT NULL,
    total_aum NUMERIC,
    as_of_date DATE,
    gross_yield NUMERIC DEFAULT 0,
    net_yield NUMERIC DEFAULT 0,
    yield_percentage NUMERIC DEFAULT 0,
    investor_count INTEGER,
    status TEXT DEFAULT 'draft',
    purpose aum_purpose,
    source TEXT DEFAULT 'ingested',
    is_month_end BOOLEAN DEFAULT FALSE,
    is_voided BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fund_id, aum_date, purpose)
);

-- Investor Positions
CREATE TABLE IF NOT EXISTS public.investor_positions (
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    fund_class TEXT,
    shares NUMERIC DEFAULT 0,
    current_value NUMERIC DEFAULT 0,
    cost_basis NUMERIC DEFAULT 0,
    unrealized_pnl NUMERIC DEFAULT 0,
    realized_pnl NUMERIC DEFAULT 0,
    mgmt_fees_paid NUMERIC DEFAULT 0,
    perf_fees_paid NUMERIC DEFAULT 0,
    last_transaction_date DATE,
    last_yield_crystallization_date DATE,
    cumulative_yield_earned NUMERIC DEFAULT 0,
    lock_until_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (investor_id, fund_id)
);

-- Transactions V2
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    type tx_type NOT NULL,
    asset TEXT NOT NULL,
    fund_class TEXT,
    amount NUMERIC NOT NULL,
    balance_before NUMERIC,
    balance_after NUMERIC,
    tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
    value_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_id TEXT,
    notes TEXT,
    is_system_generated BOOLEAN DEFAULT FALSE,
    source tx_source DEFAULT 'rpc_canonical',
    meta JSONB,
    visibility_scope visibility_scope DEFAULT 'investor_visible',
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    correction_id UUID,
    transfer_id UUID,
    tx_hash TEXT,
    tx_subtype TEXT,
    void_reason TEXT,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.profiles(id),
    is_voided BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- ==============================================================================
-- YIELD TRACKING
-- ==============================================================================

-- Yield Distributions
CREATE TABLE IF NOT EXISTS public.yield_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  purpose aum_purpose DEFAULT 'transaction',
  recorded_aum numeric(28,10) NOT NULL DEFAULT 0,
  previous_aum numeric(28,10) NOT NULL DEFAULT 0,
  opening_aum numeric(28,10) NOT NULL DEFAULT 0,
  closing_aum numeric(28,10) NOT NULL DEFAULT 0,
  gross_yield numeric(28,10) NOT NULL DEFAULT 0,
  gross_yield_amount numeric(28,10),
  total_net_amount numeric(28,10) NOT NULL DEFAULT 0,
  total_fee_amount numeric(28,10) NOT NULL DEFAULT 0,
  total_fees numeric(28,10) NOT NULL DEFAULT 0,
  total_ib_amount numeric(28,10) NOT NULL DEFAULT 0,
  total_ib numeric(28,10) NOT NULL DEFAULT 0,
  net_yield numeric(28,10) NOT NULL DEFAULT 0,
  dust_amount numeric(28,10) NOT NULL DEFAULT 0,
  investor_count integer NOT NULL DEFAULT 0,
  allocation_count integer NOT NULL DEFAULT 0,
  status yield_distribution_status NOT NULL DEFAULT 'pending',
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid REFERENCES profiles(id),
  void_reason text,
  effective_date date,
  yield_date date,
  is_month_end boolean DEFAULT false,
  calculation_method text DEFAULT 'ADB',
  distribution_type text DEFAULT 'yield',
  reference_id text,
  summary_json jsonb,
  yield_percentage numeric(28,10) DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT yield_distributions_unique_period UNIQUE (fund_id, period_start, period_end, purpose)
);

-- Investor Yield Events
CREATE TABLE IF NOT EXISTS public.investor_yield_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES profiles(id),
  fund_id uuid NOT NULL REFERENCES funds(id),
  event_date date NOT NULL,
  trigger_type text NOT NULL,
  trigger_transaction_id uuid REFERENCES transactions_v2(id),
  fund_aum_before numeric NOT NULL,
  fund_aum_after numeric NOT NULL,
  investor_balance numeric NOT NULL,
  investor_share_pct numeric NOT NULL,
  fund_yield_pct numeric NOT NULL,
  gross_yield_amount numeric NOT NULL,
  fee_pct numeric DEFAULT 0,
  fee_amount numeric DEFAULT 0,
  net_yield_amount numeric NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_in_period integer NOT NULL,
  visibility_scope visibility_scope NOT NULL DEFAULT 'admin_only',
  reference_id text UNIQUE NOT NULL,
  is_voided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Yield Allocations
CREATE TABLE IF NOT EXISTS public.yield_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL REFERENCES yield_distributions(id),
  investor_id uuid NOT NULL REFERENCES profiles(id),
  fund_id uuid REFERENCES funds(id),
  gross_amount numeric(28,10) NOT NULL,
  fee_amount numeric(28,10) NOT NULL DEFAULT 0,
  ib_amount numeric(28,10) NOT NULL DEFAULT 0,
  net_amount numeric(28,10) NOT NULL,
  adb_share numeric(28,10) DEFAULT 0,
  fee_pct numeric(10,6) DEFAULT 0,
  ib_pct numeric(10,6) DEFAULT 0,
  transaction_id uuid REFERENCES transactions_v2(id),
  fee_transaction_id uuid REFERENCES transactions_v2(id),
  ib_transaction_id uuid REFERENCES transactions_v2(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(distribution_id, investor_id)
);

-- ==============================================================================
-- FEE & IB TRACKING
-- ==============================================================================

-- Investor Fee Schedule
CREATE TABLE IF NOT EXISTS public.investor_fee_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES profiles(id),
  fund_id uuid REFERENCES funds(id),
  fee_pct numeric(10,6) NOT NULL,
  ib_pct numeric(10,6) DEFAULT 0,
  effective_date date NOT NULL,
  end_date date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (investor_id, fund_id, effective_date)
);

-- IB Allocations
CREATE TABLE IF NOT EXISTS public.ib_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID REFERENCES yield_distributions(id),
  ib_investor_id UUID NOT NULL REFERENCES public.profiles(id),
  source_investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id UUID REFERENCES public.funds(id),
  source_net_income NUMERIC(28,10) NOT NULL,
  ib_percentage NUMERIC(5,2) NOT NULL,
  ib_fee_amount NUMERIC(28,10) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose aum_purpose DEFAULT 'transaction',
  source TEXT DEFAULT 'from_investor_yield',
  is_voided BOOLEAN DEFAULT FALSE,
  payout_status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES profiles(id),
  period_start DATE,
  period_end DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IB Commission Ledger
CREATE TABLE IF NOT EXISTS public.ib_commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ib_id UUID NOT NULL REFERENCES profiles(id),
    ib_name TEXT,
    source_investor_id UUID NOT NULL REFERENCES profiles(id),
    source_investor_name TEXT,
    fund_id UUID NOT NULL REFERENCES funds(id),
    yield_distribution_id UUID REFERENCES yield_distributions(id),
    transaction_id UUID REFERENCES transactions_v2(id),
    asset TEXT NOT NULL,
    gross_yield_amount NUMERIC NOT NULL,
    ib_percentage NUMERIC NOT NULL,
    ib_commission_amount NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    is_voided BOOLEAN DEFAULT FALSE,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES profiles(id),
    void_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Platform Fee Ledger
CREATE TABLE IF NOT EXISTS public.platform_fee_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES funds(id),
    yield_distribution_id UUID REFERENCES yield_distributions(id),
    investor_id UUID NOT NULL REFERENCES profiles(id),
    investor_name TEXT,
    gross_yield_amount NUMERIC NOT NULL,
    fee_percentage NUMERIC NOT NULL,
    fee_amount NUMERIC NOT NULL,
    effective_date DATE NOT NULL,
    asset TEXT NOT NULL,
    transaction_id UUID REFERENCES transactions_v2(id),
    is_voided BOOLEAN DEFAULT FALSE,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Fee Allocations
CREATE TABLE IF NOT EXISTS public.fee_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_id UUID REFERENCES yield_distributions(id),
    fund_id UUID REFERENCES funds(id),
    investor_id UUID REFERENCES profiles(id),
    fees_account_id UUID REFERENCES profiles(id),
    period_start DATE,
    period_end DATE,
    purpose aum_purpose,
    base_net_income NUMERIC,
    fee_percentage NUMERIC,
    fee_amount NUMERIC,
    credit_transaction_id UUID REFERENCES transactions_v2(id),
    is_voided BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- OTHER TABLES
-- ==============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    type TEXT,
    title TEXT,
    body TEXT,
    data_jsonb JSONB,
    priority TEXT DEFAULT 'normal',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    amount NUMERIC NOT NULL,
    requested_amount NUMERIC,
    requested_shares NUMERIC,
    status withdrawal_status DEFAULT 'pending',
    request_date TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    tx_hash TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    rejected_by UUID REFERENCES public.profiles(id),
    cancelled_by UUID REFERENCES public.profiles(id),
    version INTEGER DEFAULT 1,
    withdrawal_type TEXT NOT NULL DEFAULT 'standard',
    settlement_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Submissions
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    submission_data JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Invites
CREATE TABLE IF NOT EXISTS public.admin_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- BASE FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- RLS ENABLEMENT
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_yield_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_commission_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;
