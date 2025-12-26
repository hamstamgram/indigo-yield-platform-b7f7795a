-- RLS Policy Fix: investor_fund_performance
-- Date: 2024-12-22
-- Issue: Overlapping RLS policy without purpose filter
-- Fix: Drop "Performance own access" policy that could leak transaction-purpose data

-- BEFORE: 3 SELECT policies on investor_fund_performance
-- 1. "Admins can manage performance data" - FOR ALL
-- 2. "Performance own access" - SELECT (NO purpose filter - PROBLEM)
-- 3. "investor_fund_performance_select_own" - SELECT (WITH purpose filter - CORRECT)

-- The overlapping policy "Performance own access" didn't filter by purpose='reporting',
-- potentially exposing transaction-purpose data to investors

-- FIX APPLIED:
DROP POLICY IF EXISTS "Performance own access" ON public.investor_fund_performance;

-- AFTER: 2 SELECT policies remain
-- 1. "Admins can manage performance data" - FOR ALL (admin access)
-- 2. "investor_fund_performance_select_own" - SELECT with purpose filter:
--    (((investor_id = auth.uid()) AND ((purpose = 'reporting'::aum_purpose) OR (purpose IS NULL))) OR is_admin())

-- VERIFICATION QUERY:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'investor_fund_performance';

-- Expected result: Only investor_fund_performance_select_own remains for SELECT,
-- and it properly filters to purpose='reporting' for non-admin users
