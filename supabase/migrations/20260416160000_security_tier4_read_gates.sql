-- ============================================================================
-- Tier 4: Authorization gates on ungated SECURITY DEFINER read functions
-- Date: 2026-04-16
-- Ref: docs/audit/53-rls-verification-audit.md
-- ============================================================================
-- GAP-1: get_investor_fee_pct / _resolve_investor_fee_pct
--   Any authenticated user could query any investor's fee percentage
-- FIX: Add can_access_investor() gate (admin / self / IB-parent)
--
-- GAP-2: get_investor_ib_pct / _resolve_investor_ib_pct
--   Any authenticated user could query any investor's IB commission rate
-- FIX: Add can_access_investor() gate
--
-- GAP-3: get_system_mode
--   SECDEF bypasses system_config admin-only RLS
-- FIX: Add is_admin() gate (system_mode is operational metadata, admin-only)
--
-- GAP-4: get_user_admin_status
--   Any authenticated user could check any UUID's admin status
-- FIX: Restrict to self-query or admin (auth.uid() = p_user_id OR is_admin())
-- ============================================================================

-- ---------------------------------------------------------------------------
-- GAP-1 & GAP-2: Gate _resolve_investor_fee_pct and _resolve_investor_ib_pct
-- These are the internal resolvers called by the public wrappers.
-- Gate at the top so even direct calls are blocked.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._resolve_investor_fee_pct(
  p_investor_id uuid,
  p_fund_id   uuid,
  p_date      date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fee numeric;
  v_account_type text;
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor fee lookup';
  END IF;

  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  SELECT fee_pct INTO v_fee
  FROM public.investor_fee_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  SELECT fee_pct INTO v_fee FROM public.profiles WHERE id = p_investor_id;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  IF p_fund_id IS NOT NULL THEN
    SELECT (perf_fee_bps / 100.0) INTO v_fee FROM funds WHERE id = p_fund_id;
    IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;
  END IF;

  RETURN 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public._resolve_investor_ib_pct(
  p_investor_id uuid,
  p_fund_id   uuid,
  p_date      date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ib_pct numeric;
  v_account_type text;
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor IB lookup';
  END IF;

  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN
    RETURN 0;
  END IF;

  SELECT ib_percentage INTO v_ib_pct
  FROM public.ib_commission_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC
  LIMIT 1;
  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  SELECT ib_percentage INTO v_ib_pct FROM public.profiles WHERE id = p_investor_id;
  IF v_ib_pct IS NOT NULL THEN RETURN v_ib_pct; END IF;

  RETURN 0;
END;
$function$;

-- ---------------------------------------------------------------------------
-- GAP-1: Gate get_investor_fee_pct (public wrapper)
-- Convert from sql to plpgsql to add authorization check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_investor_fee_pct(
  p_investor_id      uuid,
  p_fund_id          uuid,
  p_effective_date   date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor fee lookup';
  END IF;
  RETURN public._resolve_investor_fee_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$function$;

-- ---------------------------------------------------------------------------
-- GAP-2: Gate get_investor_ib_pct (public wrapper)
-- Convert from sql to plpgsql to add authorization check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_investor_ib_pct(
  p_investor_id      uuid,
  p_fund_id          uuid,
  p_effective_date   date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_access_investor(p_investor_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions for investor IB lookup';
  END IF;
  RETURN public._resolve_investor_ib_pct(p_investor_id, p_fund_id, p_effective_date);
END;
$function$;

-- ---------------------------------------------------------------------------
-- GAP-3: Gate get_system_mode
-- System mode is operational metadata (normal/maintenance/readonly).
-- Restrict to admin users; SECDEF was bypassing system_config RLS.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_system_mode()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin required for system mode';
  END IF;
  RETURN (SELECT value::text FROM system_config WHERE key = 'system_mode');
END;
$function$;

-- ---------------------------------------------------------------------------
-- GAP-4: Gate get_user_admin_status
-- Restrict to self-query or admin. Frontend calls this during auth flow
-- with the current user's own UUID, which remains supported.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() != user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only check own admin status';
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = get_user_admin_status.user_id
      AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- Revoke direct EXECUTE on _resolve helpers from PUBLIC
-- PostgreSQL grants EXECUTE to PUBLIC by default. authenticated/anon inherit
-- from PUBLIC, so we must revoke from PUBLIC and re-grant only to service_role.
-- These should only be called by the public wrappers (which use SECDEF).
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public._resolve_investor_fee_pct(uuid, uuid, date) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public._resolve_investor_ib_pct(uuid, uuid, date) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public._resolve_investor_fee_pct(uuid, uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public._resolve_investor_ib_pct(uuid, uuid, date) TO service_role;

-- ---------------------------------------------------------------------------
-- Document the gating via function comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.get_investor_fee_pct IS 'SECDEF: gated by can_access_investor() since Tier 4 (2026-04-16)';
COMMENT ON FUNCTION public.get_investor_ib_pct IS 'SECDEF: gated by can_access_investor() since Tier 4 (2026-04-16)';
COMMENT ON FUNCTION public.get_system_mode IS 'SECDEF: gated by is_admin() since Tier 4 (2026-04-16)';
COMMENT ON FUNCTION public.get_user_admin_status IS 'SECDEF: gated by self-or-admin since Tier 4 (2026-04-16)';
COMMENT ON FUNCTION public._resolve_investor_fee_pct IS 'SECDEF: gated by can_access_investor() since Tier 4 (2026-04-16); EXECUTE revoked from anon/authenticated';
COMMENT ON FUNCTION public._resolve_investor_ib_pct IS 'SECDEF: gated by can_access_investor() since Tier 4 (2026-04-16); EXECUTE revoked from anon/authenticated';