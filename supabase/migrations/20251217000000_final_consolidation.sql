-- ==============================================================================
-- FINAL CONSOLIDATED MIGRATION
-- Date: 2025-12-17
-- Description: Applies pending schema changes for AUM, Reporting, and Historical Data
--              Consolidates multiple previous attempts to resolve history conflicts.
-- ==============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. REPORTING INFRASTRUCTURE
-- ==============================================================================

-- Report Definitions (Templates)
CREATE TABLE IF NOT EXISTS public.report_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    report_type text NOT NULL,
    template_config jsonb,
    default_filters jsonb,
    available_formats text[],
    is_admin_only boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Generated Reports (History)
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_definition_id uuid REFERENCES public.report_definitions(id),
    investor_id uuid REFERENCES public.profiles(id),
    report_type text NOT NULL,
    report_name text NOT NULL,
    format text,
    status text DEFAULT 'pending', -- pending, processing, completed, failed
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

-- Enable RLS
ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Report Definitions Policies
DROP POLICY IF EXISTS "Admins can manage report definitions" ON public.report_definitions;
CREATE POLICY "Admins can manage report definitions"
    ON public.report_definitions
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Investors can view active public report definitions" ON public.report_definitions;
CREATE POLICY "Investors can view active public report definitions"
    ON public.report_definitions
    FOR SELECT
    USING (is_active = true AND is_admin_only = false);

-- Generated Reports Policies
DROP POLICY IF EXISTS "Admins can manage all generated reports" ON public.generated_reports;
CREATE POLICY "Admins can manage all generated reports"
    ON public.generated_reports
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Investors can view their own generated reports" ON public.generated_reports;
CREATE POLICY "Investors can view their own generated reports"
    ON public.generated_reports
    FOR SELECT
    USING (investor_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_reports_investor_id ON public.generated_reports(investor_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_created_at ON public.generated_reports(created_at DESC);


-- ==============================================================================
-- 2. AUM AGGREGATION RPC
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_platform_aum()
RETURNS TABLE (
    month text,
    total_aum numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_latest_aum AS (
        SELECT
            fund_id,
            TO_CHAR(aum_date, 'YYYY-MM') AS month_key,
            total_aum,
            aum_date,
            ROW_NUMBER() OVER (PARTITION BY fund_id, TO_CHAR(aum_date, 'YYYY-MM') ORDER BY aum_date DESC) as rn
        FROM public.fund_daily_aum
    )
    SELECT
        mla.month_key AS month,
        SUM(mla.total_aum) AS total_aum
    FROM monthly_latest_aum mla
    WHERE mla.rn = 1
    GROUP BY mla.month_key
    ORDER BY mla.month_key;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_monthly_platform_aum() TO authenticated;


-- ==============================================================================
-- 3. MOVED FEE SUMMARY VIEW AND RPCs
-- ==============================================================================

-- Platform Fees Collected View
CREATE OR REPLACE VIEW public.platform_fees_collected AS
SELECT
    fc.id,
    fc.investor_id,
    fc.fee_amount,
    f.asset AS asset_code,
    fc.calculation_date AS fee_date,
    DATE_TRUNC('month', fc.calculation_date)::DATE AS fee_month,
    fc.created_at
FROM public.fee_calculations fc
JOIN public.funds f ON fc.fund_id = f.id;

-- Monthly Fee Summary View
CREATE OR REPLACE VIEW public.monthly_fee_summary AS
WITH monthly_yields AS (
    SELECT
        TO_CHAR(sp.period_end_date, 'YYYY-MM') AS summary_month,
        ifp.fund_name AS asset_code,
        SUM(ifp.mtd_net_income) as total_gross_yield,
        COUNT(DISTINCT ifp.investor_id) as investor_count
    FROM public.investor_fund_performance ifp
    JOIN public.statement_periods sp ON ifp.period_id = sp.id
    GROUP BY TO_CHAR(sp.period_end_date, 'YYYY-MM'), ifp.fund_name
),
monthly_fees AS (
    SELECT
        DATE_TRUNC('month', fc.calculation_date)::DATE AS summary_month_date,
        TO_CHAR(fc.calculation_date, 'YYYY-MM') AS summary_month,
        f.asset AS asset_code,
        SUM(fc.fee_amount) as total_fees_collected
    FROM public.fee_calculations fc
    JOIN public.funds f ON fc.fund_id = f.id
    GROUP BY DATE_TRUNC('month', fc.calculation_date), f.asset
)
SELECT
    y.summary_month::text as summary_month,
    y.asset_code,
    COALESCE(f.total_fees_collected, 0) as total_fees_collected,
    y.total_gross_yield,
    (y.total_gross_yield - COALESCE(f.total_fees_collected, 0)) as total_net_yield,
    y.investor_count
FROM monthly_yields y
LEFT JOIN monthly_fees f ON y.summary_month = f.summary_month AND y.asset_code = f.asset_code;

-- get_all_investors_with_details RPC
CREATE OR REPLACE FUNCTION public.get_all_investors_with_details()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
      RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id, 
    p.email, 
    p.first_name, 
    p.last_name, 
    p.created_at
  FROM public.profiles p
  WHERE p.is_admin = FALSE
  ORDER BY p.created_at DESC;
END;
$$;

-- get_fund_composition RPC
CREATE OR REPLACE FUNCTION public.get_fund_composition(p_fund_id UUID, p_date DATE)
RETURNS TABLE (
    investor_name TEXT,
    email TEXT,
    balance NUMERIC,
    ownership_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fund_asset TEXT;
    v_total_fund_balance NUMERIC;
    v_period_id UUID;
BEGIN
    -- Get asset code for the fund
    SELECT asset INTO v_fund_asset FROM public.funds WHERE id = p_fund_id;
    
    -- Resolve period_id for the given date
    SELECT id INTO v_period_id
    FROM public.statement_periods
    WHERE period_end_date >= p_date
    ORDER BY period_end_date ASC
    LIMIT 1;

    IF v_period_id IS NULL THEN
        RAISE EXCEPTION 'No statement period found on or after date %', p_date;
    END IF;

    -- Calculate total balance for this asset/period
    SELECT SUM(ifp.mtd_ending_balance) INTO v_total_fund_balance
    FROM public.investor_fund_performance ifp
    WHERE ifp.fund_name = v_fund_asset AND ifp.period_id = v_period_id;

    -- Return query
    RETURN QUERY
    SELECT 
        (p.first_name || ' ' || p.last_name) as investor_name,
        p.email,
        ifp.mtd_ending_balance as balance,
        CASE 
            WHEN v_total_fund_balance > 0 THEN (ifp.mtd_ending_balance / v_total_fund_balance) * 100
            ELSE 0
        END as ownership_pct
    FROM public.investor_fund_performance ifp
    JOIN public.profiles p ON ifp.investor_id = p.id
    WHERE ifp.fund_name = v_fund_asset 
      AND ifp.period_id = v_period_id
      AND ifp.mtd_ending_balance > 0;
END;
$$;

-- update_user_profile_secure RPC
CREATE OR REPLACE FUNCTION public.update_user_profile_secure(
    p_user_id UUID, 
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
      RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update Profile
  UPDATE public.profiles
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;


-- ==============================================================================
-- 4. HISTORICAL DATA IMPORT
-- ==============================================================================

-- Temporarily allow NULL for created_by in statement_periods for historical data import
-- Check if column exists and has NOT NULL constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'statement_periods' AND column_name = 'created_by' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.statement_periods ALTER COLUMN created_by DROP NOT NULL;
    END IF;
END $$;

-- STEP 1: Ensure funds exist with correct asset codes
INSERT INTO funds (code, name, asset, fund_class, inception_date, status)
VALUES
  ('BTCYF', 'BTC Yield Fund', 'BTC', 'BTC', '2024-08-01', 'active'),
  ('ETHYF', 'ETH Yield Fund', 'ETH', 'ETH', '2025-05-26', 'active'),
  ('USDTYF', 'USDT Yield Fund', 'USDT', 'USDT', '2025-06-16', 'active'),
  ('SOLYF', 'SOL Yield Fund', 'SOL', 'SOL', '2025-09-02', 'active'),
  ('XRPYF', 'XRP Yield Fund', 'XRP', 'XRP', '2025-11-17', 'active')
ON CONFLICT (code) DO UPDATE SET status = 'active', fund_class = EXCLUDED.fund_class;

-- STEP 2: Insert statement periods (if they don't exist)
INSERT INTO public.statement_periods (year, month, period_name, period_end_date, status)
VALUES
    (2024, 8, 'August 2024', '2024-08-31', 'finalized'),
    (2024, 9, 'September 2024', '2024-09-30', 'finalized'),
    (2024, 10, 'October 2024', '2024-10-31', 'finalized'),
    (2024, 11, 'November 2024', '2024-11-30', 'finalized'),
    (2024, 12, 'December 2024', '2024-12-31', 'finalized')
ON CONFLICT (year, month) DO UPDATE SET period_name = EXCLUDED.period_name, period_end_date = EXCLUDED.period_end_date;

-- STEP 3: Insert Historical Investor Performance Data
INSERT INTO public.investor_fund_performance (
    investor_id,
    period_id,
    fund_name,
    mtd_beginning_balance,
    mtd_additions,
    mtd_redemptions,
    mtd_net_income,
    mtd_ending_balance,
    mtd_rate_of_return,
    qtd_beginning_balance,
    qtd_additions,
    qtd_redemptions,
    qtd_net_income,
    qtd_ending_balance,
    qtd_rate_of_return,
    ytd_beginning_balance,
    ytd_additions,
    ytd_redemptions,
    ytd_net_income,
    ytd_ending_balance,
    ytd_rate_of_return,
    itd_beginning_balance,
    itd_additions,
    itd_redemptions,
    itd_net_income,
    itd_ending_balance,
    itd_rate_of_return,
    created_at,
    updated_at
)
SELECT
    p.id as investor_id,
    sp.id as period_id,
    'BTC' as fund_name,
    1000.00 as mtd_beginning_balance,
    100.00 as mtd_additions,
    0.00 as mtd_redemptions,
    50.00 as mtd_net_income,
    1150.00 as mtd_ending_balance,
    0.05 as mtd_rate_of_return,
    1000.00 as qtd_beginning_balance,
    100.00 as qtd_additions,
    0.00 as qtd_redemptions,
    50.00 as qtd_net_income,
    1150.00 as qtd_ending_balance,
    0.05 as qtd_rate_of_return,
    1000.00 as ytd_beginning_balance,
    100.00 as ytd_additions,
    0.00 as ytd_redemptions,
    50.00 as ytd_net_income,
    1150.00 as ytd_ending_balance,
    0.05 as ytd_rate_of_return,
    1000.00 as itd_beginning_balance,
    100.00 as itd_additions,
    0.00 as itd_redemptions,
    50.00 as itd_net_income,
    1150.00 as itd_ending_balance,
    0.05 as itd_rate_of_return,
    NOW(),
    NOW()
FROM public.profiles p, public.statement_periods sp
WHERE p.email = 'investor@example.com'
  AND sp.year = 2024 AND sp.month = 8
ON CONFLICT (investor_id, period_id, fund_name) DO NOTHING;
