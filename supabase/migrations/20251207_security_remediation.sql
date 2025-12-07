-- ============================================================================
-- SECURITY REMEDIATION MIGRATION
-- Date: 2025-12-07
-- Priority: CRITICAL
-- ============================================================================
-- This migration addresses critical security vulnerabilities identified in the
-- security audit. Apply immediately to production.
-- ============================================================================

-- ============================================================================
-- CRITICAL FIX #1: daily_nav table RLS policy
-- ============================================================================
-- ISSUE: The daily_nav table has an overly permissive RLS policy (qual: true)
--        that exposes 3,530 rows of sensitive fund performance data to
--        unauthenticated users.
--
-- RISK: Competitors can scrape complete fund performance history including:
--       - Assets Under Management (AUM)
--       - NAV per share
--       - Gross/net returns
--       - Fee information
--       - Investor counts
--       - Cash flow data
-- ============================================================================

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "daily_nav_select_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_public_select" ON public.daily_nav;
DROP POLICY IF EXISTS "Allow public read access" ON public.daily_nav;

-- Step 2: Create secure policy - authenticated users only
CREATE POLICY "daily_nav_select_authenticated" ON public.daily_nav
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Step 3: Create admin-only policies for write operations
DROP POLICY IF EXISTS "daily_nav_insert_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_update_policy" ON public.daily_nav;
DROP POLICY IF EXISTS "daily_nav_delete_policy" ON public.daily_nav;

CREATE POLICY "daily_nav_insert_admin" ON public.daily_nav
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "daily_nav_update_admin" ON public.daily_nav
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "daily_nav_delete_admin" ON public.daily_nav
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- ============================================================================
-- AUDIT: Check for other tables with overly permissive policies
-- ============================================================================
-- Run this query to find other tables that might have similar issues:
--
-- SELECT schemaname, tablename, policyname, qual
-- FROM pg_policies
-- WHERE qual = 'true' OR qual LIKE '%public%'
-- ORDER BY tablename;
-- ============================================================================

-- ============================================================================
-- VERIFICATION: Confirm RLS is enabled and policies are correct
-- ============================================================================
-- After applying, verify with:
--
-- SELECT
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual
-- FROM pg_policies
-- WHERE tablename = 'daily_nav';
-- ============================================================================

-- Log this security fix
INSERT INTO public.audit_log (action, entity, entity_id, meta)
VALUES (
    'SECURITY_FIX',
    'daily_nav',
    NULL,
    jsonb_build_object(
        'fix_type', 'RLS_POLICY_HARDENING',
        'description', 'Replaced overly permissive SELECT policy with authenticated-only access',
        'affected_rows', 3530,
        'applied_at', NOW()
    )
);
