-- Fix log_audit_event: uses wrong column names for audit_log table
-- Actual columns: action, entity, entity_id, actor_user, old_values, new_values, meta
-- Bug: used action_type, table_name, record_id, actor_id, details (non-existent columns)
-- Impact: approve_and_complete_withdrawal fails because require_super_admin calls log_audit_event

-- Drop old versions first (they have incompatible defaults)
DROP FUNCTION IF EXISTS log_audit_event(text,text,uuid,text);
DROP FUNCTION IF EXISTS log_audit_event(text,text,text,jsonb,jsonb,jsonb);
DROP FUNCTION IF EXISTS fn_trg_log_audit_event();

-- Fix the 4-param overload (called by require_super_admin)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_details text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    meta
  )
  VALUES (
    p_action,
    p_table_name,
    p_record_id::text,
    auth.uid(),
    jsonb_build_object('details', p_details)
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Fix the 6-param overload
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity text,
  p_entity_id text,
  p_old_values jsonb,
  p_new_values jsonb,
  p_meta jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    old_values,
    new_values,
    meta
  )
  VALUES (
    p_action,
    p_entity,
    p_entity_id,
    auth.uid(),
    p_old_values,
    p_new_values,
    p_meta
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- Fix fn_trg_log_audit_event (generic trigger function, currently unused but fix anyway)
CREATE OR REPLACE FUNCTION public.fn_trg_log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    new_values,
    old_values
  )
  VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    auth.uid(),
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
