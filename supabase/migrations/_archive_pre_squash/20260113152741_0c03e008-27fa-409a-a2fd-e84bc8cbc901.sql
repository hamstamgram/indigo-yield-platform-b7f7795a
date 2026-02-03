-- Fix log_security_event to use correct audit_log column names
-- Issue: Function was using non-existent columns (table_name, operation, user_id, new_data)
-- Fix: Use correct columns (entity, action, actor_user, new_values)

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text, 
  p_severity text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    entity,
    action,
    actor_user,
    new_values,
    meta,
    created_at
  ) VALUES (
    'security_events',
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    jsonb_build_object(
      'severity', p_severity,
      'details', p_details,
      'timestamp', now()
    ),
    jsonb_build_object('source', 'log_security_event'),
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, jsonb) TO authenticated;