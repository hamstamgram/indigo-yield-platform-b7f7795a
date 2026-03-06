-- =====================================================
-- P0: RLS SECURITY HARDENING - Clean Migration
-- =====================================================

-- 1. Create secure view for public profile information (display names only)
CREATE VIEW public.profiles_display AS
SELECT 
  id,
  first_name,
  last_name,
  status,
  account_type,
  is_system_account,
  created_at
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_display TO authenticated;

-- 2. Add documentation comments
COMMENT ON VIEW public.profiles_display IS 
'Safe view exposing only non-PII profile fields for display purposes. Use this for investor name lookups instead of querying profiles directly.';

COMMENT ON TABLE public.investor_emails IS 
'Contains investor email addresses. RLS restricts access to profile owner or admin only to prevent enumeration attacks.';