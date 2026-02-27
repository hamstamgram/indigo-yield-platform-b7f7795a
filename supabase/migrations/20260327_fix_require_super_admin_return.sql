-- Fix require_super_admin() 0-arg overload: returns uuid but calls 2-arg which returns void
-- PostgreSQL tries to cast void -> uuid, gets "" which fails with "invalid input syntax for type uuid"
-- Impact: approve_and_complete_withdrawal (and any caller using v_admin := require_super_admin()) fails

CREATE OR REPLACE FUNCTION public.require_super_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  -- Call the 2-arg version for the actual auth check + audit log (returns void)
  PERFORM public.require_super_admin('operation', v_uid);
  -- Return the caller's uid
  RETURN v_uid;
END;
$$;
