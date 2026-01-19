-- Fix assert_integrity_or_raise to use correct column names from fund_aum_mismatch
-- The view uses 'calculated_aum' not 'positions_sum'

CREATE OR REPLACE FUNCTION assert_integrity_or_raise(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL,
  p_context text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- CRITICAL CHECK 1: Ledger Reconciliation (positions with variance from ledger sum)
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_ledger_reconciliation') THEN
    FOR v_check_result IN
      SELECT
        investor_id,
        fund_id,
        fund_code,
        investor_email,
        variance
      FROM v_ledger_reconciliation
      WHERE has_variance = true
        AND (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
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
        investor_email,
        balance_variance
      FROM v_position_transaction_variance
      WHERE ABS(balance_variance) > 0.01
        AND (p_scope_fund_id IS NULL OR fund_id = p_scope_fund_id)
        AND (p_scope_investor_id IS NULL OR investor_id = p_scope_investor_id)
      LIMIT 5
    LOOP
      v_violation_count := v_violation_count + 1;
      v_violations := v_violations || jsonb_build_object(
        'view', 'v_position_transaction_variance',
        'investor_id', v_check_result.investor_id,
        'fund_id', v_check_result.fund_id,
        'fund_code', v_check_result.fund_code,
        'variance', v_check_result.balance_variance
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
        calculated_aum  -- Correct column name
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
        'calculated_aum', v_check_result.calculated_aum
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

  -- NON-CRITICAL CHECK 5: Transaction Sources (log only, don't fail)
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
    triggered_by,
    context,
    scope_fund_id,
    scope_investor_id,
    violations,
    runtime_ms,
    created_by
  ) VALUES (
    CASE WHEN v_violation_count > 0 THEN 'fail' ELSE 'pass' END,
    COALESCE(p_context, 'manual'),
    p_context,
    p_scope_fund_id,
    p_scope_investor_id,
    v_violations,
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start_ts)) * 1000,
    auth.uid()
  )
  RETURNING id INTO v_run_id;

  -- If violations found, raise exception with details
  IF v_violation_count > 0 THEN
    RAISE EXCEPTION 'Integrity check failed: % violations found. Run ID: %', 
      v_violation_count, v_run_id
      USING DETAIL = v_violations::text;
  END IF;
END;
$$;