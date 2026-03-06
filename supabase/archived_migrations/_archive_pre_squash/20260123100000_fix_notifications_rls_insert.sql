-- Migration: Fix notifications table INSERT RLS policy
-- Created: 2026-01-23
--
-- Problem: Admin users get "new row violates row-level security policy" when trying
-- to insert notifications for investors (e.g., after deposit approval, withdrawal processing).
-- The is_admin() check within RLS context may fail due to nested RLS evaluation.
--
-- Fix: Use a SECURITY DEFINER helper function that directly checks admin status,
-- bypassing any potential RLS recursion on the profiles table.

-- Create a robust admin check specifically for notification inserts
CREATE OR REPLACE FUNCTION public.can_insert_notification()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    FALSE
  )
  OR
  COALESCE(
    (SELECT EXISTS(
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )),
    FALSE
  )
$$;

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;

-- Create new INSERT policy using the SECURITY DEFINER function
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT
    WITH CHECK (public.can_insert_notification());

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.can_insert_notification() TO authenticated;

COMMENT ON FUNCTION public.can_insert_notification() IS
'SECURITY DEFINER check for notification inserts. Checks both profiles.is_admin and user_roles table to avoid RLS recursion.';
