-- ==========================================
-- AUDIT FIX: RLS Policy + Admin Check Migration
-- 1. Add investor_emails owner access policy
-- 2. Migrate check_is_admin() to only use user_roles table (in-place update)
-- ==========================================

-- ==========================================
-- TASK 1: Add investor_emails owner access policy
-- Allows investors to view their own email addresses
-- ==========================================
CREATE POLICY "investor_emails_select_own" ON public.investor_emails
FOR SELECT USING (investor_id = auth.uid());

-- ==========================================
-- TASK 2: Update check_is_admin() in-place to only use user_roles table
-- Using CREATE OR REPLACE to preserve dependent policies
-- SECURITY: This is now the authoritative source for admin status
-- ==========================================

CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = check_is_admin.user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- Update is_admin() to use the updated check_is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_is_admin(auth.uid())
$$;

-- ==========================================
-- AUDIT LOG
-- ==========================================
INSERT INTO audit_log (action, entity, actor_user, meta)
VALUES (
  'ADMIN_CHECK_MIGRATION',
  'security',
  auth.uid(),
  jsonb_build_object(
    'changes', ARRAY[
      'Added investor_emails_select_own RLS policy',
      'Migrated check_is_admin() to use only user_roles table',
      'Migrated is_admin() to use only user_roles table',
      'Removed dependency on profiles.is_admin column'
    ],
    'timestamp', NOW()
  )
);