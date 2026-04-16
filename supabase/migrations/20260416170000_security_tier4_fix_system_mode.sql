-- =============================================================
-- Security Tier 4: Fix get_system_mode gate (REVERT is_admin gate)
-- 2026-04-16 | Hotfix for Tier 4 migration
--
-- The Tier 4 migration (20260416160000) gated get_system_mode with
-- is_admin(). This BREAKS trigger logic:
--   enforce_economic_date and enforce_yield_event_date call
--   get_system_mode() = '"live"' during investor DML operations.
--   When a non-admin investor triggers DML, is_admin() returns
--   false, causing the trigger to raise "Access denied".
--
-- REVERT: Restore get_system_mode to ungated SQL function.
-- Rationale (per docs/audit/54-special-function-hardening.md):
--   - LOW risk: returns operational state string
--   - No frontend usage
--   - Required by triggers that fire in non-admin session context
--   - Adding is_admin() would break investor deposit/transaction flows
--
-- REVOKE anon grant as defense-in-depth (already done in Tier 3.5
-- but re-apply to be idempotent after Tier 4's changes).
-- =============================================================

-- Restore get_system_mode as ungated SQL function
CREATE OR REPLACE FUNCTION public.get_system_mode()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT value::text FROM system_config WHERE key = 'system_mode';
$function$;

-- Re-apply anon revocation (defense-in-depth)
REVOKE EXECUTE ON FUNCTION public.get_system_mode() FROM anon;