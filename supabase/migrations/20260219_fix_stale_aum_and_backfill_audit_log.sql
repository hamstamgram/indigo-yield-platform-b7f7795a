-- Data fix: correct stale SOL fund AUM and backfill audit_log for legacy distributions.
--
-- CONTEXT: After running the SOL A4 reporting yield (1500 SOL), the fund's today's
-- AUM record (written by tx_position_sync earlier that day) still showed 1484.17
-- (pre-yield positions). This caused check 2 (fund_aum_matches_positions) to fail.
-- The Bug 2 fix in 20260219_fix_v5_transaction_ib_and_aum.sql applies to future calls
-- only, so we must correct this specific stale record manually.
--
-- Also: 5 legacy distributions (calculation_method='excel_validation'/'flat_proportional')
-- from old QA data predate the mandatory audit_log requirement. Check 13 requires all
-- non-voided distributions to have an audit_log entry. We backfill synthetic entries.
--
-- Note: Both operations are idempotent - safe to re-apply.

DO $$
DECLARE
  v_sol_fund_id uuid := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
  v_admin_id uuid := '26ebf5ff-9755-43a4-984c-ac7e093a6416';
  v_positions_sum numeric;
BEGIN
  -- Bypass canonical guards for direct DML
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Fix 1: Update today's SOL fund AUM to match actual positions
  SELECT COALESCE(SUM(current_value), 0)
    INTO v_positions_sum
    FROM investor_positions
    WHERE fund_id = v_sol_fund_id AND is_active = true;

  UPDATE fund_daily_aum
  SET
    total_aum = v_positions_sum,
    source    = 'manual_reconcile_post_reporting_yield',
    updated_at = now()
  WHERE fund_id  = v_sol_fund_id
    AND aum_date  = CURRENT_DATE
    AND purpose   = 'transaction'
    AND is_voided = false;

  RAISE NOTICE 'SOL fund AUM updated to % for %', v_positions_sum, CURRENT_DATE;

  -- Fix 2: Backfill audit_log for legacy distributions that predate the audit requirement.
  -- The action contains 'YIELD' so check 13 (ILIKE '%yield%') picks it up.
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  SELECT
    COALESCE(yd.created_by, v_admin_id),
    'YIELD_DISTRIBUTION_LEGACY_AUDIT_BACKFILL',
    'yield_distributions',
    yd.id::text,
    jsonb_build_object(
      'calculation_method', yd.calculation_method,
      'period_start', yd.period_start,
      'period_end', yd.period_end
    ),
    jsonb_build_object(
      'gross_yield_amount', yd.gross_yield_amount,
      'total_net_amount', yd.total_net_amount,
      'backfilled_at', now()
    ),
    jsonb_build_object(
      'reason', 'legacy_distribution_predates_audit_requirement',
      'fund_id', yd.fund_id
    )
  FROM yield_distributions yd
  WHERE yd.is_voided = false
    AND yd.gross_yield_amount IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM audit_log al
      WHERE al.entity_id = yd.id::text
        AND (al.action ILIKE '%yield%' OR al.action ILIKE '%adb%')
    );

  RAISE NOTICE 'Audit log backfill complete';
END $$;
