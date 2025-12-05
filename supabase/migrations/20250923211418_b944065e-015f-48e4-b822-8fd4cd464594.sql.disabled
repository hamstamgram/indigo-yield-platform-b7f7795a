-- Fix admin function permissions - Second attempt
-- The previous migration may not have applied correctly due to function signature issues

-- First, check the actual function signatures and grant permissions correctly
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Grant execute on get_all_investors_with_summary with correct signature
    FOR func_record IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN ('get_all_investors_with_summary', 'get_all_investors_with_details')
    LOOP
        EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', 
                      func_record.proname, func_record.args);
        RAISE NOTICE 'Granted execute on function: %(%)', func_record.proname, func_record.args;
    END LOOP;
END $$;

-- Grant execute on specific admin functions we know exist
GRANT EXECUTE ON FUNCTION public.is_admin_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated;

-- Grant execute on user management functions
DO $$
BEGIN
    -- Try to grant on create_investor_profile with different signatures
    BEGIN
        GRANT EXECUTE ON FUNCTION public.create_investor_profile(text, text, text, text, boolean) TO authenticated;
    EXCEPTION WHEN undefined_function THEN
        -- Try without the boolean parameter
        BEGIN
            GRANT EXECUTE ON FUNCTION public.create_investor_profile(text, text, text, text) TO authenticated;
        EXCEPTION WHEN undefined_function THEN
            RAISE NOTICE 'create_investor_profile function not found with expected signatures';
        END;
    END;
    
    -- Try to grant on update_user_profile_secure
    BEGIN
        GRANT EXECUTE ON FUNCTION public.update_user_profile_secure(uuid, text, text, text, text) TO authenticated;
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'update_user_profile_secure function not found';
    END;
END $$;

-- Ensure the admin check functions work by recreating policies that depend on them
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (public.is_admin_secure());

-- Test that the admin functions are callable
DO $$
DECLARE
    test_result BOOLEAN;
BEGIN
    -- Test admin check function
    SELECT public.is_admin_secure() INTO test_result;
    RAISE NOTICE 'Admin check function test: %', CASE WHEN test_result IS NOT NULL THEN 'PASSED' ELSE 'FAILED' END;
    
    -- Test if get_all_investors_with_summary is now callable
    BEGIN
        PERFORM public.get_all_investors_with_summary();
        RAISE NOTICE 'get_all_investors_with_summary function test: PASSED';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'get_all_investors_with_summary function test: FAILED - %', SQLERRM;
    END;
END $$;