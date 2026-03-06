-- ================================================================
-- Migration: Fix SECURITY DEFINER functions missing SET search_path
-- Date: 2026-01-28
-- Severity: MEDIUM
-- Description: Add SET search_path = public to SECURITY DEFINER functions
--              that were missing it, to prevent search_path hijacking attacks.
-- ================================================================

BEGIN;

-- ============================================================================
-- FIX 1: require_admin - add missing SET search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.require_admin(p_operation text DEFAULT 'this operation')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied: Only administrators can perform %', p_operation
            USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.require_admin(text) IS
'Helper function to enforce admin-only access. Raises exception if caller is not an admin. SET search_path = public for security.';

-- ============================================================================
-- VERIFICATION: Ensure all SECURITY DEFINER functions have search_path set
-- ============================================================================

DO $$
DECLARE
    v_unsafe_functions text;
BEGIN
    -- Check for SECURITY DEFINER functions without SET search_path
    SELECT string_agg(p.proname, ', ' ORDER BY p.proname)
    INTO v_unsafe_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%';

    IF v_unsafe_functions IS NOT NULL THEN
        RAISE WARNING 'SECURITY DEFINER functions without SET search_path: %', v_unsafe_functions;
    ELSE
        RAISE NOTICE 'SUCCESS: All SECURITY DEFINER functions have SET search_path';
    END IF;
END $$;

COMMIT;
