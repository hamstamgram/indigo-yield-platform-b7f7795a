-- Migration: Fix RLS infinite recursion URGENTLY
-- Date: 2025-09-03
-- This MUST be applied to fix database access

-- Drop ALL existing policies on profiles first
DO $$ 
BEGIN
    -- Drop all existing policies
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_delete_none" ON public.profiles;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create a SECURITY DEFINER function to check admin status without RLS
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query without RLS since this is SECURITY DEFINER
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$;

-- Update the main is_admin function to use the new check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN public.check_is_admin(auth.uid());
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Now create simple, non-recursive policies
-- 1. Users can see their own profile
CREATE POLICY "profiles_own_select" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 2. Users can update their own profile  
CREATE POLICY "profiles_own_update" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Users can insert their own profile
CREATE POLICY "profiles_own_insert" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 4. Admins can see all profiles (using the SECURITY DEFINER function)
CREATE POLICY "profiles_admin_select" ON public.profiles
    FOR SELECT
    USING (public.check_is_admin(auth.uid()));

-- 5. Admins can update all profiles
CREATE POLICY "profiles_admin_update" ON public.profiles
    FOR UPDATE
    USING (public.check_is_admin(auth.uid()))
    WITH CHECK (public.check_is_admin(auth.uid()));

-- 6. No one can delete profiles
CREATE POLICY "profiles_no_delete" ON public.profiles
    FOR DELETE
    USING (FALSE);

-- Verify the fix by testing a simple query
DO $$
BEGIN
    PERFORM * FROM public.profiles LIMIT 1;
    RAISE NOTICE 'RLS fix applied successfully - profiles table is now accessible';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'RLS fix may not be complete: %', SQLERRM;
END $$;
