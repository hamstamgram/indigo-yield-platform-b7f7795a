-- Down migration: Rollback admin investor functions
-- This file reverts changes made in 20250109_admin_investor_functions.sql

-- Drop the RPC functions
DROP FUNCTION IF EXISTS public.get_all_non_admin_profiles();
DROP FUNCTION IF EXISTS public.get_profile_by_id(uuid);
DROP FUNCTION IF EXISTS public.get_investor_portfolio_summary(uuid);
DROP FUNCTION IF EXISTS public.get_all_investors_with_summary();
DROP FUNCTION IF EXISTS public.is_admin_for_jwt();

-- Note: This down migration should only be run if there's a critical issue
-- with the admin investor functions that requires immediate rollback
