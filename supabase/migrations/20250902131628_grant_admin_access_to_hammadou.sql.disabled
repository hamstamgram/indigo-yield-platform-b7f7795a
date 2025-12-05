-- Migration: Grant admin access to hammadou@indigo.fund
-- Version: 009
-- Date: 2025-09-02
-- Description: Grants admin privileges to user with email hammadou@indigo.fund

-- Grant admin access to hammadou@indigo.fund
UPDATE public.profiles 
SET is_admin = TRUE, updated_at = NOW()
WHERE email = 'hammadou@indigo.fund' AND is_admin = FALSE;
-- Log this action in the audit log
INSERT INTO public.audit_log (action, entity, entity_id, new_values, meta)
SELECT 
  'GRANT_ADMIN_ACCESS',
  'profiles',
  p.id::TEXT,
  jsonb_build_object('is_admin', true),
  jsonb_build_object('email', p.email, 'granted_by', 'system_migration', 'migration_version', '009')
FROM public.profiles p 
WHERE p.email = 'hammadou@indigo.fund';
-- Ensure we updated exactly one row (the user should exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'hammadou@indigo.fund' AND is_admin = TRUE) THEN
    RAISE EXCEPTION 'User with email hammadou@indigo.fund not found or admin access not granted';
  END IF;
END $$;
