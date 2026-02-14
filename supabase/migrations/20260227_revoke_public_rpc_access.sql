-- Revoke public execute permissions on sensitive admin RPCs
-- These functions handle financial data or administrative actions

REVOKE ALL ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, date, uuid) FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.void_transaction(uuid, uuid, text) FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.get_investor_reports_v2(uuid) FROM authenticated, anon, public;
REVOKE ALL ON FUNCTION public.generate_investor_report(uuid, date, uuid) FROM authenticated, anon, public;

-- Ensure service_role still has access (redundant but safe)
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_investor_reports_v2(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_investor_report(uuid, date, uuid) TO service_role;
