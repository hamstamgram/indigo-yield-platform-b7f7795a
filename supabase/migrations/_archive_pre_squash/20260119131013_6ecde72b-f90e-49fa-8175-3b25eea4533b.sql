-- P0-3 Security Fix: Add search_path to SECURITY DEFINER functions
-- Risk: SQL injection via search_path manipulation

-- Only fixing custom platform functions that are SECURITY DEFINER
-- Built-in extension functions (gin_*, gtrgm_*) are excluded

ALTER FUNCTION public.enforce_canonical_aum_event_mutation() SET search_path = public;
ALTER FUNCTION public.enforce_canonical_daily_aum_mutation() SET search_path = public;
ALTER FUNCTION public.enforce_canonical_position_mutation() SET search_path = public;
ALTER FUNCTION public.enforce_canonical_transaction_mutation() SET search_path = public;
ALTER FUNCTION public.enforce_canonical_yield_mutation() SET search_path = public;
ALTER FUNCTION public.export_investor_data(uuid) SET search_path = public;
ALTER FUNCTION public.get_fund_summary() SET search_path = public;

-- Also add to trigger functions that access tables
ALTER FUNCTION public.check_email_uniqueness() SET search_path = public;
ALTER FUNCTION public.enforce_economic_date() SET search_path = public;
ALTER FUNCTION public.enforce_transactions_v2_immutability() SET search_path = public;
ALTER FUNCTION public.enforce_yield_event_date() SET search_path = public;
ALTER FUNCTION public.calculate_reconciliation_tolerance(numeric, text) SET search_path = public;

-- Fix get_kpi_metrics (has overloads)
DO $$ BEGIN
  ALTER FUNCTION public.get_kpi_metrics(text) SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;