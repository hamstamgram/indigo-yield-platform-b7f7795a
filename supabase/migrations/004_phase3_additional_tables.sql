-- Migration: Phase 3 Additional Tables
-- Version: 004
-- Date: 2025-09-01
-- Description: Creates additional tables needed for Phase 3.0-3.6 features

-- Yield settings table
CREATE TABLE IF NOT EXISTS public.yield_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frequency TEXT CHECK (frequency IN ('daily', 'weekly')) DEFAULT 'daily' NOT NULL,
    rate_bps INTEGER NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Documents table for investor document vault
DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('statement', 'notice', 'terms', 'tax', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id UUID, -- nullable for global documents
    type document_type NOT NULL,
    title TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    checksum TEXT
);
-- User sessions table for session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_label TEXT,
    user_agent TEXT,
    ip INET,
    refresh_token_id TEXT, -- hash of refresh token
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id)
);
-- Notifications table
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('deposit', 'statement', 'performance', 'system', 'support');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data_jsonb JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    priority notification_priority DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Fund configurations table
DO $$ 
BEGIN 
  CREATE TYPE fund_status AS ENUM ('active', 'inactive'); 
EXCEPTION 
  WHEN duplicate_object THEN NULL; 
END $$;
DO $$ BEGIN
    CREATE TYPE benchmark_type AS ENUM ('BTC', 'ETH', 'STABLE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.fund_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status fund_status DEFAULT 'active' NOT NULL,
    mgmt_fee_bps INTEGER DEFAULT 200 NOT NULL, -- 2%
    perf_fee_bps INTEGER DEFAULT 2000 NOT NULL, -- 20%
    inception_date DATE DEFAULT CURRENT_DATE NOT NULL,
    benchmark benchmark_type DEFAULT 'BTC' NOT NULL,
    fee_version INTEGER DEFAULT 1 NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Access logs table
DO $$ BEGIN
    CREATE TYPE access_event AS ENUM ('login', 'logout', '2fa_setup', '2fa_verify', 'session_revoked', 'password_change');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event access_event NOT NULL,
    ip INET,
    user_agent TEXT,
    device_label TEXT,
    success BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Secure shares table for portfolio sharing
DO $$ BEGIN
    CREATE TYPE share_scope AS ENUM ('portfolio', 'documents', 'statement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
CREATE TABLE IF NOT EXISTS public.secure_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id UUID, -- nullable
    scope share_scope NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_views INTEGER,
    views_count INTEGER DEFAULT 0 NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);
-- Web push subscriptions
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    revoked_at TIMESTAMPTZ
);
-- Benchmarks table
CREATE TABLE IF NOT EXISTS public.benchmarks (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    date DATE NOT NULL,
    price_usd NUMERIC(20,8) NOT NULL,
    ret_1d NUMERIC(10,6),
    ret_mtd NUMERIC(10,6),
    ret_qtd NUMERIC(10,6),
    ret_ytd NUMERIC(10,6),
    ret_itd NUMERIC(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(symbol, date)
);
-- Balance adjustments table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fund_id UUID, -- nullable
    amount NUMERIC(38,18) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    audit_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id)
);
-- Fund fee history table
CREATE TABLE IF NOT EXISTS public.fund_fee_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES public.fund_configurations(id) ON DELETE CASCADE,
    mgmt_fee_bps INTEGER NOT NULL,
    perf_fee_bps INTEGER NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_yield_settings_effective ON public.yield_settings(effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_type ON public.documents(user_id, type);
CREATE INDEX IF NOT EXISTS idx_documents_period ON public.documents(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON public.user_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON public.access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secure_shares_token ON public.secure_shares(token);
CREATE INDEX IF NOT EXISTS idx_secure_shares_active ON public.secure_shares(owner_user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_benchmarks_symbol_date ON public.benchmarks(symbol, date DESC);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user ON public.balance_adjustments(user_id, created_at DESC);
-- Add investor status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('Active', 'Pending', 'Closed')) DEFAULT 'Active';
-- Add updated_at triggers
CREATE TRIGGER update_fund_configurations_updated_at
    BEFORE UPDATE ON public.fund_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Insert default fund configuration
INSERT INTO public.fund_configurations (code, name, currency, mgmt_fee_bps, perf_fee_bps, benchmark)
VALUES ('BTC_YIELD', 'Bitcoin Yield Fund', 'USD', 200, 2000, 'BTC')
ON CONFLICT (code) DO NOTHING;
