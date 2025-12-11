-- ==============================================================================
-- Migration: Fix Broken References and Optimization
-- Date: 2025-12-18
-- Description: Fixes broken FKs and RLS policies from 'investors' table drop.
--              Adds RPC for performance optimization.
-- ==============================================================================

-- 1. Fix onboarding_submissions Foreign Key
DO $$
BEGIN
    -- Drop old constraint if it exists (name might vary, check common names)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'onboarding_submissions_investor_id_fkey' AND table_name = 'onboarding_submissions') THEN
        ALTER TABLE public.onboarding_submissions DROP CONSTRAINT onboarding_submissions_investor_id_fkey;
    END IF;

    -- Add new constraint referencing profiles
    ALTER TABLE public.onboarding_submissions
    ADD CONSTRAINT onboarding_submissions_investor_id_fkey
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- 2. Fix withdrawal_requests RLS Policy
DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Investors can view their own withdrawal requests" ON public.withdrawal_requests;

CREATE POLICY "Investors can view their own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (
    investor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 3. Create get_funds_with_aum RPC (Performance Optimization)
CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE (
    id UUID,
    code TEXT,
    name TEXT,
    asset TEXT,
    fund_class TEXT,
    inception_date DATE,
    status public.fund_status,
    latest_aum NUMERIC,
    latest_aum_date DATE,
    investor_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH latest_aum AS (
        SELECT DISTINCT ON (fund_id)
            fund_id,
            total_aum,
            as_of_date
        FROM public.fund_daily_aum
        ORDER BY fund_id, as_of_date DESC
    ),
    live_aum AS (
        SELECT
            fund_id,
            SUM(current_value) as total_value,
            COUNT(DISTINCT investor_id) as inv_count
        FROM public.investor_positions
        WHERE current_value > 0
        GROUP BY fund_id
    )
    SELECT
        f.id,
        f.code,
        f.name,
        f.asset,
        f.fund_class,
        f.inception_date,
        f.status,
        COALESCE(la.total_aum, live.total_value, 0) as latest_aum,
        la.as_of_date as latest_aum_date,
        COALESCE(live.inv_count, 0) as investor_count
    FROM public.funds f
    LEFT JOIN latest_aum la ON f.id = la.fund_id
    LEFT JOIN live_aum live ON f.id = live.fund_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_funds_with_aum() TO authenticated;
