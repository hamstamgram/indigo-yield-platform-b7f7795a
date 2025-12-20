-- Create audit trigger function for investor_fund_performance
CREATE OR REPLACE FUNCTION public.audit_investor_fund_performance_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    COALESCE(NEW.id, OLD.id)::text,
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
$$;

-- Create trigger on investor_fund_performance table
DROP TRIGGER IF EXISTS audit_investor_fund_performance_trigger ON public.investor_fund_performance;

CREATE TRIGGER audit_investor_fund_performance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.investor_fund_performance
  FOR EACH ROW EXECUTE FUNCTION public.audit_investor_fund_performance_changes();