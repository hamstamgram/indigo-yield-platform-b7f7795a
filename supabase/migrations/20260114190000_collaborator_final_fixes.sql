-- ============================================================================
-- COLLABORATOR FINAL FIXES MIGRATION
-- Date: 2026-01-14
-- Version: 3.1.0
--
-- Implements:
--   E) Reconciliation pack as period lock prerequisite
--   G) Dust policy consistency - single source of truth
-- ============================================================================

BEGIN;

-- ============================================================================
-- E) RECONCILIATION PACK AS PERIOD LOCK PREREQUISITE
-- Period cannot be locked unless:
--   1. A reconciliation pack exists for that period
--   2. The pack is in 'final' status (reviewed and approved)
-- ============================================================================

-- Add finalize function for reconciliation pack
CREATE OR REPLACE FUNCTION finalize_reconciliation_pack(
  p_pack_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pack RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can finalize reconciliation packs'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_pack FROM reconciliation_packs WHERE id = p_pack_id;

  IF v_pack IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PACK_NOT_FOUND',
      'message', 'Reconciliation pack not found'
    );
  END IF;

  IF v_pack.status = 'final' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_FINALIZED',
      'message', 'Pack is already finalized'
    );
  END IF;

  IF v_pack.status = 'superseded' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PACK_SUPERSEDED',
      'message', 'Cannot finalize a superseded pack'
    );
  END IF;

  -- Check reconciliation passes
  IF NOT ((v_pack.pack_data->'reconciliation'->>'reconciled')::boolean) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'RECONCILIATION_FAILED',
      'message', 'Pack does not reconcile. Fix discrepancies before finalizing.',
      'expected_closing', v_pack.pack_data->'reconciliation'->>'expected_closing',
      'actual_closing', v_pack.pack_data->'reconciliation'->>'actual_closing',
      'difference', v_pack.pack_data->'reconciliation'->>'difference'
    );
  END IF;

  -- Mark as final
  UPDATE reconciliation_packs
  SET status = 'final',
      finalized_by = p_admin_id,
      finalized_at = now()
  WHERE id = p_pack_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('FINALIZE_RECONCILIATION_PACK', 'reconciliation_packs', p_pack_id::text, p_admin_id,
    jsonb_build_object('fund_id', v_pack.fund_id, 'period_start', v_pack.period_start, 'period_end', v_pack.period_end));

  RETURN jsonb_build_object(
    'success', true,
    'pack_id', p_pack_id,
    'status', 'final',
    'message', 'Reconciliation pack finalized successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION finalize_reconciliation_pack(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION finalize_reconciliation_pack IS
  'Finalize a reconciliation pack. Requires reconciliation to pass. Pack must be final before period can be locked.';

-- Helper function to check if period has finalized reconciliation pack
CREATE OR REPLACE FUNCTION has_finalized_recon_pack(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM reconciliation_packs
    WHERE fund_id = p_fund_id
      AND period_start = p_period_start
      AND period_end = p_period_end
      AND status = 'final'
  );
$$;

COMMENT ON FUNCTION has_finalized_recon_pack IS
  'Check if a finalized reconciliation pack exists for the given fund/period.';

-- Replace lock_accounting_period to require reconciliation pack
CREATE OR REPLACE FUNCTION lock_accounting_period(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_id uuid;
  v_recon_pack_id uuid;
  v_fund_code text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can lock accounting periods'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get fund code for error messages
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'FUND_NOT_FOUND',
      'message', 'Fund not found'
    );
  END IF;

  -- E) PREREQUISITE: Check for finalized reconciliation pack
  SELECT id INTO v_recon_pack_id
  FROM reconciliation_packs
  WHERE fund_id = p_fund_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status = 'final';

  IF v_recon_pack_id IS NULL THEN
    -- Check if any pack exists at all
    IF EXISTS (
      SELECT 1 FROM reconciliation_packs
      WHERE fund_id = p_fund_id
        AND period_start = p_period_start
        AND period_end = p_period_end
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'RECON_PACK_NOT_FINALIZED',
        'message', format('Reconciliation pack for %s (%s to %s) exists but is not finalized. Finalize it first using finalize_reconciliation_pack().',
          v_fund_code, p_period_start, p_period_end),
        'remediation', 'Call finalize_reconciliation_pack(pack_id, admin_id) after verifying the pack reconciles.'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'RECON_PACK_MISSING',
        'message', format('No reconciliation pack exists for %s (%s to %s). Generate and finalize one before locking.',
          v_fund_code, p_period_start, p_period_end),
        'remediation', 'Call generate_reconciliation_pack(fund_id, period_start, period_end, admin_id), then finalize_reconciliation_pack(pack_id, admin_id).'
      );
    END IF;
  END IF;

  -- Create or update the period
  INSERT INTO accounting_periods (fund_id, period_start, period_end, status, locked_by, locked_at, notes)
  VALUES (p_fund_id, p_period_start, p_period_end, 'locked', p_admin_id, now(), p_notes)
  ON CONFLICT (fund_id, period_start, period_end) DO UPDATE SET
    status = 'locked',
    locked_by = p_admin_id,
    locked_at = now(),
    notes = COALESCE(p_notes, accounting_periods.notes)
  RETURNING id INTO v_period_id;

  -- Audit log with recon pack reference
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('LOCK_PERIOD', 'accounting_periods', v_period_id::text, p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund_code,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'recon_pack_id', v_recon_pack_id
    ));

  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'fund_code', v_fund_code,
    'recon_pack_id', v_recon_pack_id,
    'status', 'locked',
    'message', format('Period locked successfully for %s (%s to %s)', v_fund_code, p_period_start, p_period_end)
  );
END;
$$;

COMMENT ON FUNCTION lock_accounting_period IS
  'Lock an accounting period. PREREQUISITE: A finalized reconciliation pack must exist for the period.';


-- ============================================================================
-- G) DUST POLICY CONSISTENCY - SINGLE SOURCE OF TRUTH
-- Remove hardcoded CHECK constraint and use trigger only
-- This ensures system_config.dust_tolerance is the ONLY source
-- ============================================================================

-- Drop the hardcoded constraint if it exists (it may have a fixed 0.01 value)
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS chk_dust_tolerance;

-- The trigger trg_validate_dust_tolerance (created in previous migration) already
-- uses get_dust_tolerance_for_fund() which reads from system_config.
-- This is now the ONLY enforcement mechanism.

-- Add function to update dust tolerance (admin only)
CREATE OR REPLACE FUNCTION update_dust_tolerance(
  p_asset text,
  p_tolerance numeric,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_config jsonb;
  v_new_config jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update dust tolerance'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_tolerance <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TOLERANCE',
      'message', 'Dust tolerance must be a positive number'
    );
  END IF;

  -- Get current config
  SELECT value INTO v_current_config
  FROM system_config WHERE key = 'dust_tolerance';

  IF v_current_config IS NULL THEN
    v_current_config := '{}'::jsonb;
  END IF;

  -- Update the specific asset
  v_new_config := v_current_config || jsonb_build_object(p_asset, p_tolerance);

  -- Upsert the config
  INSERT INTO system_config (key, value, description, updated_by, updated_at)
  VALUES ('dust_tolerance', v_new_config, 'Asset-specific dust tolerance thresholds', p_admin_id, now())
  ON CONFLICT (key) DO UPDATE SET
    value = v_new_config,
    updated_by = p_admin_id,
    updated_at = now();

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('UPDATE_DUST_TOLERANCE', 'system_config', 'dust_tolerance', p_admin_id,
    jsonb_build_object('asset', p_asset, 'old_value', v_current_config->>p_asset),
    jsonb_build_object('asset', p_asset, 'new_value', p_tolerance));

  RETURN jsonb_build_object(
    'success', true,
    'asset', p_asset,
    'tolerance', p_tolerance,
    'message', format('Dust tolerance for %s updated to %s', p_asset, p_tolerance)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_dust_tolerance(text, numeric, uuid) TO authenticated;

COMMENT ON FUNCTION update_dust_tolerance IS
  'Update dust tolerance for a specific asset. Single source of truth in system_config.dust_tolerance.';

-- Add function to get all dust tolerances (for UI/reports)
CREATE OR REPLACE FUNCTION get_all_dust_tolerances()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(value, '{"default": 0.01}'::jsonb)
  FROM system_config
  WHERE key = 'dust_tolerance';
$$;

GRANT EXECUTE ON FUNCTION get_all_dust_tolerances() TO authenticated;

COMMENT ON FUNCTION get_all_dust_tolerances IS
  'Get all dust tolerance thresholds from system_config.';


-- ============================================================================
-- ADD HEALTH CHECK FOR RECONCILIATION PACK COMPLETENESS
-- ============================================================================

-- Update health check to include recon pack coverage
DROP FUNCTION IF EXISTS run_comprehensive_health_check();

CREATE OR REPLACE FUNCTION run_comprehensive_health_check()
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
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
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
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'AUM records with NULL purpose')
  INTO check_status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 9: Duplicate Preflow AUM (P1)
  check_name := 'DUPLICATE_PREFLOW_AUM';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
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
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
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
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
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
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
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

GRANT EXECUTE ON FUNCTION run_comprehensive_health_check() TO authenticated;

COMMENT ON FUNCTION run_comprehensive_health_check IS
  'Comprehensive health check: 12 checks including RECON_PACK_COVERAGE. All must PASS for production readiness.';


COMMIT;
