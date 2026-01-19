-- Phase 3: Drop dead investor RPC functions
-- These functions have no frontend callers, no internal callers, and no RLS/trigger usage

-- P3-01: Drop get_investor_period_summary (no callers found)
DROP FUNCTION IF EXISTS public.get_investor_period_summary(uuid, date, date);

-- P3-02: Drop get_investor_position_as_of (no callers found)
DROP FUNCTION IF EXISTS public.get_investor_position_as_of(uuid, uuid, date);

-- P3-03: Drop get_investor_positions_by_class (no callers found)
DROP FUNCTION IF EXISTS public.get_investor_positions_by_class(uuid);

-- P3-04: Drop get_investor_yield_events_in_range (no callers found)
DROP FUNCTION IF EXISTS public.get_investor_yield_events_in_range(uuid, uuid, date, date);

-- P3-05: Drop preview_investor_balances (no callers found)
DROP FUNCTION IF EXISTS public.preview_investor_balances(uuid);

-- P3-06: Drop get_all_positions_at_date (no callers found)
DROP FUNCTION IF EXISTS public.get_all_positions_at_date(uuid, date);

-- P3-07: Drop get_position_at_date (only caller was get_investor_period_summary which is being dropped)
DROP FUNCTION IF EXISTS public.get_position_at_date(uuid, uuid, date);

-- Document retained functions
COMMENT ON FUNCTION public.get_position_reconciliation IS 
'Admin reconciliation tool - compares investor_positions to ledger totals. Used in admin UI for data integrity checks.';

COMMENT ON FUNCTION public.can_access_investor IS 
'RLS helper - checks if current user can access investor data. Used for authorization in views and policies.';

COMMENT ON FUNCTION public.get_available_balance IS 
'Returns available balance for withdrawals (current position minus pending withdrawals). Used by validate_withdrawal_request trigger.';

COMMENT ON FUNCTION public.can_withdraw IS 
'Validates if an investor can withdraw a specific amount. Used by create_withdrawal_request RPC.';

COMMENT ON FUNCTION public.force_delete_investor IS 
'Cascading investor deletion - removes all related data in correct order. Requires super_admin. Used from admin UI.';