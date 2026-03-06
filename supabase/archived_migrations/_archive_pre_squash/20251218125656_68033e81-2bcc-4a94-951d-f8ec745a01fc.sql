
-- Fix the 2 remaining overloaded apply_daily_yield_to_fund functions
ALTER FUNCTION public.apply_daily_yield_to_fund(text, date, numeric) SET search_path = public;
ALTER FUNCTION public.apply_daily_yield_to_fund(uuid, date, numeric, uuid) SET search_path = public;
