-- Issue G: Create helper functions for data integrity checks
-- These RPCs are used by the DataIntegrityPanel component

-- Check for duplicate reference_ids in transactions_v2
CREATE OR REPLACE FUNCTION check_duplicate_transaction_refs()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer FROM (
      SELECT reference_id
      FROM transactions_v2
      WHERE reference_id IS NOT NULL
      GROUP BY reference_id
      HAVING COUNT(*) > 1
    ) duplicates),
    0
  );
$$;

-- Check for duplicate IB allocations (same investor, period, fund)
CREATE OR REPLACE FUNCTION check_duplicate_ib_allocations()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COUNT(*)::integer FROM (
      SELECT source_investor_id, period_id, fund_id
      FROM ib_allocations
      WHERE is_voided = false
      GROUP BY source_investor_id, period_id, fund_id
      HAVING COUNT(*) > 1
    ) duplicates),
    0
  );
$$;

-- Grant execute to authenticated users (admin check is in RLS)
GRANT EXECUTE ON FUNCTION check_duplicate_transaction_refs() TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_ib_allocations() TO authenticated;