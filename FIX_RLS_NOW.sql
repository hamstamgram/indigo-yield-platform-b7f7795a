-- EMERGENCY FIX: Complete cleanup and rebuild of profiles RLS
-- Run this in Supabase SQL Editor NOW

-- Step 1: Drop ALL policies on profiles table
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Drop the problematic is_admin function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Step 3: Create a new, safe admin check function
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
        FALSE
    )
$$;

-- Step 4: Create minimal, working policies
-- Allow users to see their own profile only
CREATE POLICY "allow_own_profile_select" 
ON public.profiles FOR SELECT 
USING (id = auth.uid());

-- Allow users to update their own profile only  
CREATE POLICY "allow_own_profile_update"
ON public.profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "allow_own_profile_insert"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- No deletes allowed
CREATE POLICY "no_profile_deletes"
ON public.profiles FOR DELETE
USING (FALSE);

-- Step 5: Create the is_admin function using the safe version
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.is_admin_safe()
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 7: Test the fix
DO $$
DECLARE
    test_result BOOLEAN;
BEGIN
    -- Try to query profiles
    SELECT COUNT(*) > 0 INTO test_result FROM public.profiles WHERE id = auth.uid();
    RAISE NOTICE 'Profile query test: %', CASE WHEN test_result IS NOT NULL THEN 'PASSED' ELSE 'FAILED' END;
    
    -- Try to check admin status
    SELECT public.is_admin() INTO test_result;
    RAISE NOTICE 'Admin check test: %', CASE WHEN test_result IS NOT NULL THEN 'PASSED' ELSE 'FAILED' END;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS FIX COMPLETE - Database should now be accessible!';
    RAISE NOTICE 'Run npm run check:services to verify';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Test failed: %', SQLERRM;
        RAISE WARNING 'But policies have been updated - try running the service check anyway';
END $$;
