-- Fix: Use 'system' instead of 'database_trigger' for edit_source
-- to comply with the check constraint
CREATE OR REPLACE FUNCTION public.audit_investor_fund_performance_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    edited_by,
    edited_at,
    edit_source
  ) VALUES (
    'investor_fund_performance',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now(),
    'system'  -- Changed from 'database_trigger' to match check constraint
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;