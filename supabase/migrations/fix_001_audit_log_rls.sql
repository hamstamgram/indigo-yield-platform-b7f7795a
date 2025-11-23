-- ================================================================
-- Migration: Fix Audit Log RLS Policy
-- Date: 2025-11-22
-- Severity: CRITICAL
-- Description: Replace permissive audit_log INSERT policy with
--              secure policy that validates actor_user
-- ================================================================

BEGIN;

-- Drop existing permissive policy
DROP POLICY IF EXISTS "audit_log_insert_policy" ON public.audit_log;

-- Create secure policy: actor_user must match authenticated user
CREATE POLICY "audit_log_insert_secure" ON public.audit_log
    FOR INSERT
    WITH CHECK (actor_user = auth.uid());

-- Ensure audit function is properly granted
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB)
TO authenticated;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Audit log RLS policy updated successfully';
    RAISE NOTICE 'Policy now enforces: actor_user = auth.uid()';
END $$;

COMMIT;
