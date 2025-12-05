-- Clean up legacy migration and Excel import functionality

-- Drop database functions
DROP FUNCTION IF EXISTS public.get_legacy_migration_status();
DROP FUNCTION IF EXISTS public.process_excel_import_with_classes(p_data jsonb, p_import_type text);
DROP FUNCTION IF EXISTS public.lock_imports(p_reason text);
DROP FUNCTION IF EXISTS public.unlock_imports();
DROP FUNCTION IF EXISTS public.is_import_enabled();

-- Drop database tables
DROP TABLE IF EXISTS public.excel_import_log CASCADE;
DROP TABLE IF EXISTS public.import_locks CASCADE;
DROP TABLE IF EXISTS public.import_status CASCADE;
DROP TABLE IF EXISTS public.legacy_system_migration CASCADE;

-- Remove system configuration entries for Excel imports
DELETE FROM public.system_config WHERE key IN ('excel_import_enabled', 'edit_window_days');

-- Clean up any audit log entries related to these features (optional)
DELETE FROM public.audit_log WHERE entity IN ('excel_import', 'import_lock', 'legacy_migration');;
