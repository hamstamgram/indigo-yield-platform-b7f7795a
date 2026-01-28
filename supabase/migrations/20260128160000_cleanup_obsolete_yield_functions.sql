-- =============================================================================
-- Migration: Cleanup Obsolete Yield Function Versions
-- =============================================================================
-- 
-- Purpose: Drop superseded yield functions that are no longer used in codebase.
-- The _v3 versions have improved IB commission calculation (from GROSS, not fee),
-- better conservation checks, and zero yield support.
--
-- Dropped:
--   - apply_adb_yield_distribution (base) - 8 params
--   - apply_adb_yield_distribution_v2 - 6 params  
--   - preview_adb_yield_distribution_v2 - 4 params
--
-- Kept:
--   - apply_adb_yield_distribution_v3 (canonical)
--   - preview_adb_yield_distribution_v3 (canonical)
-- =============================================================================

-- 1. Drop obsolete apply function (base version with 8 params)
DROP FUNCTION IF EXISTS public.apply_adb_yield_distribution(
  p_fund_id uuid, 
  p_period_start date, 
  p_period_end date, 
  p_gross_yield_amount numeric, 
  p_admin_id uuid, 
  p_purpose text, 
  p_dust_tolerance numeric, 
  p_recorded_aum numeric
);

-- 2. Drop obsolete apply function (_v2 with 6 params)
DROP FUNCTION IF EXISTS public.apply_adb_yield_distribution_v2(
  p_fund_id uuid, 
  p_period_start date, 
  p_period_end date, 
  p_gross_yield_amount numeric, 
  p_admin_id uuid, 
  p_purpose aum_purpose
);

-- 3. Drop obsolete preview function (_v2 with 4 params)
DROP FUNCTION IF EXISTS public.preview_adb_yield_distribution_v2(
  p_fund_id uuid, 
  p_period_start date, 
  p_period_end date, 
  p_gross_yield_amount numeric
);

-- Log the cleanup (correct schema: action, entity, meta)
INSERT INTO audit_log (action, entity, meta, created_at)
VALUES (
  'FUNCTION_CLEANUP',
  'database',
  jsonb_build_object(
    'dropped', jsonb_build_array(
      'apply_adb_yield_distribution (base, 8 params)',
      'apply_adb_yield_distribution_v2 (6 params)',
      'preview_adb_yield_distribution_v2 (4 params)'
    ),
    'kept', jsonb_build_array(
      'apply_adb_yield_distribution_v3',
      'preview_adb_yield_distribution_v3'
    ),
    'reason', 'Superseded by _v3 versions with correct IB calculation'
  ),
  NOW()
);

-- Verify only _v3 versions remain
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname LIKE '%adb_yield_distribution%'
    AND p.proname NOT LIKE '%_v3';
  
  IF v_count > 0 THEN
    RAISE WARNING 'Found % non-v3 adb_yield_distribution functions remaining', v_count;
  ELSE
    RAISE NOTICE 'Cleanup complete: Only _v3 versions remain';
  END IF;
END $$;
