-- Fix existing functions by dropping and recreating them
-- This migration handles cases where functions already exist with different signatures

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_all_non_admin_profiles();
DROP FUNCTION IF EXISTS public.get_profile_by_id(uuid);
DROP FUNCTION IF EXISTS public.get_investor_portfolio_summary(uuid);
DROP FUNCTION IF EXISTS public.get_all_investors_with_summary();
