-- Security: Fix search_path on all SECURITY DEFINER functions missing it
-- Bug #4: Recreate duplicate IB allocations check with is_voided filter

-- =========================================================================
-- SECURITY: Set search_path on all flagged SECURITY DEFINER functions
-- =========================================================================

ALTER FUNCTION public.admin_create_transactions_batch(jsonb) SET search_path = 'public';
ALTER FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose) SET search_path = 'public';
ALTER FUNCTION public.batch_crystallize_fund(uuid, date, boolean) SET search_path = 'public';
ALTER FUNCTION public.batch_initialize_fund_aum(uuid, boolean) SET search_path = 'public';
ALTER FUNCTION public.batch_reconcile_all_positions() SET search_path = 'public';
ALTER FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) SET search_path = 'public';
ALTER FUNCTION public.edit_transaction(uuid, text, text, text, date) SET search_path = 'public';
ALTER FUNCTION public.is_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.rebuild_position_from_ledger(uuid, uuid, uuid, text, boolean) SET search_path = 'public';
ALTER FUNCTION public.reconcile_investor_position(uuid, uuid, uuid, text) SET search_path = 'public';
ALTER FUNCTION public.replace_aum_snapshot(uuid, date, numeric, aum_purpose, uuid, text) SET search_path = 'public';
ALTER FUNCTION public.set_fund_daily_aum(uuid, date, numeric, text, text, boolean) SET search_path = 'public';
ALTER FUNCTION public.update_fund_daily_aum(uuid, numeric, text, uuid) SET search_path = 'public';
ALTER FUNCTION public.void_transaction(uuid, uuid, text) SET search_path = 'public';
ALTER FUNCTION public.void_yield_distribution(uuid, uuid, text) SET search_path = 'public';

-- =========================================================================
-- Bug #4: Recreate duplicate IB allocations check with is_voided filter
-- The original was dropped in migration 20260119173800. Recreate with fix.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_duplicate_ib_allocations()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer FROM (
      SELECT source_investor_id, distribution_id, fund_id
      FROM ib_allocations
      WHERE is_voided = false
      GROUP BY source_investor_id, distribution_id, fund_id
      HAVING COUNT(*) > 1
    ) duplicates),
    0
  );
$$;

COMMENT ON FUNCTION check_duplicate_ib_allocations() IS
  'Check for duplicate IB allocations. Excludes voided records to prevent false positives.';
