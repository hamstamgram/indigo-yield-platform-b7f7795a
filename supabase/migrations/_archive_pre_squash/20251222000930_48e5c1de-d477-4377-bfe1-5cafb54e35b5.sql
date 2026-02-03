-- Fix overlapping RLS policy on investor_fund_performance
-- The "Performance own access" policy doesn't filter by purpose, potentially leaking transaction-purpose data

-- Drop the overlapping policy without purpose filter
DROP POLICY IF EXISTS "Performance own access" ON public.investor_fund_performance;

-- The existing policy 'investor_fund_performance_select_own' already correctly filters by purpose
-- Verify it exists and is correct (no changes needed - just confirmation comment)
-- policy: investor_fund_performance_select_own 
-- (((investor_id = auth.uid()) AND ((purpose = 'reporting'::aum_purpose) OR (purpose IS NULL))) OR is_admin())