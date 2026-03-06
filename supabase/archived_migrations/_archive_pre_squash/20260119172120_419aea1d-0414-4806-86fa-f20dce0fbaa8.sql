-- ============================================================================
-- P2-04: Admin Utility Function Cleanup
-- Drops unused admin_fix_* functions and adds documentation to retained functions
-- ============================================================================

-- ===========================================================================
-- PART 1: Drop Unused Admin Fix Functions
-- These functions exist but are never called from the frontend
-- ===========================================================================

DROP FUNCTION IF EXISTS public.admin_fix_opening_aum(uuid, numeric);
DROP FUNCTION IF EXISTS public.admin_fix_position(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_set_distribution_status(uuid, text);

-- ===========================================================================
-- PART 2: Document Retained Admin Utility Functions
-- Using DO blocks to handle potential function overloading
-- ===========================================================================

-- Auth check functions (is_admin variants)
DO $$ BEGIN
  COMMENT ON FUNCTION public.is_admin() IS 
    'PRIMARY ADMIN CHECK: Returns true if current user has admin or super_admin role. '
    'Used in RLS policies and trigger functions. Checks user_roles table first, '
    'falls back to profiles.is_admin flag for legacy support.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.is_admin_safe() IS 
    'SECURITY DEFINER VARIANT: Safe version of is_admin() for use in views and triggers. '
    'Bypasses RLS to check admin status. Required for SECURITY DEFINER views that need '
    'admin filtering.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.is_admin_for_jwt() IS 
    'JWT-BASED ADMIN CHECK: Checks admin status from JWT claims. '
    'Used by edge functions where auth context comes from JWT token rather than '
    'database session. Returns boolean.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Super admin check functions
DO $$ BEGIN
  COMMENT ON FUNCTION public.is_super_admin() IS 
    'PRIMARY SUPER ADMIN CHECK: Returns true only if current user has super_admin role. '
    'Required for sensitive operations: unlock periods, void yields, reset data, '
    'manage admin roles.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.has_super_admin_role(uuid) IS 
    'SUPER ADMIN CHECK FOR SPECIFIC USER: Checks if given user_id has super_admin role. '
    'Used in admin management UI to show role status of other users.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Check functions for specific users
DO $$ BEGIN
  COMMENT ON FUNCTION public.check_is_admin(uuid) IS 
    'ADMIN CHECK FOR SPECIFIC USER: Checks if given user_id has admin or super_admin role. '
    'Used in admin management UI. Returns boolean.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.get_user_admin_status(uuid) IS 
    'ADMIN STATUS FOR USER: Alternative signature for checking admin status of specific user. '
    'Returns boolean indicating admin or super_admin role membership.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Guard functions (raise exception if not authorized)
DO $$ BEGIN
  COMMENT ON FUNCTION public.ensure_admin() IS 
    'ADMIN GUARD: Raises exception if current user is not admin. '
    'Call at start of admin-only RPC functions. Pattern: IF NOT ensure_admin() THEN ... '
    'Returns void, raises EXCEPTION on failure.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.require_super_admin(text) IS 
    'SUPER ADMIN GUARD: Raises exception with operation name if not super admin. '
    'Parameter is operation name for audit logging. Pattern: PERFORM require_super_admin(''unlock_period'')';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Role management functions
DO $$ BEGIN
  COMMENT ON FUNCTION public.has_role(text) IS 
    'GENERIC ROLE CHECK: Returns true if current user has specified role. '
    'Used for fine-grained RBAC checks beyond admin/super_admin. '
    'Example: has_role(''ib_manager'')';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.current_user_is_admin_or_owner(uuid) IS 
    'COMBINED OWNER/ADMIN CHECK: Returns true if current user is admin OR matches given user_id. '
    'Used in RLS policies where record owner or admin can access. '
    'Pattern: WHERE current_user_is_admin_or_owner(investor_id)';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Admin invite functions
DO $$ BEGIN
  COMMENT ON FUNCTION public.create_admin_invite(text, text) IS 
    'CREATE ADMIN INVITE: Creates invite code for new admin. '
    'Parameters: email (text), role (text = admin|super_admin). '
    'Returns invite code. Invite expires after 7 days.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.validate_invite_code(text) IS 
    'VALIDATE INVITE: Checks if invite code exists, is unused, and not expired. '
    'Returns intended_role if valid, NULL if invalid or expired.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.use_invite_code(text, uuid) IS 
    'CONSUME INVITE: Marks invite as used and assigns role to user. '
    'Called during admin signup flow. Returns boolean success.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Role update functions
DO $$ BEGIN
  COMMENT ON FUNCTION public.update_admin_role(uuid, text) IS 
    'UPDATE ADMIN ROLE: Changes user role (admin <-> super_admin). '
    'Requires super_admin permission. Logs change to audit_log.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

-- Utility functions
DO $$ BEGIN
  COMMENT ON FUNCTION public.get_admin_name(uuid) IS 
    'GET ADMIN DISPLAY NAME: Returns full_name or email for given admin user_id. '
    'Used in audit logs and admin activity displays.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.sync_profile_is_admin() IS 
    'TRIGGER FUNCTION: Syncs profiles.is_admin flag when user_roles changes. '
    'Maintains legacy is_admin column for backward compatibility with RLS policies.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON FUNCTION public.assign_admin_role_from_invite() IS 
    'INTERNAL: Assigns admin role from invite during signup. '
    'Called by trigger on profiles insert when invite_code is present in meta.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;