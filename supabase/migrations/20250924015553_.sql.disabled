-- Fix security definer view issue
-- Replace the view with a proper function that respects RLS

-- Drop the problematic view
DROP VIEW IF EXISTS legacy_migration_status;

-- Create a secure function instead that respects RLS
CREATE OR REPLACE FUNCTION public.get_legacy_migration_status()
RETURNS TABLE(
    table_name TEXT,
    migration_status TEXT,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    migration_notes TEXT,
    record_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    -- Only allow admins to view migration status
    IF NOT is_admin_v2() THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        lsm.table_name,
        lsm.migration_status,
        lsm.deprecated_at,
        lsm.migration_notes,
        CASE 
            WHEN lsm.table_name = 'positions' THEN (SELECT COUNT(*) FROM public.positions)
            WHEN lsm.table_name = 'yield_sources' THEN (SELECT COUNT(*) FROM public.yield_sources)
            ELSE 0 
        END as record_count
    FROM public.legacy_system_migration lsm
    ORDER BY lsm.deprecated_at DESC;
END;
$$;;
