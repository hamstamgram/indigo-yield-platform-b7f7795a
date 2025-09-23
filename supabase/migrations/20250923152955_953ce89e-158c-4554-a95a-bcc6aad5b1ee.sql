-- Grant proper permissions for the new functions
GRANT EXECUTE ON FUNCTION public.get_all_investors_with_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_non_admin_profiles() TO authenticated;

-- Also ensure the functions have proper RLS bypass
ALTER FUNCTION public.get_all_investors_with_summary() OWNER TO postgres;
ALTER FUNCTION public.get_all_non_admin_profiles() OWNER TO postgres;