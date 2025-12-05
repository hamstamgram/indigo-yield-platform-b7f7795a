-- Fix permissions for admin functions that actually exist
-- Grant EXECUTE permission on existing admin functions to authenticated users

-- Check and grant permissions on functions that exist
DO $$ 
BEGIN
    -- Grant permissions on functions that definitely exist based on the function list
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_investors_with_summary') THEN
        GRANT EXECUTE ON FUNCTION public.get_all_investors_with_summary() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_all_investors_with_details') THEN
        GRANT EXECUTE ON FUNCTION public.get_all_investors_with_details() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_investor_profile') THEN
        GRANT EXECUTE ON FUNCTION public.create_investor_profile(text, text, text, text, boolean) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_statement_data') THEN
        GRANT EXECUTE ON FUNCTION public.generate_statement_data(uuid, integer, integer) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'approve_withdrawal') THEN
        GRANT EXECUTE ON FUNCTION public.approve_withdrawal(uuid, numeric, text) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reject_withdrawal') THEN
        GRANT EXECUTE ON FUNCTION public.reject_withdrawal(uuid, text, text) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'start_processing_withdrawal') THEN
        GRANT EXECUTE ON FUNCTION public.start_processing_withdrawal(uuid, numeric, text, date, text) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'complete_withdrawal') THEN
        GRANT EXECUTE ON FUNCTION public.complete_withdrawal(uuid, text, text) TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cancel_withdrawal_by_admin') THEN
        GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin(uuid, text, text) TO authenticated;
    END IF;
    
    -- Admin verification functions
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_secure') THEN
        GRANT EXECUTE ON FUNCTION public.is_admin_secure() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_v2') THEN
        GRANT EXECUTE ON FUNCTION public.is_admin_v2() TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_is_admin') THEN
        GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated;
    END IF;
END $$;