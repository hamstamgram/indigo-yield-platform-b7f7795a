-- ==============================================================================
-- OMNI-FIX DATABASE SCHEMA SCRIPT (FINAL VERSION)
-- Date: 2025-12-18
-- Description: Idempotently fixes database schema to match codebase expectations.
--              Includes ALL Tables, Columns, RLS, RPCs, and Seed Data.
--              Run this in Supabase Dashboard SQL Editor to restore full functionality.
-- ==============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. BASE TABLES (Profiles, Funds, Periods)
-- ==============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    fee_percentage NUMERIC DEFAULT 0.02,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entity_type TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC DEFAULT 0.02;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Funds
CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    asset TEXT NOT NULL,
    fund_class TEXT,
    status TEXT DEFAULT 'active',
    inception_date DATE,
    total_aum NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.funds DROP CONSTRAINT IF EXISTS funds_fund_class_check;

-- Seed Funds (Idempotent)
INSERT INTO public.funds (code, name, asset, fund_class, status)
VALUES 
  ('BTCYF', 'BTC Yield Fund', 'BTC', 'BTC', 'active'),
  ('ETHYF', 'ETH Yield Fund', 'ETH', 'ETH', 'active'),
  ('USDTYF', 'USDT Yield Fund', 'USDT', 'USDT', 'active'),
  ('SOLYF', 'SOL Yield Fund', 'SOL', 'SOL', 'active'),
  ('XRPYF', 'XRP Yield Fund', 'XRP', 'XRP', 'active'),
  ('EURCYF', 'EURC Yield Fund', 'EURC', 'EURC', 'active'),
  ('XAUTF', 'Gold Yield Fund', 'xAUT', 'xAUT', 'active')
ON CONFLICT (code) DO NOTHING;

-- Statement Periods
CREATE TABLE IF NOT EXISTS public.statement_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    period_name TEXT NOT NULL,
    period_end_date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_by UUID REFERENCES public.profiles(id),
    finalized_by UUID REFERENCES public.profiles(id),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month)
);

-- ==============================================================================
-- 2. REPORTING & NOTIFICATIONS
-- ==============================================================================

-- Report Definitions
CREATE TABLE IF NOT EXISTS public.report_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    report_type text NOT NULL,
    description text,
    template_config jsonb,
    default_filters jsonb,
    available_formats text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
    ALTER TABLE public.report_definitions ADD COLUMN IF NOT EXISTS is_admin_only BOOLEAN DEFAULT false;
    ALTER TABLE public.report_definitions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.report_definitions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Generated Reports
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_definition_id uuid REFERENCES public.report_definitions(id),
    investor_id uuid REFERENCES public.profiles(id),
    report_type text NOT NULL,
    report_name text NOT NULL,
    format text,
    status text DEFAULT 'pending',
    pdf_url text,
    storage_path text,
    file_size_bytes bigint,
    report_data jsonb,
    parameters jsonb,
    filters jsonb,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

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

-- ==============================================================================
-- 3. AUM & TRANSACTIONS
-- ==============================================================================

-- Fund Daily AUM
CREATE TABLE IF NOT EXISTS public.fund_daily_aum (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fund_id UUID REFERENCES public.funds(id),
    aum_date DATE NOT NULL,
    total_aum NUMERIC,
    gross_yield NUMERIC DEFAULT 0,
    net_yield NUMERIC DEFAULT 0,
    yield_percentage NUMERIC DEFAULT 0,
    investor_count INTEGER,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(fund_id, aum_date)
);
DO $$ BEGIN
    ALTER TABLE public.fund_daily_aum ADD COLUMN IF NOT EXISTS as_of_date DATE;
    ALTER TABLE public.fund_daily_aum ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ingested';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Investor Positions
CREATE TABLE IF NOT EXISTS public.investor_positions (
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    shares NUMERIC DEFAULT 0,
    current_value NUMERIC DEFAULT 0,
    cost_basis NUMERIC DEFAULT 0,
    unrealized_pnl NUMERIC DEFAULT 0,
    realized_pnl NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (investor_id, fund_id)
);
DO $$ BEGIN
    ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS fund_class TEXT;
    ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS last_transaction_date DATE;
    ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS lock_until_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Transactions V2
CREATE TABLE IF NOT EXISTS public.transactions_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    type TEXT,
    asset TEXT,
    fund_class TEXT,
    amount NUMERIC,
    balance_before NUMERIC,
    balance_after NUMERIC,
    tx_date DATE,
    value_date DATE,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    fund_id UUID REFERENCES public.funds(id),
    amount NUMERIC,
    requested_amount NUMERIC,
    status TEXT DEFAULT 'pending',
    request_date TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    tx_hash TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES public.profiles(id),
    rejected_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Rates
CREATE TABLE IF NOT EXISTS public.daily_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_date DATE NOT NULL UNIQUE,
    btc_rate NUMERIC DEFAULT 0,
    eth_rate NUMERIC DEFAULT 0,
    sol_rate NUMERIC DEFAULT 0,
    usdt_rate NUMERIC DEFAULT 0,
    eurc_rate NUMERIC DEFAULT 0,
    xaut_rate NUMERIC DEFAULT 0,
    xrp_rate NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investor Fund Performance
CREATE TABLE IF NOT EXISTS public.investor_fund_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id),
    period_id UUID REFERENCES public.statement_periods(id),
    fund_name TEXT,
    mtd_beginning_balance NUMERIC,
    mtd_additions NUMERIC,
    mtd_redemptions NUMERIC,
    mtd_net_income NUMERIC,
    mtd_ending_balance NUMERIC,
    mtd_rate_of_return NUMERIC,
    qtd_beginning_balance NUMERIC,
    qtd_additions NUMERIC,
    qtd_redemptions NUMERIC,
    qtd_net_income NUMERIC,
    qtd_ending_balance NUMERIC,
    qtd_rate_of_return NUMERIC,
    ytd_beginning_balance NUMERIC,
    ytd_additions NUMERIC,
    ytd_redemptions NUMERIC,
    ytd_net_income NUMERIC,
    ytd_ending_balance NUMERIC,
    ytd_rate_of_return NUMERIC,
    itd_beginning_balance NUMERIC,
    itd_additions NUMERIC,
    itd_redemptions NUMERIC,
    itd_net_income NUMERIC,
    itd_ending_balance NUMERIC,
    itd_rate_of_return NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(investor_id, period_id, fund_name)
);

-- Onboarding Submissions Fix
CREATE TABLE IF NOT EXISTS public.onboarding_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES public.profiles(id), -- Ensure this points to profiles
    submission_data JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Force FK fix if table existed but pointed to investors
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'onboarding_submissions_investor_id_fkey' AND table_name = 'onboarding_submissions') THEN
        ALTER TABLE public.onboarding_submissions DROP CONSTRAINT onboarding_submissions_investor_id_fkey;
    END IF;
    ALTER TABLE public.onboarding_submissions 
    ADD CONSTRAINT onboarding_submissions_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- 4. ENABLE RLS
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_daily_aum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_fund_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Profiles visible to self and admin" ON public.profiles;
    CREATE POLICY "Profiles visible to self and admin" ON public.profiles FOR SELECT USING (auth.uid() = id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
    
    -- Funds
    DROP POLICY IF EXISTS "Funds visible to authenticated" ON public.funds;
    CREATE POLICY "Funds visible to authenticated" ON public.funds FOR SELECT TO authenticated USING (true);

    -- Statement Periods
    DROP POLICY IF EXISTS "Periods visible to authenticated" ON public.statement_periods;
    CREATE POLICY "Periods visible to authenticated" ON public.statement_periods FOR SELECT TO authenticated USING (true);

    -- Investor Data
    DROP POLICY IF EXISTS "Investor positions own access" ON public.investor_positions;
    CREATE POLICY "Investor positions own access" ON public.investor_positions FOR SELECT USING (investor_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Transactions own access" ON public.transactions_v2;
    CREATE POLICY "Transactions own access" ON public.transactions_v2 FOR SELECT USING (investor_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

    DROP POLICY IF EXISTS "Performance own access" ON public.investor_fund_performance;
    CREATE POLICY "Performance own access" ON public.investor_fund_performance FOR SELECT USING (investor_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

    -- Withdrawals
    DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON public.withdrawal_requests;
    DROP POLICY IF EXISTS "Investors can view their own withdrawal requests" ON public.withdrawal_requests;
    CREATE POLICY "Investors can view their own withdrawal requests" ON public.withdrawal_requests FOR SELECT 
    USING (investor_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
    
    DROP POLICY IF EXISTS "Investors can insert own withdrawal requests" ON public.withdrawal_requests;
    CREATE POLICY "Investors can insert own withdrawal requests" ON public.withdrawal_requests FOR INSERT 
    WITH CHECK (investor_id = auth.uid());

    -- Notifications
    DROP POLICY IF EXISTS "Notifications own access" ON public.notifications;
    CREATE POLICY "Notifications own access" ON public.notifications FOR SELECT USING (user_id = auth.uid());

EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- 5. CRITICAL RPCs
-- ==============================================================================

-- Helper: resolve investor fee pct
CREATE OR REPLACE FUNCTION public._resolve_investor_fee_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_date date
) RETURNS numeric AS $$
DECLARE
  v_fee numeric;
BEGIN
  SELECT fee_percentage INTO v_fee FROM profiles WHERE id = p_investor_id;
  RETURN COALESCE(v_fee, 0); -- Default to 0 if null
END;
$$ LANGUAGE plpgsql STABLE;

-- apply_daily_yield_to_fund
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund(uuid, date, numeric, uuid);
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid
) RETURNS TABLE (
  investor_id uuid,
  gross_amount numeric,
  fee_amount numeric,
  net_amount numeric
) AS $$
DECLARE
  v_total numeric;
  v_asset text;
  v_ref text;
  rec record;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN RAISE EXCEPTION 'Gross amount must be positive'; END IF;
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;
  
  IF v_total IS NULL OR v_total <= 0 THEN RAISE EXCEPTION 'No positions or zero AUM'; END IF;
  
  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN SELECT ip.investor_id, ip.current_value FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    investor_id := rec.investor_id; gross_amount := v_gross; fee_amount := v_fee; net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_monthly_platform_aum
DROP FUNCTION IF EXISTS public.get_monthly_platform_aum();
CREATE OR REPLACE FUNCTION public.get_monthly_platform_aum()
RETURNS TABLE (month text, total_aum numeric)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_latest_aum AS (
        SELECT fund_id, TO_CHAR(aum_date, 'YYYY-MM') AS month_key, total_aum, aum_date,
        ROW_NUMBER() OVER (PARTITION BY fund_id, TO_CHAR(aum_date, 'YYYY-MM') ORDER BY aum_date DESC) as rn
        FROM public.fund_daily_aum
    )
    SELECT mla.month_key AS month, SUM(mla.total_aum) AS total_aum
    FROM monthly_latest_aum mla WHERE mla.rn = 1 GROUP BY mla.month_key ORDER BY mla.month_key;
END;
$$;

-- get_funds_with_aum
DROP FUNCTION IF EXISTS public.get_funds_with_aum();
CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE (
    id UUID, code TEXT, name TEXT, asset TEXT, fund_class TEXT, inception_date DATE, status TEXT,
    latest_aum NUMERIC, latest_aum_date DATE, investor_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_aum AS (
        SELECT DISTINCT ON (fund_id) fund_id, total_aum, as_of_date
        FROM public.fund_daily_aum ORDER BY fund_id, as_of_date DESC
    ),
    live_aum AS (
        SELECT fund_id, SUM(current_value) as total_value, COUNT(DISTINCT investor_id) as inv_count
        FROM public.investor_positions WHERE current_value > 0 GROUP BY fund_id
    )
    SELECT f.id, f.code, f.name, f.asset, f.fund_class, f.inception_date, f.status,
        COALESCE(la.total_aum, live.total_value, 0) as latest_aum,
        la.as_of_date as latest_aum_date,
        COALESCE(live.inv_count, 0) as investor_count
    FROM public.funds f
    LEFT JOIN latest_aum la ON f.id = la.fund_id
    LEFT JOIN live_aum live ON f.id = live.fund_id;
END;
$$;

-- adjust_investor_position
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid);
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid, p_fund_id uuid, p_delta numeric, p_note text, p_admin_id uuid
) RETURNS TABLE (investor_id uuid, fund_id uuid, previous_balance numeric, new_balance numeric) AS $$
DECLARE v_prev numeric; v_new numeric; v_asset text;
BEGIN
  SELECT current_value INTO v_prev FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  IF v_prev IS NULL THEN
    v_prev := 0;
    INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
    SELECT p_investor_id, p_fund_id, f.asset, p_delta, p_delta, p_delta, now() FROM funds f WHERE f.id = p_fund_id
    ON CONFLICT (investor_id, fund_id) DO NOTHING;
  END IF;
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  v_new := coalesce(v_prev,0) + coalesce(p_delta,0);
  INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_by)
  VALUES (gen_random_uuid(), p_investor_id, p_fund_id, 'ADJUSTMENT', v_asset, p_delta, now()::date, 'position_adjustment', p_note, p_admin_id);
  UPDATE investor_positions SET current_value = v_new, shares = shares + p_delta, updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  investor_id := p_investor_id; fund_id := p_fund_id; previous_balance := coalesce(v_prev,0); new_balance := v_new;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund(uuid, date, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_platform_aum() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_funds_with_aum() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid) TO authenticated;