-- Sovereign Type-Safe & Logic Finalization: Add explicit UUID cast to cascade_void_to_yield_events
-- This ensures consistent type-safety across all trigger functions

CREATE OR REPLACE FUNCTION public.cascade_void_to_yield_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a yield distribution is voided, mark related audit entries
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Mark data_edit_audit entries for this distribution as voided_record
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid  -- EXPLICIT: Consistent with other triggers
      AND table_name = 'yield_distributions';
    
    -- Mark yield_edit_audit entries as voided
    UPDATE yield_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid  -- EXPLICIT: Consistent UUID casting
      AND table_name = 'yield_distributions';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment documenting the type-safety requirement
COMMENT ON FUNCTION public.cascade_void_to_yield_events() IS 
'Cascades void status to audit records. Uses explicit ::uuid casts for type-safety (2026-01-10).';
