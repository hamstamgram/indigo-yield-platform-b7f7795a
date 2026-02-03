-- Fix the audit_events_v view to use security_invoker
DROP VIEW IF EXISTS public.audit_events_v;

CREATE VIEW public.audit_events_v 
WITH (security_invoker = on)
AS
SELECT 
    id AS event_id,
    actor_user AS user_id,
    old_values,
    new_values,
    meta,
    created_at,
    actor_user,
    entity AS source_table,
    action AS operation,
    entity,
    entity_id
FROM audit_log;