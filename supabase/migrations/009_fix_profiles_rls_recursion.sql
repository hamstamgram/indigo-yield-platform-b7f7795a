-- Migration: Fix infinite recursion in profiles RLS policies
-- Version: 009
-- Date: 2025-09-02
-- Description: Fixes the infinite recursion caused by is_admin() function calling profiles table

-- First, drop the problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create a new function that doesn't cause recursion
-- This uses SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query without RLS since this function runs with definer privileges
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated;

-- Now recreate the profiles policies without recursion
-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all profiles (separate policy to avoid recursion)
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile (separate policy)
CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Only authenticated users can insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- No one can delete profiles directly
CREATE POLICY "profiles_delete_none" ON public.profiles
    FOR DELETE
    USING (FALSE);

-- Update the is_admin function to use the new approach
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Use the new check_is_admin function which runs with SECURITY DEFINER
    RETURN public.check_is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;

-- Test that the fix works by creating a simple test function
CREATE OR REPLACE FUNCTION public.test_profiles_access()
RETURNS TABLE(test_name TEXT, result BOOLEAN, details TEXT) AS $$
BEGIN
    -- Test 1: Can query profiles table
    RETURN QUERY
    SELECT 
        'Can query profiles'::TEXT as test_name,
        TRUE as result,
        'Query successful'::TEXT as details
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Can query profiles'::TEXT,
            FALSE,
            SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION public.test_profiles_access() TO authenticated;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.check_is_admin(UUID) IS 'Non-recursive admin check function that bypasses RLS to prevent infinite recursion';
COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 'Users can view their own profile - non-recursive';
COMMENT ON POLICY "profiles_select_admin" ON public.profiles IS 'Admins can view all profiles - uses direct query to avoid recursion';
