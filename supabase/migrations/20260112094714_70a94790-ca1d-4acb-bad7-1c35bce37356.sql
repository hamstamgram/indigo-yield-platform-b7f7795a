-- Fix security definer views by setting security_invoker
-- This ensures queries use the calling user's permissions rather than the view creator's

ALTER VIEW v_duplicate_transactions SET (security_invoker = true);
ALTER VIEW v_orphaned_positions SET (security_invoker = true);
ALTER VIEW v_security_definer_audit SET (security_invoker = true);
ALTER VIEW v_yield_conservation_check SET (security_invoker = true);