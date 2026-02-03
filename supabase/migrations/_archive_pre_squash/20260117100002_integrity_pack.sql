-- ============================================================================
-- Migration: Integrity Pack - Comprehensive Data Integrity Views & RPC
-- ============================================================================
-- This migration creates a suite of integrity checking views and a unified
-- RPC function that validates all critical business invariants.
--
-- Invariants Checked:
-- 1. Position-Ledger Balance (positions match transaction sum)
-- 2. AUM-Position Reconciliation (fund AUM matches sum of positions)
-- 3. Yield Distribution Balance (gross = fee + net)
-- 4. Transaction Type Validity (all tx_types are valid enum values)
-- 5. Orphan Detection (positions without investors, transactions without positions)
-- 6. Duplicate Reference IDs (idempotency key violations)
-- 7. Future-dated Transactions (transactions beyond today)
-- 8. Negative Balances (positions with negative values)
-- ============================================================================

-- ============================================================================
-- INVARIANT 1: Position-Ledger Balance Check
-- Verifies that investor_positions.current_value matches the sum of transactions
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_position_ledger AS
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value as position_balance,
  COALESCE(ledger.transaction_sum, 0) as ledger_sum,
  ip.current_value - COALESCE(ledger.transaction_sum, 0) as difference,
  ABS(ip.current_value - COALESCE(ledger.transaction_sum, 0)) > 0.01 as is_mismatched,
  i.name as investor_name,
  f.name as fund_name
FROM public.investor_positions ip
JOIN public.investors i ON i.id = ip.investor_id
JOIN public.funds f ON f.id = ip.fund_id
LEFT JOIN (
  SELECT
    investor_id,
    fund_id,
    SUM(CASE WHEN is_voided = false THEN amount ELSE 0 END) as transaction_sum
  FROM public.transactions_v2
  GROUP BY investor_id, fund_id
) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
WHERE ip.current_value != 0 OR COALESCE(ledger.transaction_sum, 0) != 0;

COMMENT ON VIEW public.v_integrity_position_ledger IS
'Compares investor_positions.current_value with the sum of transactions. Mismatches indicate data corruption.';

-- ============================================================================
-- INVARIANT 2: AUM-Position Reconciliation
-- Verifies that fund AUM matches the sum of all investor positions
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_aum_positions AS
SELECT
  f.id as fund_id,
  f.name as fund_name,
  f.code as fund_code,
  COALESCE(fda.total_aum, 0) as recorded_aum,
  COALESCE(positions.total_positions, 0) as sum_of_positions,
  COALESCE(fda.total_aum, 0) - COALESCE(positions.total_positions, 0) as difference,
  CASE
    WHEN COALESCE(fda.total_aum, 0) = 0 THEN false
    ELSE ABS(COALESCE(fda.total_aum, 0) - COALESCE(positions.total_positions, 0)) / GREATEST(fda.total_aum, 1) > 0.001
  END as is_mismatched,
  fda.aum_date as aum_date
FROM public.funds f
LEFT JOIN LATERAL (
  SELECT total_aum, aum_date
  FROM public.fund_daily_aum
  WHERE fund_id = f.id
  ORDER BY aum_date DESC
  LIMIT 1
) fda ON true
LEFT JOIN (
  SELECT
    fund_id,
    SUM(current_value) as total_positions
  FROM public.investor_positions
  GROUP BY fund_id
) positions ON positions.fund_id = f.id
WHERE f.status = 'active';

COMMENT ON VIEW public.v_integrity_aum_positions IS
'Compares fund daily AUM with sum of investor positions. Large differences indicate reconciliation issues.';

-- ============================================================================
-- INVARIANT 3: Yield Distribution Balance
-- Verifies that gross_yield = fee_amount + ib_fee_amount + net_yield
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_yield_balance AS
SELECT
  yd.id as distribution_id,
  yd.fund_id,
  yd.investor_id,
  yd.yield_date,
  yd.gross_yield,
  yd.fee_amount,
  COALESCE(yd.ib_fee_amount, 0) as ib_fee_amount,
  yd.net_yield,
  yd.gross_yield - (yd.fee_amount + COALESCE(yd.ib_fee_amount, 0) + yd.net_yield) as imbalance,
  ABS(yd.gross_yield - (yd.fee_amount + COALESCE(yd.ib_fee_amount, 0) + yd.net_yield)) > 0.001 as is_imbalanced,
  i.name as investor_name,
  f.name as fund_name
FROM public.yield_distributions yd
JOIN public.investors i ON i.id = yd.investor_id
JOIN public.funds f ON f.id = yd.fund_id
WHERE yd.is_voided = false;

COMMENT ON VIEW public.v_integrity_yield_balance IS
'Verifies yield distribution arithmetic: gross = fee + ib_fee + net. Imbalances indicate calculation errors.';

-- ============================================================================
-- INVARIANT 4: Invalid Transaction Types
-- Checks for any transactions with invalid or deprecated tx_type values
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_invalid_tx_types AS
SELECT
  t.id as transaction_id,
  t.type::text as tx_type,
  t.investor_id,
  t.fund_id,
  t.amount,
  t.tx_date,
  t.created_at,
  i.name as investor_name,
  'INVALID_TYPE' as issue
FROM public.transactions_v2 t
JOIN public.investors i ON i.id = t.investor_id
WHERE t.type::text NOT IN (
  'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT',
  'FEE_CREDIT', 'IB_CREDIT', 'YIELD', 'INTERNAL_WITHDRAWAL',
  'INTERNAL_CREDIT', 'IB_DEBIT'
);

COMMENT ON VIEW public.v_integrity_invalid_tx_types IS
'Lists transactions with invalid tx_type enum values. Should always be empty.';

-- ============================================================================
-- INVARIANT 5: Orphan Detection
-- Finds positions without valid investors, or transactions without positions
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_orphans AS
-- Positions without investors
SELECT
  'position_without_investor' as orphan_type,
  ip.investor_id::text as entity_id,
  ip.fund_id::text as related_id,
  ip.current_value::text as amount,
  ip.created_at
FROM public.investor_positions ip
LEFT JOIN public.investors i ON i.id = ip.investor_id
WHERE i.id IS NULL

UNION ALL

-- Positions without funds
SELECT
  'position_without_fund' as orphan_type,
  ip.investor_id::text as entity_id,
  ip.fund_id::text as related_id,
  ip.current_value::text as amount,
  ip.created_at
FROM public.investor_positions ip
LEFT JOIN public.funds f ON f.id = ip.fund_id
WHERE f.id IS NULL

UNION ALL

-- Transactions without investors
SELECT
  'transaction_without_investor' as orphan_type,
  t.id::text as entity_id,
  t.investor_id::text as related_id,
  t.amount::text,
  t.created_at
FROM public.transactions_v2 t
LEFT JOIN public.investors i ON i.id = t.investor_id
WHERE i.id IS NULL AND t.is_voided = false

UNION ALL

-- Yield distributions without investors
SELECT
  'yield_without_investor' as orphan_type,
  yd.id::text as entity_id,
  yd.investor_id::text as related_id,
  yd.net_yield::text as amount,
  yd.created_at
FROM public.yield_distributions yd
LEFT JOIN public.investors i ON i.id = yd.investor_id
WHERE i.id IS NULL AND yd.is_voided = false;

COMMENT ON VIEW public.v_integrity_orphans IS
'Detects orphaned records - entities referencing non-existent parents. Should always be empty.';

-- ============================================================================
-- INVARIANT 6: Duplicate Reference IDs
-- Checks for duplicate idempotency keys
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_duplicate_refs AS
SELECT
  'transactions_v2' as table_name,
  reference_id,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id::text) as duplicate_ids
FROM public.transactions_v2
WHERE reference_id IS NOT NULL
  AND is_voided = false
GROUP BY reference_id
HAVING COUNT(*) > 1

UNION ALL

SELECT
  'yield_distributions' as table_name,
  reference_id,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id::text) as duplicate_ids
FROM public.yield_distributions
WHERE reference_id IS NOT NULL
  AND is_voided = false
GROUP BY reference_id
HAVING COUNT(*) > 1;

COMMENT ON VIEW public.v_integrity_duplicate_refs IS
'Detects duplicate reference_ids which violate idempotency. Should always be empty.';

-- ============================================================================
-- INVARIANT 7: Future-dated Transactions
-- Checks for transactions dated in the future
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_future_dated AS
SELECT
  t.id as transaction_id,
  t.type::text as tx_type,
  t.investor_id,
  t.fund_id,
  t.amount,
  t.tx_date,
  t.created_at,
  i.name as investor_name,
  t.tx_date - CURRENT_DATE as days_in_future
FROM public.transactions_v2 t
JOIN public.investors i ON i.id = t.investor_id
WHERE t.tx_date > CURRENT_DATE
  AND t.is_voided = false;

COMMENT ON VIEW public.v_integrity_future_dated IS
'Lists transactions dated in the future. These require review.';

-- ============================================================================
-- INVARIANT 8: Negative Balances
-- Checks for positions with negative values (usually invalid)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_negative_balances AS
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value,
  ip.cost_basis,
  ip.units,
  i.name as investor_name,
  f.name as fund_name,
  f.code as fund_code
FROM public.investor_positions ip
JOIN public.investors i ON i.id = ip.investor_id
JOIN public.funds f ON f.id = ip.fund_id
WHERE ip.current_value < -0.01; -- Allow for small rounding errors

COMMENT ON VIEW public.v_integrity_negative_balances IS
'Lists positions with negative balances. These usually indicate data errors.';

-- ============================================================================
-- INVARIANT 9: Voided Transaction Consistency
-- Checks that voided transactions have void metadata
-- ============================================================================

CREATE OR REPLACE VIEW public.v_integrity_void_consistency AS
SELECT
  t.id as transaction_id,
  t.is_voided,
  t.voided_at,
  t.voided_by,
  t.void_reason,
  CASE
    WHEN t.is_voided = true AND t.voided_at IS NULL THEN 'missing_voided_at'
    WHEN t.is_voided = true AND t.voided_by IS NULL THEN 'missing_voided_by'
    WHEN t.is_voided = true AND t.void_reason IS NULL THEN 'missing_void_reason'
    WHEN t.is_voided = false AND t.voided_at IS NOT NULL THEN 'has_voided_at_but_not_voided'
    ELSE 'consistent'
  END as consistency_issue
FROM public.transactions_v2 t
WHERE
  (t.is_voided = true AND (t.voided_at IS NULL OR t.voided_by IS NULL))
  OR (t.is_voided = false AND t.voided_at IS NOT NULL);

COMMENT ON VIEW public.v_integrity_void_consistency IS
'Checks that void metadata is consistent with is_voided flag.';

-- ============================================================================
-- MASTER INTEGRITY CHECK RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.run_integrity_pack()
RETURNS TABLE (
  check_name text,
  category text,
  severity text,
  violation_count integer,
  status text,
  details json
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Check 1: Position-Ledger Balance
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_position_ledger
  WHERE is_mismatched = true;

  RETURN QUERY SELECT
    'position_ledger_balance'::text,
    'data_integrity'::text,
    'critical'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT investor_name, fund_name, position_balance, ledger_sum, difference
      FROM public.v_integrity_position_ledger
      WHERE is_mismatched = true
      LIMIT 10
    ) t)::json;

  -- Check 2: AUM-Position Reconciliation
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_aum_positions
  WHERE is_mismatched = true;

  RETURN QUERY SELECT
    'aum_position_reconciliation'::text,
    'data_integrity'::text,
    'critical'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT fund_name, fund_code, recorded_aum, sum_of_positions, difference
      FROM public.v_integrity_aum_positions
      WHERE is_mismatched = true
      LIMIT 10
    ) t)::json;

  -- Check 3: Yield Distribution Balance
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_yield_balance
  WHERE is_imbalanced = true;

  RETURN QUERY SELECT
    'yield_distribution_balance'::text,
    'data_integrity'::text,
    'critical'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT distribution_id, investor_name, gross_yield, fee_amount, net_yield, imbalance
      FROM public.v_integrity_yield_balance
      WHERE is_imbalanced = true
      LIMIT 10
    ) t)::json;

  -- Check 4: Invalid Transaction Types
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_invalid_tx_types;

  RETURN QUERY SELECT
    'invalid_tx_types'::text,
    'enum_integrity'::text,
    'critical'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT transaction_id, tx_type, investor_name, amount
      FROM public.v_integrity_invalid_tx_types
      LIMIT 10
    ) t)::json;

  -- Check 5: Orphan Records
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_orphans;

  RETURN QUERY SELECT
    'orphan_records'::text,
    'referential_integrity'::text,
    'warning'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'WARN' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT orphan_type, entity_id, related_id, amount
      FROM public.v_integrity_orphans
      LIMIT 10
    ) t)::json;

  -- Check 6: Duplicate Reference IDs
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_duplicate_refs;

  RETURN QUERY SELECT
    'duplicate_reference_ids'::text,
    'idempotency'::text,
    'critical'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT table_name, reference_id, duplicate_count
      FROM public.v_integrity_duplicate_refs
      LIMIT 10
    ) t)::json;

  -- Check 7: Future-dated Transactions
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_future_dated;

  RETURN QUERY SELECT
    'future_dated_transactions'::text,
    'temporal_integrity'::text,
    'warning'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'WARN' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT transaction_id, tx_type, investor_name, tx_date, days_in_future
      FROM public.v_integrity_future_dated
      LIMIT 10
    ) t)::json;

  -- Check 8: Negative Balances
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_negative_balances;

  RETURN QUERY SELECT
    'negative_balances'::text,
    'data_integrity'::text,
    'warning'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'WARN' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT investor_name, fund_name, current_value
      FROM public.v_integrity_negative_balances
      LIMIT 10
    ) t)::json;

  -- Check 9: Void Consistency
  SELECT COUNT(*) INTO v_count
  FROM public.v_integrity_void_consistency;

  RETURN QUERY SELECT
    'void_consistency'::text,
    'data_integrity'::text,
    'warning'::text,
    v_count,
    CASE WHEN v_count = 0 THEN 'PASS' ELSE 'WARN' END::text,
    (SELECT json_agg(row_to_json(t)) FROM (
      SELECT transaction_id, is_voided, consistency_issue
      FROM public.v_integrity_void_consistency
      LIMIT 10
    ) t)::json;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.run_integrity_pack() IS
'Runs all integrity checks and returns a summary with violation counts and sample details.
Categories: data_integrity, enum_integrity, referential_integrity, idempotency, temporal_integrity
Severities: critical (must fix), warning (should investigate)';

-- ============================================================================
-- QUICK HEALTH CHECK (for dashboards)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_integrity_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_critical_count integer;
  v_warning_count integer;
  v_all_passed boolean;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN severity = 'critical' AND status = 'FAIL' THEN violation_count ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'warning' AND status = 'WARN' THEN violation_count ELSE 0 END), 0),
    bool_and(status IN ('PASS', 'WARN'))
  INTO v_critical_count, v_warning_count, v_all_passed
  FROM public.run_integrity_pack();

  v_result := json_build_object(
    'status', CASE
      WHEN v_critical_count > 0 THEN 'CRITICAL'
      WHEN v_warning_count > 0 THEN 'WARNING'
      ELSE 'HEALTHY'
    END,
    'critical_violations', v_critical_count,
    'warning_violations', v_warning_count,
    'all_critical_passed', v_critical_count = 0,
    'checked_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_integrity_summary() IS
'Returns a quick summary of system integrity status. Use for dashboards and monitoring.';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.v_integrity_position_ledger TO authenticated;
GRANT SELECT ON public.v_integrity_aum_positions TO authenticated;
GRANT SELECT ON public.v_integrity_yield_balance TO authenticated;
GRANT SELECT ON public.v_integrity_invalid_tx_types TO authenticated;
GRANT SELECT ON public.v_integrity_orphans TO authenticated;
GRANT SELECT ON public.v_integrity_duplicate_refs TO authenticated;
GRANT SELECT ON public.v_integrity_future_dated TO authenticated;
GRANT SELECT ON public.v_integrity_negative_balances TO authenticated;
GRANT SELECT ON public.v_integrity_void_consistency TO authenticated;

GRANT EXECUTE ON FUNCTION public.run_integrity_pack() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_integrity_summary() TO authenticated;
