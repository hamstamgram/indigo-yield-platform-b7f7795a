-- Grant EXECUTE permission on the admin functions to authenticated users
-- This ensures the getAllInvestorsWithSummary function works properly

GRANT EXECUTE ON FUNCTION public.get_all_investors_with_summary() TO authenticated;

-- Also grant execute permissions on other admin functions that may be needed
DO $$ 
BEGIN
    -- Check if functions exist before granting permissions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_dashboard_stats_v2') THEN
        GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_v2() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_investor_positions') THEN
        GRANT EXECUTE ON FUNCTION public.get_investor_positions(uuid) TO authenticated;
    END IF;
END $$;;
