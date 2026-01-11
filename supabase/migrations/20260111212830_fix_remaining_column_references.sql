-- Fix remaining column reference mismatches
-- Date: 2026-01-11
-- Issues found by comprehensive column audit:
--
-- 1. cascade_void_to_yield_events: references NEW.is_voided (column doesn't exist)
--    Fix: Use NEW.voided_at IS NOT NULL instead
--
-- 2. protect_audit_immutable_fields: references edited_by (column doesn't exist)
--    Fix: Remove edited_by check, only check created_at

-- ============================================================================
-- FIX 1: cascade_void_to_yield_events
-- ============================================================================
-- yield_distributions uses voided_at (timestamp) not is_voided (boolean)

CREATE OR REPLACE FUNCTION public.cascade_void_to_yield_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- When a yield distribution is voided, mark related audit entries
  -- FIXED: Use voided_at IS NOT NULL instead of is_voided = true
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    -- Mark data_edit_audit entries for this distribution as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'yield_distributions';

    -- Mark yield_edit_audit entries as voided
    UPDATE yield_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'yield_distributions';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION cascade_void_to_yield_events() IS
'Cascades void status to audit entries when yield_distribution is voided.
Fixed 2026-01-11: Use voided_at IS NOT NULL instead of non-existent is_voided column';

-- ============================================================================
-- FIX 2: protect_audit_immutable_fields
-- ============================================================================
-- Remove edited_by check since column doesn't exist on yield_distributions

CREATE OR REPLACE FUNCTION public.protect_audit_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Protect immutable audit fields
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_at';
  END IF;

  -- FIXED: Removed edited_by check - column doesn't exist on yield_distributions
  -- The created_by field is the relevant audit field for this table
  IF OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'Cannot modify immutable field: created_by';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION protect_audit_immutable_fields() IS
'Prevents modification of immutable audit fields (created_at, created_by).
Fixed 2026-01-11: Removed non-existent edited_by column reference';

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
VALUES (
  'FIX_COLUMN_REFS_PHASE2',
  'migrations',
  '20260111212830_fix_remaining_column_references',
  jsonb_build_object(
    'fixed_functions', ARRAY[
      'cascade_void_to_yield_events: is_voided -> voided_at IS NOT NULL',
      'protect_audit_immutable_fields: removed edited_by reference'
    ],
    'audit_source', 'Complete Column Reference Audit'
  ),
  jsonb_build_object('phase', 2)
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_problem_count int;
BEGIN
  -- Check that no more references to non-existent columns in these functions
  SELECT COUNT(*) INTO v_problem_count
  FROM pg_proc
  WHERE proname IN ('cascade_void_to_yield_events', 'protect_audit_immutable_fields')
  AND pronamespace = 'public'::regnamespace
  AND (
    prosrc ILIKE '%is_voided%' OR
    prosrc ILIKE '%edited_by%'
  );

  IF v_problem_count > 0 THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Still have % functions with bad column refs', v_problem_count;
  END IF;

  RAISE NOTICE 'VERIFICATION PASSED: All column references fixed';
END $$;
