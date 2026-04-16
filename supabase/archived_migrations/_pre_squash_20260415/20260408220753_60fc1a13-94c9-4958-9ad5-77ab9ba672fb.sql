
-- ============================================================
-- Migration D: Lock down anon EXECUTE permissions (Gate 0 blocker)
-- ============================================================

-- 1. Revoke default privileges so future functions don't auto-grant to anon/PUBLIC
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

-- 2. Revoke EXECUTE from anon and PUBLIC on ALL existing public functions
DO $$
DECLARE
  fn_oid oid;
BEGIN
  FOR fn_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn_oid::regprocedure);
  END LOOP;
END;
$$;

-- 3. Ensure authenticated and service_role retain EXECUTE on all functions
DO $$
DECLARE
  fn_oid oid;
BEGIN
  FOR fn_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn_oid::regprocedure);
  END LOOP;
END;
$$;

-- 4. Grant default privileges for future functions to authenticated + service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 5. Whitelist: grant anon EXECUTE only on essential signup/RLS helper functions
GRANT EXECUTE ON FUNCTION public.create_profile_on_signup() TO anon;
GRANT EXECUTE ON FUNCTION public.assign_default_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.can_access_notification(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_insert_notification() TO anon;
GRANT EXECUTE ON FUNCTION public.can_access_investor(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.check_duplicate_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_uniqueness() TO anon;
GRANT EXECUTE ON FUNCTION public.compute_profile_role(uuid, account_type, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.block_test_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.build_error_response(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.build_success_response(jsonb, text) TO anon;
