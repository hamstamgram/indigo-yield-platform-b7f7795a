-- ============================================================================
-- HEALTH CHECK: PASS/FAIL only + remove WARN/WARNING labels
-- Date: 2026-01-14
--
-- Requirements:
-- - check_status must be PASS or FAIL only (no WARN)
-- - severity must not contain WARN/WARNING (use NON_CRITICAL instead)
-- - check list/count must remain exactly 12
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.run_comprehensive_health_check()
RETURNS TABLE(
  check_name text,
  category text,
  check_status text,
  violation_count int,
  severity text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Yield Conservation (P0)
  check_name := 'YIELD_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'violation_type', violation_type,
      'gross_diff', gross_diff
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_yield_conservation_violations;
  RETURN NEXT;

  -- Check 2: Ledger Position Match (P0)
  check_name := 'LEDGER_POSITION_MATCH';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', r.fund_code,
      'investor_id', r.investor_id,
      'difference', r.difference
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_position_ledger_reconciliation r
  WHERE r.status = 'MISMATCH';
  RETURN NEXT;

  -- Check 3: Native Currency (P0)
  check_name := 'NATIVE_CURRENCY';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', t.id,
      'tx_asset', t.asset,
      'fund_asset', f.asset
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  WHERE t.asset != f.asset AND t.is_voided = false;
  RETURN NEXT;

  -- Check 4: Management Fee (P0) - must be 0 everywhere
  check_name := 'NO_MANAGEMENT_FEE';
  category := 'POLICY';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Funds with non-zero mgmt_fee_bps')
  INTO check_status, violation_count, details
  FROM funds
  WHERE mgmt_fee_bps != 0;
  RETURN NEXT;

  -- Check 5: Investor Event Conservation (P0)
  check_name := 'EVENT_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'event_id', id,
      'gross', gross_yield_amount,
      'net', net_yield_amount,
      'fee', fee_amount,
      'diff', gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM investor_yield_events
  WHERE is_voided = false
    AND ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) >= 0.0001;
  RETURN NEXT;

  -- Check 6: Economic Date Not Null (P0)
  check_name := 'ECONOMIC_DATE_NOT_NULL';
  category := 'DATA_QUALITY';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Transactions with NULL tx_date')
  INTO check_status, violation_count, details
  FROM transactions_v2
  WHERE tx_date IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 7: AS_OF_FILTERING (P1)
  check_name := 'AS_OF_FILTERING';
  category := 'DATA_QUALITY';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', id,
      'tx_date', tx_date,
      'created_at', created_at,
      'issue', 'tx_date > created_at (backdate)'
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2
  WHERE is_voided = false
    AND tx_date > (created_at AT TIME ZONE 'UTC')::date;
  RETURN NEXT;

  -- Check 8: AUM Purpose Consistency (P1)
  check_name := 'AUM_PURPOSE_CONSISTENCY';
  category := 'DATA_QUALITY';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'AUM records with NULL purpose')
  INTO check_status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 9: Duplicate Preflow AUM (P1)
  check_name := 'DUPLICATE_PREFLOW_AUM';
  category := 'DATA_QUALITY';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', fund_id,
      'event_date', event_date,
      'purpose', purpose,
      'count', cnt
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM (
    SELECT fund_id, event_date, purpose, COUNT(*) as cnt
    FROM fund_aum_events
    WHERE is_voided = false
      AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
    GROUP BY fund_id, event_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  RETURN NEXT;

  -- Check 10: Dust Tolerance (P1) - Asset-aware
  check_name := 'DUST_TOLERANCE';
  category := 'ACCOUNTING';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', yd.id,
      'dust_amount', yd.dust_amount,
      'max_allowed', get_dust_tolerance_for_fund(yd.fund_id)
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM yield_distributions yd
  WHERE yd.dust_amount IS NOT NULL
    AND ABS(yd.dust_amount) > get_dust_tolerance_for_fund(yd.fund_id)
    AND yd.status != 'voided';
  RETURN NEXT;

  -- Check 11: Void Cascade Integrity (P1)
  check_name := 'VOID_CASCADE_INTEGRITY';
  category := 'DATA_QUALITY';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', t.fund_id,
      'tx_date', t.tx_date,
      'voided_tx_id', t.id,
      'orphaned_events', (
        SELECT COUNT(*) FROM investor_yield_events ye
        WHERE ye.fund_id = t.fund_id
          AND ye.investor_id = t.investor_id
          AND ye.event_date = t.tx_date
          AND ye.is_voided = false
      )
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND EXISTS (
      SELECT 1 FROM investor_yield_events ye
      WHERE ye.fund_id = t.fund_id
        AND ye.investor_id = t.investor_id
        AND ye.event_date = t.tx_date
        AND ye.is_voided = false
    );
  RETURN NEXT;

  -- Check 12: Reconciliation Pack Coverage (P1)
  check_name := 'RECON_PACK_COVERAGE';
  category := 'COMPLIANCE';
  severity := 'NON_CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', f.code,
      'period_start', ap.period_start,
      'period_end', ap.period_end,
      'period_status', ap.status,
      'issue', 'Locked period without finalized recon pack'
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM accounting_periods ap
  JOIN funds f ON f.id = ap.fund_id
  WHERE ap.status = 'locked'
    AND NOT EXISTS (
      SELECT 1 FROM reconciliation_packs rp
      WHERE rp.fund_id = ap.fund_id
        AND rp.period_start = ap.period_start
        AND rp.period_end = ap.period_end
        AND rp.status = 'final'
    );
  RETURN NEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.run_comprehensive_health_check IS
  'Comprehensive health check: 12 checks. check_status is PASS/FAIL only; severities are CRITICAL/NON_CRITICAL (no WARN).';

COMMIT;
