-- Fix: audit_investor_fund_performance_changes was casting UUID to text 
-- but record_id column is UUID type
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
    COALESCE(NEW.id, OLD.id),  -- Remove ::text cast - record_id is UUID
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now(),
    'database_trigger'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;