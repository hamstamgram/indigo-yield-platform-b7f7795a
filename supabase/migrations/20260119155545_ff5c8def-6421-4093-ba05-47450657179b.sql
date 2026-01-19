-- ============================================================
-- P1-01: Consolidate Integrity Checks
-- Drop legacy RPC functions and storage tables, keeping canonical implementations
-- ============================================================

-- ============ Phase 1: Drop Legacy RPC Functions ============

-- Drop check_system_integrity() - legacy, no params
DROP FUNCTION IF EXISTS public.check_system_integrity();

-- Drop run_data_integrity_check() - legacy, no params
DROP FUNCTION IF EXISTS public.run_data_integrity_check();

-- Drop run_integrity_monitoring() - legacy, no params
DROP FUNCTION IF EXISTS public.run_integrity_monitoring();

-- ============ Phase 2: Drop Unused Storage Tables ============

-- Drop system_health_snapshots (data already in admin_integrity_runs, 0 rows)
DROP TABLE IF EXISTS public.system_health_snapshots CASCADE;

-- Drop integrity_check_log (21 rows, but orphaned with no references)
DROP TABLE IF EXISTS public.integrity_check_log CASCADE;

-- Drop integrity_monitoring_log (0 rows, unused)
DROP TABLE IF EXISTS public.integrity_monitoring_log CASCADE;

-- ============ Phase 3: Add Comments for Documentation ============

COMMENT ON FUNCTION public.run_integrity_check(uuid, uuid) IS
'CANONICAL: Scoped integrity check function. Runs checks optionally filtered by fund_id and/or investor_id.
Returns jsonb with check results. Logs to admin_integrity_runs table.
Called by integrity-monitor edge function.';

COMMENT ON FUNCTION public.assert_integrity_or_raise(uuid, uuid, text) IS
'Integrity gating function for write operations. Raises exception if critical integrity issues exist.
Called before sensitive financial operations.';

COMMENT ON TABLE public.admin_integrity_runs IS
'CANONICAL: Stores all integrity check run results with violations, runtime, and triggered_by context.
Used by integrity-monitor edge function and admin dashboard.';