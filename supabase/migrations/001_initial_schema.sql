-- Migration: Initial Schema Setup for Indigo Yield Platform
-- Version: 001
-- Date: 2025-09-01
-- Description: Creates all required tables with proper structure for investor portal

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types for constrained values
CREATE TYPE asset_code AS ENUM ('BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC');
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE');
CREATE TYPE fee_kind AS ENUM ('mgmt', 'perf');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'cancelled');

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    is_admin BOOLEAN DEFAULT FALSE NOT NULL,
    fee_percentage NUMERIC(5,4) DEFAULT 0.02, -- 2% default management fee
    avatar_url TEXT,
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Assets table (define supported assets)
CREATE TABLE IF NOT EXISTS public.assets (
    id SERIAL PRIMARY KEY,
    symbol asset_code UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon_url TEXT,
    decimal_places INTEGER DEFAULT 8 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Positions table (current investor positions)
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_code asset_code NOT NULL,
    principal NUMERIC(38,18) DEFAULT 0 NOT NULL,
    total_earned NUMERIC(38,18) DEFAULT 0 NOT NULL,
    current_balance NUMERIC(38,18) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(investor_id, asset_code)
);

-- Transactions table (complete ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_code asset_code NOT NULL,
    amount NUMERIC(38,18) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending' NOT NULL,
    tx_hash TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- Statements table (monthly reports)
CREATE TABLE IF NOT EXISTS public.statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL CHECK (period_year >= 2024 AND period_year <= 2100),
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    asset_code asset_code NOT NULL,
    begin_balance NUMERIC(38,18) NOT NULL,
    additions NUMERIC(38,18) NOT NULL,
    redemptions NUMERIC(38,18) NOT NULL,
    net_income NUMERIC(38,18) NOT NULL,
    end_balance NUMERIC(38,18) NOT NULL,
    rate_of_return_mtd NUMERIC(10,6),
    rate_of_return_qtd NUMERIC(10,6),
    rate_of_return_ytd NUMERIC(10,6),
    rate_of_return_itd NUMERIC(10,6),
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(investor_id, period_year, period_month, asset_code)
);

-- Fees table (management and performance fees)
CREATE TABLE IF NOT EXISTS public.fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_code asset_code NOT NULL,
    amount NUMERIC(38,18) NOT NULL,
    kind fee_kind NOT NULL,
    period_year INTEGER,
    period_month INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Audit log table (compliance and tracking)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Yield rates table (already exists, but ensuring structure)
CREATE TABLE IF NOT EXISTS public.yield_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id INTEGER NOT NULL REFERENCES public.assets(id),
    daily_yield_percentage NUMERIC(10,8) NOT NULL,
    date DATE NOT NULL,
    entered_by UUID REFERENCES auth.users(id),
    is_api_sourced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(asset_id, date)
);

-- Portfolio history table (already exists, ensuring structure)
CREATE TABLE IF NOT EXISTS public.portfolio_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES public.assets(id),
    balance NUMERIC(38,18) NOT NULL,
    yield_applied NUMERIC(38,18),
    usd_value NUMERIC(38,18),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, asset_id, date)
);

-- Deposits table (already exists, updating structure)
ALTER TABLE public.deposits 
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ALTER COLUMN amount TYPE NUMERIC(38,18);

-- Admin invites table (already exists, ensuring structure)
CREATE TABLE IF NOT EXISTS public.admin_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_positions_investor ON public.positions(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_investor ON public.transactions(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_statements_investor ON public.statements(investor_id);
CREATE INDEX IF NOT EXISTS idx_statements_period ON public.statements(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_user);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON public.portfolio_history(user_id, date DESC);

-- Create helper functions
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

-- Create trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Seed initial assets
INSERT INTO public.assets (symbol, name, decimal_places, icon_url) VALUES
    ('BTC', 'Bitcoin', 8, '/assets/btc.svg'),
    ('ETH', 'Ethereum', 18, '/assets/eth.svg'),
    ('SOL', 'Solana', 9, '/assets/sol.svg'),
    ('USDT', 'Tether USD', 6, '/assets/usdt.svg'),
    ('USDC', 'USD Coin', 6, '/assets/usdc.svg'),
    ('EURC', 'Euro Coin', 6, '/assets/eurc.svg')
ON CONFLICT (symbol) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
