-- Operational Monitoring Views for Drift Detection
-- Phase 4B: Automated visibility for operations
-- Usage: Run via cron job to detect drift before users report issues

BEGIN;

-- ============================================================
-- VIEW: Position Drift Detection
-- ============================================================
DROP VIEW IF EXISTS mv_position_ledger_drift;

CREATE VIEW mv_position_ledger_drift AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  p.email AS investor_email,
  f.name AS fund_name,
  f.code AS fund_code,
  ip.current_value AS position_value,
  COALESCE(ledger.balance, 0) AS ledger_balance,
  ip.current_value - COALESCE(ledger.balance, 0) AS drift_amount,
  CASE 
    WHEN ABS(ip.current_value - COALESCE(ledger.balance, 0)) < 0.01 THEN 'OK'
    WHEN ABS(ip.current_value - COALESCE(ledger.balance, 0)) < 100 THEN 'MINOR'
    ELSE 'MAJOR'
  END AS drift_severity
FROM investor_positions ip
JOIN (
  SELECT investor_id, fund_id, COALESCE(SUM(
    CASE WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount) ELSE amount END
  ), 0) as balance
  FROM transactions_v2 
  WHERE is_voided = false
  GROUP BY investor_id, fund_id
) ledger ON ip.investor_id = ledger.investor_id AND ip.fund_id = ledger.fund_id
LEFT JOIN profiles p ON ip.investor_id = p.id
LEFT JOIN funds f ON ip.fund_id = f.id
WHERE ABS(ip.current_value - COALESCE(ledger.balance, 0)) > 0.01;

-- ============================================================
-- VIEW: AUM Drift Detection
-- ============================================================
DROP VIEW IF EXISTS mv_aum_position_drift;

CREATE VIEW mv_aum_position_drift AS
SELECT 
  fda.fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  fda.aum_date,
  fda.total_aum AS recorded_aum,
  COALESCE(pos.position_sum, 0) AS positions_sum,
  fda.total_aum - COALESCE(pos.position_sum, 0) AS drift_amount,
  CASE 
    WHEN ABS(fda.total_aum - COALESCE(pos.position_sum, 0)) < 0.01 THEN 'OK'
    WHEN ABS(fda.total_aum - COALESCE(pos.position_sum, 0)) < 100 THEN 'MINOR'
    ELSE 'MAJOR'
  END AS drift_severity
FROM fund_daily_aum fda
LEFT JOIN funds f ON fda.fund_id = f.id
LEFT JOIN (
  SELECT fund_id, SUM(current_value) AS position_sum
  FROM investor_positions
  GROUP BY fund_id
) pos ON fda.fund_id = pos.fund_id
WHERE fda.aum_date = CURRENT_DATE
  AND fda.purpose = 'transaction'
  AND fda.is_voided = false
  AND ABS(fda.total_aum - COALESCE(pos.position_sum, 0)) > 0.01;

-- ============================================================
-- VIEW: Admin Repair Function Usage
-- ============================================================
DROP VIEW IF EXISTS mv_admin_repair_usage;

CREATE VIEW mv_admin_repair_usage AS
SELECT 
  action,
  entity,
  actor_user,
  meta->>'executed_at' AS executed_at,
  meta->>'dry_run' AS dry_run
FROM audit_log
WHERE action IN (
  'RECONCILE_ALL_POSITIONS',
  'REPAIR_ALL_POSITIONS',
  'VOID_TRANSACTION',
  'UNVOID_TRANSACTION'
)
AND created_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- FUNCTION: Get drift summary for alerting
-- ============================================================
DROP FUNCTION IF EXISTS get_drift_summary();

CREATE FUNCTION get_drift_summary() RETURNS TABLE(
  position_drift_count BIGINT,
  aum_drift_count BIGINT,
  repair_call_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM mv_position_ledger_drift)::BIGINT AS position_drift_count,
    (SELECT COUNT(*) FROM mv_aum_position_drift)::BIGINT AS aum_drift_count,
    (SELECT COUNT(*) FROM mv_admin_repair_usage)::BIGINT AS repair_call_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM mv_position_ledger_drift) > 0 THEN 'DRIFT_DETECTED'
      WHEN (SELECT COUNT(*) FROM mv_aum_position_drift) > 0 THEN 'AUM_DRIFT_DETECTED'
      ELSE 'OK'
    END::TEXT AS status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- OBSERVATION: Log current state
-- ============================================================
DO $$
DECLARE
  v_drift record;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'OPERATIONAL MONITORING VIEWS DEPLOYED';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  -- Check drift
  SELECT * INTO v_drift FROM get_drift_summary();
  
  RAISE NOTICE 'Position Drift: % records', v_drift.position_drift_count;
  RAISE NOTICE 'AUM Drift: % records', v_drift.aum_drift_count;
  RAISE NOTICE 'Admin Repairs (24h): % calls', v_drift.repair_call_count;
  RAISE NOTICE 'Status: %', v_drift.status;
  
  IF v_drift.status != 'OK' THEN
    RAISE WARNING 'DRIFT DETECTED - Requires investigation';
  END IF;
END $$;

COMMIT;