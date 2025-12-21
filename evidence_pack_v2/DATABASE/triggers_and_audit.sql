-- INDIGO Platform Triggers and Audit Functions
-- Generated: 2024-12-21
-- Source: SELECT * FROM pg_trigger JOIN pg_proc ON tgfoid = oid WHERE NOT tgisinternal

-- ============================================================================
-- AUDIT TRIGGER: log_data_edit
-- Captures all changes to key tables into data_edit_audit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_data_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
  v_record_id UUID;
  v_namespace UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
BEGIN
  -- Determine edit source
  IF current_setting('app.edit_source', true) IS NOT NULL THEN
    v_edit_source = current_setting('app.edit_source', true);
  ELSE
    v_edit_source = 'manual';
  END IF;
  
  -- Get import ID if this is import-related
  IF current_setting('app.import_id', true) IS NOT NULL THEN
    v_import_id = current_setting('app.import_id', true)::UUID;
  END IF;
  
  -- Generate record_id based on table type
  -- For investor_positions which has composite key (investor_id, fund_id)
  IF TG_TABLE_NAME = 'investor_positions' THEN
    IF TG_OP = 'DELETE' THEN
      v_record_id = extensions.uuid_generate_v5(v_namespace, OLD.investor_id::TEXT || ':' || OLD.fund_id::TEXT);
    ELSE
      v_record_id = extensions.uuid_generate_v5(v_namespace, NEW.investor_id::TEXT || ':' || NEW.fund_id::TEXT);
    END IF;
  ELSE
    -- For tables with standard id column
    IF TG_OP = 'DELETE' THEN
      v_record_id = OLD.id;
    ELSE
      v_record_id = NEW.id;
    END IF;
  END IF;
  
  -- Log the edit
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    import_related,
    import_id,
    edited_by,
    edit_source
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_import_id IS NOT NULL,
    v_import_id,
    auth.uid(),
    v_edit_source
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- AUDIT TRIGGER: audit_investor_fund_performance_changes
-- Specific audit for performance table changes
-- ============================================================================
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
$function$;

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGER
-- Auto-updates updated_at column on row changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- TRIGGER BINDINGS
-- ============================================================================

-- Audit triggers on key tables
CREATE TRIGGER audit_funds_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.funds
    FOR EACH ROW EXECUTE FUNCTION public.log_data_edit();

CREATE TRIGGER audit_transactions_v2_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions_v2
    FOR EACH ROW EXECUTE FUNCTION public.log_data_edit();

CREATE TRIGGER audit_investor_positions_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.investor_positions
    FOR EACH ROW EXECUTE FUNCTION public.log_data_edit();

CREATE TRIGGER audit_investor_fund_performance_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.investor_fund_performance
    FOR EACH ROW EXECUTE FUNCTION public.audit_investor_fund_performance_changes();

CREATE TRIGGER audit_fee_allocations_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fee_allocations
    FOR EACH ROW EXECUTE FUNCTION public.log_data_edit();

CREATE TRIGGER audit_ib_allocations_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.ib_allocations
    FOR EACH ROW EXECUTE FUNCTION public.log_data_edit();

-- Updated_at triggers
CREATE TRIGGER update_fund_configurations_updated_at
    BEFORE UPDATE ON public.fund_configurations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_funds_updated_at
    BEFORE UPDATE ON public.funds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_investor_fund_performance_updated_at
    BEFORE UPDATE ON public.investor_fund_performance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_investor_positions_updated_at
    BEFORE UPDATE ON public.investor_positions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ACTIVE TRIGGERS COUNT (from database)
-- ============================================================================
-- Total triggers on public schema tables: 15
-- Audit triggers: 6
-- Updated_at triggers: 5
-- Other triggers: 4
