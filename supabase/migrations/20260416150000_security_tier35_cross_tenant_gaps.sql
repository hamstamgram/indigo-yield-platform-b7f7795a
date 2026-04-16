-- =============================================================
-- Security Tier 3.5: Cross-tenant read gap fixes
-- 2026-04-16 | RLS Verification (Tier 4) findings
--
-- GAP-1 (CRITICAL): get_investor_fee_pct — exposes other investors' fee arrangements
-- GAP-2 (CRITICAL): get_investor_ib_pct — exposes other investors' IB commission rates
-- GAP-4 (MEDIUM): get_user_admin_status — reveals admin identity to any caller
--
-- Approach:
-- - get_investor_fee_pct/ib_pct: Use can_access_investor() (admin, self, IB parent)
-- - get_user_admin_status: Restrict to self-query or admin
-- - _resolve_ helpers left ungated (internal, called by gated parents)
-- - Revoke anon EXECUTE grant on all 3 functions
-- =============================================================

-- 1. get_investor_fee_pct (sql -> plpgsql for gate)
CREATE OR REPLACE FUNCTION public.get_investor_fee_pct(p_investor_id uuid, p_fund_id uuid, p_effective_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: cannot query another investor''s fee data';
  END IF;
  RETURN public._resolve_investor_fee_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$function$;

-- 2. get_investor_ib_pct (sql -> plpgsql for gate)
CREATE OR REPLACE FUNCTION public.get_investor_ib_pct(p_investor_id uuid, p_fund_id uuid, p_effective_date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: cannot query another investor''s IB data';
  END IF;
  RETURN public._resolve_investor_ib_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$function$;

-- 3. get_user_admin_status (sql -> plpgsql for self-query or admin gate)
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF user_id != auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: can only check own admin status';
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = get_user_admin_status.user_id
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- 4. Revoke anon EXECUTE grants (defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.get_investor_fee_pct(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_investor_ib_pct(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_admin_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_system_mode() FROM anon;