-- =============================================================
-- Fix can_access_investor: Add canonical_rpc bypass
-- 2026-04-17 | Critical: Yield distribution SECDEF batch functions
-- iterate over all investors calling get_investor_fee_pct/ib_pct.
-- These now have can_access_investor() gates that check per-investor
-- access. The canonical_rpc flag is set by all mutation RPCs after
-- verifying admin access, so bypassing per-investor checks is safe.
-- =============================================================

CREATE OR REPLACE FUNCTION public.can_access_investor(investor_uuid uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Bypass for canonical RPC callers (SECDEF mutation functions
  -- that already verified admin access and set this flag)
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN true;
  END IF;

  IF public.is_admin() THEN RETURN true; END IF;
  IF auth.uid() = investor_uuid THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = investor_uuid AND ib_parent_id = auth.uid()
  );
END;
$function$;

ALTER FUNCTION public.can_access_investor(investor_uuid uuid) OWNER TO "postgres";

COMMENT ON FUNCTION public.can_access_investor(investor_uuid uuid) IS
  'RLS helper — checks if current user can access investor data.
   Admins always pass. Self-access always passes.
   IB parents can access their referrals.
   canonical_rpc bypass for SECDEF batch functions that already verified admin.';