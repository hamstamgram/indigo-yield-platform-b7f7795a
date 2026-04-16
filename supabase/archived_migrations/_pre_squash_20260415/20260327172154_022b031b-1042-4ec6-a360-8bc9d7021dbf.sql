
-- Revoke anon from ALL functions in public schema that are admin-sensitive
-- Using a DO block that iterates over the actual function OIDs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'set_canonical_rpc', 'void_transaction', 'void_yield_distribution',
      'approve_and_complete_withdrawal', 'apply_segmented_yield_distribution_v5',
      'adjust_investor_position', 'force_delete_investor', 'void_transactions_bulk',
      'unvoid_transaction', 'apply_investor_transaction',
      'apply_transaction_with_crystallization', 'recompute_investor_position',
      'recalculate_fund_aum_for_date', 'add_fund_to_investor',
      'acquire_position_lock', 'acquire_withdrawal_lock', 'acquire_yield_lock',
      'preview_segmented_yield_distribution_v5', 'check_is_admin'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s(%s) FROM anon', r.proname, r.args);
    -- Ensure authenticated and service_role keep access (except set_canonical_rpc which is service_role only)
    IF r.proname != 'set_canonical_rpc' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s(%s) TO authenticated', r.proname, r.args);
    END IF;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s(%s) TO service_role', r.proname, r.args);
  END LOOP;
END $$;
