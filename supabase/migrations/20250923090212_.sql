-- Fix RLS permissions for admin functions
-- Grant execute permissions on admin RPC functions

-- Ensure get_all_investors_with_summary function has proper permissions
GRANT EXECUTE ON FUNCTION public.get_all_investors_with_summary() TO authenticated;

-- Ensure get_all_investors_with_details function has proper permissions  
GRANT EXECUTE ON FUNCTION public.get_all_investors_with_details() TO authenticated;

-- Ensure other admin functions have proper permissions
GRANT EXECUTE ON FUNCTION public.create_investor_profile(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_secure(uuid, text, text, text, text) TO authenticated;

-- Fix profiles table policies to ensure admins can read all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    USING (public.is_admin_secure());

-- Ensure investors table has proper admin access
DROP POLICY IF EXISTS "Admins can view all investors v2" ON public.investors;
CREATE POLICY "Admins can view all investors v2" ON public.investors
    FOR SELECT  
    USING (public.is_admin_secure());

DROP POLICY IF EXISTS "Admins can manage all investors v2" ON public.investors;
CREATE POLICY "Admins can manage all investors v2" ON public.investors
    FOR ALL
    USING (public.is_admin_secure())
    WITH CHECK (public.is_admin_secure());;
