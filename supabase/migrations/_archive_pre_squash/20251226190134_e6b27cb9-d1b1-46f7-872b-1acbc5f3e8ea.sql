-- ============================================================================
-- Compatibility VIEW: withdrawal_audit_log → withdrawal_audit_logs
-- ============================================================================
-- Purpose: Provide defense-in-depth safeguard against legacy code that might
--          reference the singular table name "withdrawal_audit_log"
-- 
-- This VIEW aliases the singular name to the canonical plural table name,
-- ensuring any legacy references will still work without throwing errors.
-- ============================================================================

-- Create compatibility VIEW (if it doesn't already exist)
CREATE OR REPLACE VIEW public.withdrawal_audit_log AS
SELECT 
  id,
  request_id,
  action,
  actor_id,
  details,
  created_at
FROM public.withdrawal_audit_logs;

-- Add comment for documentation
COMMENT ON VIEW public.withdrawal_audit_log IS 
  'Compatibility view aliasing singular name to canonical plural table withdrawal_audit_logs. Prevents errors from legacy code references.';