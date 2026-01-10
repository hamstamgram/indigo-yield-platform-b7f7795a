-- Fix SECURITY DEFINER view warning
-- Recreate view without SECURITY DEFINER (use SECURITY INVOKER which is default)
DROP VIEW IF EXISTS public.profiles_display;

CREATE VIEW public.profiles_display 
WITH (security_invoker = true) AS
SELECT 
  id,
  first_name,
  last_name,
  status,
  account_type,
  is_system_account,
  created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_display TO authenticated;

COMMENT ON VIEW public.profiles_display IS 
'Safe view exposing only non-PII profile fields for display purposes. Uses SECURITY INVOKER so RLS policies on profiles table are enforced.';