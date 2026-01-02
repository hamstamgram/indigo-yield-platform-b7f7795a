-- ================================================
-- FIX: Admin Status Functions - Use user_roles Table
-- This migration updates all functions that check admin status
-- to use the user_roles table instead of profiles.is_admin
-- ================================================

-- 1. Update get_user_admin_status to use user_roles table
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_roles.user_id = get_user_admin_status.user_id 
    AND role IN ('admin', 'super_admin')
  )
$$;

-- 2. Fix the has_role(text) function to check user_roles table
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = required_role
  )
$$;

-- 3. Fix is_admin_safe() function to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
$$;

-- 4. Create sync trigger to keep profiles.is_admin in sync with user_roles
-- This is a safety net for any legacy code that still reads profiles.is_admin
CREATE OR REPLACE FUNCTION public.sync_profile_is_admin()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  has_admin_role BOOLEAN;
BEGIN
  -- Determine which user_id to update
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.user_id;
  ELSE
    target_user_id := NEW.user_id;
  END IF;
  
  -- Check if user has admin or super_admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = target_user_id 
    AND role IN ('admin', 'super_admin')
  ) INTO has_admin_role;
  
  -- Update the profile
  UPDATE public.profiles 
  SET is_admin = has_admin_role 
  WHERE id = target_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_admin_status_on_role_change ON public.user_roles;

-- Create trigger to auto-sync on role changes
CREATE TRIGGER sync_admin_status_on_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_is_admin();

-- 5. One-time sync: Update all profiles.is_admin to match user_roles
UPDATE public.profiles p 
SET is_admin = EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = p.id 
  AND ur.role IN ('admin', 'super_admin')
);

-- 6. Add comment for documentation
COMMENT ON FUNCTION public.get_user_admin_status(UUID) IS 
'Returns TRUE if the user has admin or super_admin role in user_roles table. SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON FUNCTION public.has_role(text) IS 
'Returns TRUE if the current authenticated user has the specified role in user_roles table. SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON FUNCTION public.is_admin_safe() IS 
'Returns TRUE if the current authenticated user is an admin or super_admin. SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON TRIGGER sync_admin_status_on_role_change ON public.user_roles IS 
'Keeps profiles.is_admin in sync with user_roles for legacy code compatibility.';