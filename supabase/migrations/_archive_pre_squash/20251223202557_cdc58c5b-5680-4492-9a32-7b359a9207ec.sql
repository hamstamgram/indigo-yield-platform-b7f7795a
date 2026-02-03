-- =====================================================
-- CODEBASE CLEANUP MIGRATION
-- Date: 2025-12-23
-- Purpose: Mark deprecated tables and drop confirmed unused tables
-- =====================================================

-- PHASE 1: Mark tables with frontend references as DEPRECATED
-- These have code references but are empty - deprecate first, remove code later
COMMENT ON TABLE public.yield_settings IS '@deprecated 2025-12-23 - Empty, referenced in investorDataService.ts. Remove after code cleanup.';
COMMENT ON TABLE public.portfolio_history IS '@deprecated 2025-12-23 - Empty, referenced in investorDataService.ts. Remove after code cleanup.';
COMMENT ON TABLE public.report_definitions IS '@deprecated 2025-12-23 - Empty, referenced in reportsApi.ts. Remove after code cleanup.';
COMMENT ON TABLE public.email_logs IS '@deprecated 2025-12-23 - Empty, referenced in AdminEmailTrackingPage.tsx. Remove after code cleanup.';

-- PHASE 2: Drop tables with ZERO frontend references and ZERO data
-- Verified: No imports, no RPC calls, no triggers, no foreign keys

-- Drop reconciliation table (0 rows, no references)
DROP TABLE IF EXISTS public.reconciliation CASCADE;

-- Drop transaction_mutations table (0 rows, no references)
DROP TABLE IF EXISTS public.transaction_mutations CASCADE;

-- Drop investor_month_snapshots table (0 rows, no references)
DROP TABLE IF EXISTS public.investor_month_snapshots CASCADE;

-- Drop report_runs table (0 rows, no references)
DROP TABLE IF EXISTS public.report_runs CASCADE;

-- Drop statement_metadata table (0 rows, no references)
DROP TABLE IF EXISTS public.statement_metadata CASCADE;

-- Drop user_access_logs_enhanced table (0 rows, no references)
DROP TABLE IF EXISTS public.user_access_logs_enhanced CASCADE;

-- Drop investments table (0 rows, no references - replaced by investor_positions)
DROP TABLE IF EXISTS public.investments CASCADE;

-- PHASE 3: Log the cleanup action
INSERT INTO public.audit_log (entity, action, new_values, actor_user)
VALUES (
  'schema_cleanup',
  'DROP_UNUSED_TABLES',
  jsonb_build_object(
    'dropped_tables', ARRAY[
      'reconciliation',
      'transaction_mutations', 
      'investor_month_snapshots',
      'report_runs',
      'statement_metadata',
      'user_access_logs_enhanced',
      'investments'
    ],
    'deprecated_tables', ARRAY[
      'yield_settings',
      'portfolio_history',
      'report_definitions',
      'email_logs'
    ],
    'reason', 'Codebase cleanup - empty unused tables',
    'date', '2025-12-23'
  ),
  NULL
);