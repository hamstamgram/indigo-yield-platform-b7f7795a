-- Update functions with correct admin check and execute migration
-- Create wrapper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin_secure()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query to avoid RLS recursion
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(admin_status, FALSE);
END;
$function$;

-- Execute the migration now
SELECT public.migrate_legacy_positions();
SELECT public.generate_historical_statements();
SELECT public.populate_yield_sources();