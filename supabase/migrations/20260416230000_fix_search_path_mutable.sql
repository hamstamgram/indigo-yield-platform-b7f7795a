-- ============================================================
-- Fix SEARCH_PATH MUTABLE on apply_yield_distribution_v5_with_lock
-- (P1 — Lovable Security Scanner)
--
-- PROBLEM: This SECURITY DEFINER function has no search_path
-- set, making it vulnerable to search path injection.
--
-- FIX: Add SET search_path TO 'public' to the function.
-- Note: This function already has is_admin() gate from prior migration.
-- ============================================================

DO $$
DECLARE
  funcdef text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO funcdef
  FROM pg_proc
  WHERE proname = 'apply_yield_distribution_v5_with_lock'
    AND pronamespace = 'public'::regnamespace;

  IF funcdef IS NULL THEN
    RAISE EXCEPTION 'Function apply_yield_distribution_v5_with_lock not found';
  END IF;

  -- Inject SET search_path if not already present
  IF position('SET search_path' IN funcdef) = 0 THEN
    funcdef := replace(
      funcdef,
      'LANGUAGE plpgsql',
      'LANGUAGE plpgsql SET search_path TO ''public'''
    );
    EXECUTE funcdef;
    RAISE NOTICE 'Added search_path to apply_yield_distribution_v5_with_lock';
  ELSE
    RAISE NOTICE 'search_path already set on apply_yield_distribution_v5_with_lock';
  END IF;
END;
$$;