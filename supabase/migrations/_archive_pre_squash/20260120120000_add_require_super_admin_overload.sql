-- Add missing require_super_admin() overload that returns admin UUID
-- This is needed by start_processing_withdrawal and complete_withdrawal functions

CREATE OR REPLACE FUNCTION public.require_super_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
/*
 * Validates that the current user is a super_admin and returns their user ID.
 * Used for operations that require super_admin privileges.
 *
 * Returns: The user's UUID if they are a super_admin
 * Raises: Exception if user is not a super_admin
 */
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  -- Get current user ID from auth.uid()
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: No authenticated user found';
  END IF;

  -- Get user's role from profiles
  SELECT role INTO v_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: No profile found for user';
  END IF;

  -- Check for super_admin role
  IF v_role != 'super_admin' THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED: This operation requires super_admin privileges';
  END IF;

  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.require_super_admin() IS
'Validates super_admin role and returns user UUID. Throws exception if not super_admin.';

-- Grant execute to authenticated users (function does its own role check)
GRANT EXECUTE ON FUNCTION public.require_super_admin() TO authenticated;
