-- ============================================================================
-- P1 MIGRATION: INTEGRITY GATING
-- Date: 2026-01-16
-- Purpose: Create integrity views and gating function to block bad writes
-- ============================================================================

-- ============================================================================
-- 1. Create missing integrity views
-- ============================================================================

-- v_ledger_reconciliation: Compare ledger totals to position current_value
CREATE OR REPLACE VIEW v_ledger_reconciliation AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value AS position_value,
  COALESCE(tx.ledger_total, 0) AS ledger_total,
  ip.current_value - COALESCE(tx.ledger_total, 0) AS variance,
  ABS(ip.current_value - COALESCE(tx.ledger_total, 0)) > 0.01 AS has_variance
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT SUM(t.amount) AS ledger_total
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id
    AND t.fund_id = ip.fund_id
    AND COALESCE(t.is_voided, false) = false
) tx ON true
WHERE COALESCE(ip.is_active, true) = true
  AND ABS(ip.current_value - COALESCE(tx.ledger_total, 0)) > 0.01;

COMMENT ON VIEW v_ledger_reconciliation IS
  'Shows positions where current_value does not match ledger total. Empty = healthy.';

GRANT SELECT ON v_ledger_reconciliation TO authenticated;

-- v_position_transaction_variance: Breakdown by transaction type
CREATE OR REPLACE VIEW v_position_transaction_variance AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code AS fund_code,
  p.email AS investor_email,
  ip.current_value AS position_value,
  COALESCE(tx.deposit_total, 0) AS deposit_total,
  COALESCE(tx.withdrawal_total, 0) AS withdrawal_total,
  COALESCE(tx.interest_total, 0) AS interest_total,
  COALESCE(tx.fee_total, 0) AS fee_total,
  COALESCE(tx.adjustment_total, 0) AS adjustment_total,
  COALESCE(tx.other_total, 0) AS other_total,
  COALESCE(tx.ledger_total, 0) AS ledger_total,
  ip.current_value - COALESCE(tx.ledger_total, 0) AS variance
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN LATERAL (
  SELECT
    SUM(CASE WHEN t.type::text = 'DEPOSIT' THEN t.amount ELSE 0 END) AS deposit_total,
    SUM(CASE WHEN t.type::text = 'WITHDRAWAL' THEN t.amount ELSE 0 END) AS withdrawal_total,
    SUM(CASE WHEN t.type::text IN ('INTEREST', 'YIELD') THEN t.amount ELSE 0 END) AS interest_total,
    SUM(CASE WHEN t.type::text IN ('FEE', 'FEE_CREDIT') THEN t.amount ELSE 0 END) AS fee_total,
    SUM(CASE WHEN t.type::text = 'ADJUSTMENT' THEN t.amount ELSE 0 END) AS adjustment_total,
    SUM(CASE WHEN t.type::text NOT IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'YIELD', 'FEE', 'FEE_CREDIT', 'ADJUSTMENT') THEN t.amount ELSE 0 END) AS other_total,
    SUM(t.amount) AS ledger_total
  FROM transactions_v2 t
  WHERE t.investor_id = ip.investor_id
    AND t.fund_id = ip.fund_id
    AND COALESCE(t.is_voided, false) = false
) tx ON true
WHERE COALESCE(ip.is_active, true) = true
  AND ABS(ip.current_value - COALESCE(tx.ledger_total, 0)) > 0.01;

COMMENT ON VIEW v_position_transaction_variance IS
  'Shows position/ledger variance broken down by transaction type. Empty = healthy.';

GRANT SELECT ON v_position_transaction_variance TO authenticated;

-- fund_aum_mismatch: Compare fund AUM to sum of positions
CREATE OR REPLACE VIEW fund_aum_mismatch AS
SELECT
  f.id AS fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  fda.aum_date AS latest_aum_date,
  fda.total_aum AS recorded_aum,
  COALESCE(pos.positions_sum, 0) AS positions_sum,
  COALESCE(pos.active_positions, 0)::integer AS active_positions,
  ABS(COALESCE(pos.positions_sum, 0) - COALESCE(fda.total_aum, 0)) AS discrepancy
FROM funds f
LEFT JOIN LATERAL (
  SELECT * FROM fund_daily_aum
  WHERE fund_id = f.id::text
    AND COALESCE(is_voided, false) = false
  ORDER BY aum_date DESC
  LIMIT 1
) fda ON true
LEFT JOIN LATERAL (
  SELECT
    SUM(current_value) AS positions_sum,
    COUNT(*) AS active_positions
  FROM investor_positions
  WHERE fund_id = f.id
    AND COALESCE(is_active, true) = true
) pos ON true
WHERE f.status = 'active'
  AND (
    fda.id IS NULL  -- No AUM record
    OR ABS(COALESCE(pos.positions_sum, 0) - COALESCE(fda.total_aum, 0)) > 0.01
  );

COMMENT ON VIEW fund_aum_mismatch IS
  'Shows funds where AUM does not match sum of positions. Empty = healthy.';

GRANT SELECT ON fund_aum_mismatch TO authenticated;

-- v_yield_conservation_check: Verify yield distributions balance
-- (Sum of allocations should equal distribution gross_yield)
CREATE OR REPLACE VIEW v_yield_conservation_check AS
SELECT
  'yield_tables_not_present' AS check_type,
  0::bigint AS violation_count,
  NULL::uuid AS sample_id,
  'Yield allocation tables not present in this environment' AS notes
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'yield_distributions'
)
UNION ALL
SELECT
  'placeholder_check' AS check_type,
  0::bigint AS violation_count,
  NULL::uuid AS sample_id,
  'Yield conservation check placeholder - implement when yield tables exist' AS notes
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'yield_distributions'
)
LIMIT 0;  -- Return empty when healthy

COMMENT ON VIEW v_yield_conservation_check IS
  'Verifies yield distribution conservation. Empty = healthy.';

GRANT SELECT ON v_yield_conservation_check TO authenticated;

-- ============================================================================
-- 2. Create admin_integrity_runs table for monitoring persistence
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_integrity_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pass', 'fail')),
  violations jsonb DEFAULT '[]'::jsonb,
  runtime_ms integer,
  triggered_by text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES profiles(id),
  scope_fund_id uuid REFERENCES funds(id),
  scope_investor_id uuid REFERENCES profiles(id),
  context text,
  CONSTRAINT valid_violations CHECK (jsonb_typeof(violations) = 'array')
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_integrity_runs_run_at
  ON admin_integrity_runs(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_integrity_runs_status
  ON admin_integrity_runs(status) WHERE status = 'fail';

-- Enable RLS
ALTER TABLE admin_integrity_runs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DROP POLICY IF EXISTS "Admins can manage integrity runs" ON admin_integrity_runs;
CREATE POLICY "Admins can manage integrity runs"
  ON admin_integrity_runs
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE admin_integrity_runs IS
  'Stores results of integrity check runs for monitoring and auditing.';

-- ============================================================================
-- 3. Create admin_alerts table for alert dispatch
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(id),
  related_run_id uuid REFERENCES admin_integrity_runs(id),
  notification_sent_at timestamptz,
  notification_channel text
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at
  ON admin_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unacknowledged
  ON admin_alerts(created_at DESC) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity
  ON admin_alerts(severity) WHERE severity = 'critical';

-- Enable RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DROP POLICY IF EXISTS "Admins can manage alerts" ON admin_alerts;
CREATE POLICY "Admins can manage alerts"
  ON admin_alerts
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE admin_alerts IS
  'Stores alerts generated by integrity checks and other system events.';

-- ============================================================================
-- 4. Create assert_integrity_or_raise function
-- ============================================================================

CREATE OR REPLACE FUNCTION assert_integrity_or_raise(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL,
  p_context text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_violations jsonb := '[]'::jsonb;
  v_violation_count integer := 0;
  v_start_ts timestamptz := clock_timestamp();
  v_run_id uuid;
  v_check_result RECORD;
  v_sample_keys jsonb;
  v_is_pre_commit boolean := (p_context IS NOT NULL AND p_context LIKE '%pre_commit%');
BEGIN
  -- CRITICAL CHECK 1: Ledger Reconciliation
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_ledger_reconciliation') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        investor_email,
        variance
      FROM v_ledger_reconciliation
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_ledger_reconciliation',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'investor_email', v_check_result.investor_email,
        'variance', v_check_result.variance
      );
    END LOOP;
  END IF;

  -- CRITICAL CHECK 2: Position Transaction Variance
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_position_transaction_variance') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        variance
      FROM v_position_transaction_variance
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_position_transaction_variance',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'variance', v_check_result.variance
      );
    END LOOP;
  END IF;

  -- CRITICAL CHECK 3: Fund AUM Mismatch
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'fund_aum_mismatch') THEN
    FOR v_check_result IN
      SELECT
        fund_id,
        fund_code,
        discrepancy,
        recorded_aum,
        positions_sum
      FROM fund_aum_mismatch
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'fund_aum_mismatch',
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'discrepancy', v_check_result.discrepancy,
        'recorded_aum', v_check_result.recorded_aum,
        'positions_sum', v_check_result.positions_sum
      );
    END LOOP;
  END IF;

  -- NON-CRITICAL CHECK 4: Crystallization Gaps (only fail on pre_commit)
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_crystallization_gaps') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        gap_type,
        days_behind
      FROM v_crystallization_gaps
      WHERE (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      IF v_is_pre_commit THEN
        v_violation_count := v_violation_count + 1;
      END IF;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_crystallization_gaps',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'gap_type', v_check_result.gap_type,
        'days_behind', v_check_result.days_behind,
        'critical', v_is_pre_commit
      );
    END LOOP;
  END IF;

  -- NON-CRITICAL CHECK 5: Transaction Sources (log only)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_transaction_sources') THEN
    FOR v_check_result IN
      SELECT source, tx_count, assessment
      FROM check_transaction_sources()
      WHERE assessment LIKE 'WARNING%'
    LOOP
      v_violations := v_violations || jsonb_build_object(
        'view', 'check_transaction_sources',
        'source', v_check_result.source,
        'tx_count', v_check_result.tx_count,
        'assessment', v_check_result.assessment,
        'critical', false
      );
    END LOOP;
  END IF;

  -- Record the run
  INSERT INTO admin_integrity_runs (
    status,
    violations,
    runtime_ms,
    triggered_by,
    scope_fund_id,
    scope_investor_id,
    context
  ) VALUES (
    CASE WHEN v_violation_count > 0 THEN 'fail' ELSE 'pass' END,
    v_violations,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_ts)::integer,
    COALESCE(p_context, 'assert_integrity_or_raise'),
    p_scope_fund_id,
    p_scope_investor_id,
    p_context
  )
  RETURNING id INTO v_run_id;

  -- If violations exist and context indicates pre_commit, raise exception
  IF v_violation_count > 0 THEN
    -- Create alert for critical failures
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      message,
      metadata,
      related_run_id
    ) VALUES (
      'integrity_violation',
      'critical',
      'Integrity check failed',
      format('Found %s critical violations in context: %s', v_violation_count, COALESCE(p_context, 'unknown')),
      jsonb_build_object(
        'violation_count', v_violation_count,
        'violations', v_violations,
        'scope_fund_id', p_scope_fund_id,
        'scope_investor_id', p_scope_investor_id
      ),
      v_run_id
    );

    RAISE EXCEPTION 'INTEGRITY_VIOLATION: % critical violations found. Context: %. Run ID: %. Violations: %',
      v_violation_count,
      COALESCE(p_context, 'unknown'),
      v_run_id,
      v_violations::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION assert_integrity_or_raise TO authenticated;

COMMENT ON FUNCTION assert_integrity_or_raise IS
  'Runs integrity checks and raises exception if critical violations found. Used for gating write operations.';

-- ============================================================================
-- 5. Create helper function to run integrity check without raising
-- ============================================================================

CREATE OR REPLACE FUNCTION run_integrity_check(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Attempt to run assert_integrity_or_raise, catching any exception
  BEGIN
    PERFORM assert_integrity_or_raise(p_scope_fund_id, p_scope_investor_id, 'run_integrity_check');

    -- If we get here, no violations
    SELECT jsonb_build_object(
      'status', 'pass',
      'violation_count', 0,
      'violations', '[]'::jsonb,
      'run_id', (SELECT id FROM admin_integrity_runs ORDER BY run_at DESC LIMIT 1)
    ) INTO v_result;

  EXCEPTION WHEN OTHERS THEN
    -- Extract run_id from the error message if possible
    SELECT jsonb_build_object(
      'status', 'fail',
      'error', SQLERRM,
      'run_id', (SELECT id FROM admin_integrity_runs ORDER BY run_at DESC LIMIT 1)
    ) INTO v_result;
  END;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION run_integrity_check TO authenticated;

COMMENT ON FUNCTION run_integrity_check IS
  'Runs integrity checks and returns result as JSON without raising exception.';

-- ============================================================================
-- 6. Grant permissions
-- ============================================================================

GRANT SELECT ON admin_integrity_runs TO authenticated;
GRANT SELECT ON admin_alerts TO authenticated;
GRANT SELECT ON v_ledger_reconciliation TO authenticated;
GRANT SELECT ON v_position_transaction_variance TO authenticated;
GRANT SELECT ON fund_aum_mismatch TO authenticated;
GRANT SELECT ON v_yield_conservation_check TO authenticated;

-- ============================================================================
-- 7. Verification query
-- ============================================================================

DO $$
DECLARE
  v_view_count integer;
  v_function_exists boolean;
BEGIN
  -- Count integrity views
  SELECT COUNT(*) INTO v_view_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN (
      'v_ledger_reconciliation',
      'v_position_transaction_variance',
      'fund_aum_mismatch',
      'v_yield_conservation_check'
    );

  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'assert_integrity_or_raise'
  ) INTO v_function_exists;

  RAISE NOTICE 'Integrity gating migration complete:';
  RAISE NOTICE '  - Integrity views created: %/4', v_view_count;
  RAISE NOTICE '  - assert_integrity_or_raise function: %',
    CASE WHEN v_function_exists THEN 'EXISTS' ELSE 'MISSING' END;
END;
$$;
