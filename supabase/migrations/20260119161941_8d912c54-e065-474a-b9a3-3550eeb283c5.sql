-- P1-04: Standardize Investor Lookup Functions
-- Drop unused RPC functions and document retained ones

-- =====================================================
-- PHASE 1: Drop unused investor lookup RPCs
-- These functions have ZERO calls in the frontend codebase
-- =====================================================

-- Drop get_all_investors_with_details (never called)
DROP FUNCTION IF EXISTS public.get_all_investors_with_details();

-- Drop get_all_non_admin_profiles (never called)
DROP FUNCTION IF EXISTS public.get_all_non_admin_profiles();

-- Drop get_profile_by_id (never called - frontend uses direct profiles queries)
DROP FUNCTION IF EXISTS public.get_profile_by_id(uuid);

-- Drop get_investor_portfolio_summary (never called)
DROP FUNCTION IF EXISTS public.get_investor_portfolio_summary(uuid);

-- =====================================================
-- PHASE 2: Document retained investor lookup functions
-- =====================================================

COMMENT ON FUNCTION public.get_investor_period_summary(uuid, date, date) IS 
  'Returns investor period metrics (beginning/ending value, deposits, withdrawals, income, return rate). Used for statement generation. P1-04 retained.';

COMMENT ON FUNCTION public.get_investor_position_as_of(uuid, uuid, date) IS 
  'Returns investor position state at a specific date. Used for historical reporting. P1-04 retained.';

COMMENT ON FUNCTION public.get_investor_positions_by_class(uuid) IS 
  'Returns investor positions grouped by fund class with allocation percentages. P1-04 retained.';

COMMENT ON FUNCTION public.get_investor_yield_events_in_range(uuid, uuid, date, date) IS 
  'Returns yield events for an investor within a date range. Used for yield history display. P1-04 retained.';

COMMENT ON FUNCTION public.can_access_investor(uuid) IS 
  'Security function: checks if current user can access investor data based on RLS rules. P1-04 retained.';