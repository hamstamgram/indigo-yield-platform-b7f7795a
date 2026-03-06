-- Create compatibility view for withdrawal_audit_log (singular)
-- This provides backwards compatibility for code using the singular name

CREATE OR REPLACE VIEW public.withdrawal_audit_log 
WITH (security_invoker = true)
AS
SELECT 
  id,
  request_id,
  action,
  actor_id,
  details,
  created_at
FROM public.withdrawal_audit_logs;

COMMENT ON VIEW public.withdrawal_audit_log IS 
  'Compatibility view aliasing singular name to canonical plural table withdrawal_audit_logs.';