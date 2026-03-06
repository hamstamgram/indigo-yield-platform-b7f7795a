-- Migration: Comprehensive SECURITY DEFINER Remediation
-- Date: 2026-01-11
-- Purpose: Fix ALL SECURITY DEFINER functions missing SET search_path = public
-- Author: Forensic Audit System
--
-- This migration dynamically identifies and fixes all SECURITY DEFINER functions
-- that are missing the search_path security setting to prevent SQL injection
-- via search_path manipulation attacks.

-- ============================================================================
-- PRE-MIGRATION AUDIT
-- ============================================================================

-- Record pre-migration state
DO $$
DECLARE
  v_total_security_definer int;
  v_with_search_path int;
  v_missing_search_path int;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig)),
    COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT 'search_path=public' = ANY(proconfig))
  INTO v_total_security_definer, v_with_search_path, v_missing_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.prosecdef = true AND n.nspname = 'public';

  RAISE NOTICE 'PRE-MIGRATION: Total SECURITY DEFINER: %, With search_path: %, Missing: %',
    v_total_security_definer, v_with_search_path, v_missing_search_path;

  -- Log to audit
  INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
  VALUES (
    'SECURITY_REMEDIATION_START',
    'migrations',
    '20260111143607_8d971c64-ddcf-4223-8fd1-96ecfaffd668',
    jsonb_build_object(
      'total_security_definer', v_total_security_definer,
      'with_search_path', v_with_search_path,
      'missing_search_path', v_missing_search_path
    ),
    jsonb_build_object('audit_type', 'ultrathink_forensic')
  );
END $$;

-- ============================================================================
-- DYNAMIC REMEDIATION
-- ============================================================================

-- Fix ALL SECURITY DEFINER functions missing search_path
DO $$
DECLARE
  r RECORD;
  v_fixed_count int := 0;
  v_error_count int := 0;
  v_fixed_functions text[] := '{}';
  v_error_functions text[] := '{}';
BEGIN
  -- Loop through all SECURITY DEFINER functions without search_path
  FOR r IN
    SELECT
      p.oid,
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT 'search_path=public' = ANY(p.proconfig))
    ORDER BY p.proname
  LOOP
    BEGIN
      -- Apply search_path setting
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public',
        r.schema_name,
        r.function_name,
        r.args
      );

      v_fixed_count := v_fixed_count + 1;
      v_fixed_functions := array_append(v_fixed_functions, r.function_name || '(' || r.args || ')');

    EXCEPTION WHEN OTHERS THEN
      -- Log errors but continue
      v_error_count := v_error_count + 1;
      v_error_functions := array_append(v_error_functions, r.function_name || ': ' || SQLERRM);
      RAISE NOTICE 'Failed to fix %: %', r.function_name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'REMEDIATION COMPLETE: Fixed: %, Errors: %', v_fixed_count, v_error_count;

  -- Log results to audit
  INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
  VALUES (
    'SECURITY_REMEDIATION_COMPLETE',
    'migrations',
    '20260111143607_8d971c64-ddcf-4223-8fd1-96ecfaffd668',
    jsonb_build_object(
      'fixed_count', v_fixed_count,
      'error_count', v_error_count,
      'fixed_functions', to_jsonb(v_fixed_functions[1:50]), -- First 50 for brevity
      'error_functions', to_jsonb(v_error_functions)
    ),
    jsonb_build_object('audit_type', 'ultrathink_forensic')
  );
END $$;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_total_security_definer int;
  v_with_search_path int;
  v_missing_search_path int;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig)),
    COUNT(*) FILTER (WHERE proconfig IS NULL OR NOT 'search_path=public' = ANY(proconfig))
  INTO v_total_security_definer, v_with_search_path, v_missing_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.prosecdef = true AND n.nspname = 'public';

  RAISE NOTICE 'POST-MIGRATION: Total SECURITY DEFINER: %, With search_path: %, Missing: %',
    v_total_security_definer, v_with_search_path, v_missing_search_path;

  -- Verify all are fixed
  IF v_missing_search_path > 0 THEN
    RAISE WARNING 'Some functions could not be fixed. Remaining: %', v_missing_search_path;
  ELSE
    RAISE NOTICE 'SUCCESS: All SECURITY DEFINER functions now have search_path = public';
  END IF;

  -- Log final state
  INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
  VALUES (
    'SECURITY_REMEDIATION_VERIFIED',
    'migrations',
    '20260111143607_8d971c64-ddcf-4223-8fd1-96ecfaffd668',
    jsonb_build_object(
      'total_security_definer', v_total_security_definer,
      'with_search_path', v_with_search_path,
      'remaining_missing', v_missing_search_path,
      'compliance_rate', round((v_with_search_path::numeric / NULLIF(v_total_security_definer, 0) * 100), 2)
    ),
    jsonb_build_object('audit_type', 'ultrathink_forensic', 'verification', 'post_migration')
  );
END $$;

-- ============================================================================
-- REFRESH SECURITY AUDIT VIEW
-- ============================================================================

-- Ensure the v_security_definer_audit view is up to date
CREATE OR REPLACE VIEW v_security_definer_audit AS
SELECT
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  CASE
    WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN true
    ELSE false
  END as has_search_path,
  p.proconfig as config,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

COMMENT ON VIEW v_security_definer_audit IS
'Audit view for monitoring SECURITY DEFINER function compliance.
Query: SELECT * FROM v_security_definer_audit WHERE NOT has_search_path;
Expected: 0 rows after remediation migration.
Updated: 2026-01-11 (Ultrathink Forensic Audit)';

-- ============================================================================
-- VERIFICATION QUERY (for manual execution)
-- ============================================================================
-- Run this query to verify all functions are compliant:
--
-- SELECT function_name, has_search_path
-- FROM v_security_definer_audit
-- WHERE NOT has_search_path;
--
-- Expected result: 0 rows
