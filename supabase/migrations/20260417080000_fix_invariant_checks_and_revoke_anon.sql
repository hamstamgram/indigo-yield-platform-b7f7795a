-- ============================================================
-- P0 FIX: run_invariant_checks column name + revoke anon on ungated SECDEF
-- Date: 2026-04-17
-- ============================================================
-- FIX 1: run_invariant_checks references yield_allocations.net_yield_amount
-- but the column is net_amount. investor_yield_events has net_yield_amount
-- but yield_allocations has net_amount. Checks 3 and 8 crash.
--
-- FIX 2: Revoke EXECUTE from anon on all SECDEF functions that lack
-- admin/auth gates. 100+ functions have anon EXECUTE granted.
-- Many are triggers (harmless), but read functions expose data
-- and mutation functions allow unauthorized state changes.
-- ============================================================

-- ============================================================
-- FIX 1: run_invariant_checks — yield_allocations.net_yield_amount → net_amount
-- ============================================================
-- We only need to fix Check 3 and Check 8. Everything else is correct.
-- Since CREATE OR REPLACE requires the full function body, we do targeted fixes.

CREATE OR REPLACE FUNCTION "public"."run_invariant_checks"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_checks JSONB := '[]'::jsonb;
  v_violations JSONB;
  v_violation_count INT;
  v_passed_count INT := 0;
  v_failed_count INT := 0;
  v_total_count INT := 0;
BEGIN
  -- Check 1: yield_conservation
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id, 'fund_id', yd.fund_id, 'gross_yield', yd.gross_yield_amount,
    'net', yd.total_net_amount, 'fees', yd.total_fee_amount, 'ib', yd.total_ib_amount,
    'diff', yd.gross_yield_amount - yd.total_net_amount - yd.total_fee_amount - COALESCE(yd.total_ib_amount, 0)
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_distributions yd
  WHERE yd.is_voided = false
    AND yd.gross_yield_amount != 0
    AND ABS(yd.gross_yield_amount - yd.total_net_amount - yd.total_fee_amount - COALESCE(yd.total_ib_amount, 0)) > 0.01;
  v_checks := v_checks || jsonb_build_object('name','yield_conservation','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 2: position_sum_matches_aum
  WITH position_sums AS (
    SELECT fund_id, SUM(current_value) AS total_position_value
    FROM investor_positions WHERE is_active = true GROUP BY fund_id
  ),
  aum_values AS (
    SELECT fund_id, total_aum FROM fund_daily_aum WHERE is_voided = false AND purpose = 'transaction'
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', ps.fund_id, 'position_sum', ps.total_position_value,
    'aum', a.total_aum, 'diff', ABS(ps.total_position_value - COALESCE(a.total_aum, 0))
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM position_sums ps
  LEFT JOIN aum_values a ON a.fund_id = ps.fund_id
  WHERE ABS(ps.total_position_value - COALESCE(a.total_aum, 0)) > 1;
  v_checks := v_checks || jsonb_build_object('name','position_sum_matches_aum','category','position','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 3: yield_allocation_sum_matches_distribution
  -- FIXED: yield_allocations.net_amount (NOT net_yield_amount)
  -- FIXED: Cannot nest SUM() inside jsonb_agg — use CTE
  WITH alloc_sums AS (
    SELECT ya.distribution_id, SUM(ya.net_amount) AS total_allocated
    FROM yield_allocations ya
    WHERE ya.is_voided = false
    GROUP BY ya.distribution_id
    HAVING ABS(SUM(ya.net_amount) - COALESCE((SELECT yd2.total_net_amount FROM yield_distributions yd2 WHERE yd2.id = ya.distribution_id), 0)) > 0.01
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', als.distribution_id, 'total_allocated', als.total_allocated
  )), '[]'::jsonb),
  (SELECT COUNT(*) FROM alloc_sums) INTO v_violations, v_violation_count
  FROM alloc_sums als;
  v_checks := v_checks || jsonb_build_object('name','yield_allocation_sum_matches_distribution','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 4: no_negative_positions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', ip.investor_id, 'fund_id', ip.fund_id, 'current_value', ip.current_value
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions ip
  WHERE ip.is_active = true AND ip.current_value < 0;
  v_checks := v_checks || jsonb_build_object('name','no_negative_positions','category','position','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 5: no_duplicate_transactions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', t1.investor_id, 'fund_id', t1.fund_id, 'type', t1.type,
    'amount', t1.amount, 'tx_date', t1.tx_date, 'reference_id', t1.reference_id
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t1
  WHERE t1.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t2
      WHERE t2.investor_id = t1.investor_id
        AND t2.fund_id = t1.fund_id
        AND t2.type = t1.type
        AND t2.amount = t1.amount
        AND t2.tx_date = t1.tx_date
        AND t2.reference_id IS NOT DISTINCT FROM t1.reference_id
        AND t2.id != t1.id
        AND t2.is_voided = false
    );
  v_checks := v_checks || jsonb_build_object('name','no_duplicate_transactions','category','transaction','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 6: fee_allocation_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', fa.distribution_id, 'investor_id', fa.investor_id,
    'fee_amount', fa.fee_amount, 'credit_transaction_id', fa.credit_transaction_id
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM fee_allocations fa
  WHERE fa.is_voided = false
    AND fa.fee_amount != 0
    AND fa.credit_transaction_id IS NULL;
  v_checks := v_checks || jsonb_build_object('name','fee_allocation_consistency','category','fee','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 7: ib_allocation_consistency
  -- FIXED: ib_allocations has ib_investor_id (not ib_id), ib_fee_amount (not ib_amount)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ia.distribution_id, 'source_investor_id', ia.source_investor_id,
    'ib_investor_id', ia.ib_investor_id, 'ib_fee_amount', ia.ib_fee_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM ib_allocations ia
  WHERE ia.is_voided = false
    AND ia.ib_fee_amount < 0;
  v_checks := v_checks || jsonb_build_object('name','ib_allocation_consistency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 8: yield_allocation_consistency
  -- FIXED: yield_allocations.net_amount (NOT net_yield_amount)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ya.distribution_id, 'investor_id', ya.investor_id,
    'net_amount', ya.net_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_allocations ya
  WHERE ya.is_voided = false
    AND ya.net_amount < 0;
  v_checks := v_checks || jsonb_build_object('name','yield_allocation_consistency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 9: voided_transaction_no_active_allocations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'transaction_id', t.id, 'type', t.type
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND (
      EXISTS (SELECT 1 FROM fee_allocations WHERE credit_transaction_id = t.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM fee_allocations WHERE debit_transaction_id = t.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM ib_commission_ledger WHERE transaction_id = t.id AND is_voided = false)
    );
  v_checks := v_checks || jsonb_build_object('name','voided_transaction_no_active_allocations','category','validation','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 10: aum_event_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'event_id', ae.id, 'fund_id', ae.fund_id, 'event_date', ae.event_date
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM fund_aum_events ae
  LEFT JOIN fund_daily_aum da ON da.fund_id = ae.fund_id AND da.aum_date = ae.event_date
  WHERE ae.is_voided = false AND da.id IS NULL;
  v_checks := v_checks || jsonb_build_object('name','aum_event_consistency','category','aum','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 11: duplicate_transactions_check (same as 5, kept for compat)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', t1.investor_id, 'fund_id', t1.fund_id, 'type', t1.type,
    'amount', t1.amount, 'tx_date', t1.tx_date, 'reference_id', t1.reference_id
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t1
  WHERE t1.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t2
      WHERE t2.investor_id = t1.investor_id
        AND t2.fund_id = t1.fund_id
        AND t2.type = t1.type
        AND t2.amount = t1.amount
        AND t2.tx_date = t1.tx_date
        AND t2.reference_id IS NOT DISTINCT FROM t1.reference_id
        AND t2.id != t1.id
        AND t2.is_voided = false
    );
  v_checks := v_checks || jsonb_build_object('name','duplicate_transactions_check','category','transaction','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 12: withdrawal_request_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'request_id', wr.id, 'investor_id', wr.investor_id, 'status', wr.status
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM withdrawal_requests wr
  WHERE wr.status IN ('approved', 'completed')
    AND NOT EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.investor_id = wr.investor_id
        AND t.fund_id = wr.fund_id
        AND t.type = 'WITHDRAWAL'
        AND t.is_voided = false
    );
  v_checks := v_checks || jsonb_build_object('name','withdrawal_request_consistency','category','withdrawal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 13: fund_daily_aum_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fda.fund_id, 'aum_date', fda.aum_date, 'total_aum', fda.total_aum
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM fund_daily_aum fda
  WHERE fda.is_voided = false
    AND fda.purpose = 'transaction'
    AND fda.total_aum < 0;
  v_checks := v_checks || jsonb_build_object('name','fund_daily_aum_consistency','category','aum','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 14: position_balance_matches_ledger
  -- FIXED: tx_type enum has FEE (not FEE_DEBIT), includes IB_DEBIT
  WITH ledger_totals AS (
    SELECT t.investor_id, t.fund_id,
      SUM(CASE WHEN t.type IN ('DEPOSIT','YIELD','FEE_CREDIT','IB_CREDIT','DUST_SWEEP','INTERNAL_CREDIT') THEN t.amount ELSE 0 END) -
      SUM(CASE WHEN t.type IN ('WITHDRAWAL','FEE','IB_DEBIT','DUST','INTERNAL_WITHDRAWAL') THEN t.amount ELSE 0 END) AS net_balance
    FROM transactions_v2 t
    WHERE t.is_voided = false
    GROUP BY t.investor_id, t.fund_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', ip.investor_id, 'fund_id', ip.fund_id,
    'position_value', ip.current_value, 'ledger_balance', lt.net_balance,
    'diff', ABS(ip.current_value - lt.net_balance)
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions ip
  JOIN ledger_totals lt ON lt.investor_id = ip.investor_id AND lt.fund_id = ip.fund_id
  WHERE ip.is_active = true
    AND ABS(ip.current_value - lt.net_balance) > 0.01;
  v_checks := v_checks || jsonb_build_object('name','position_balance_matches_ledger','category','position','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 15: high_water_mark_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', ip.investor_id, 'fund_id', ip.fund_id,
    'current_value', ip.current_value, 'high_water_mark', ip.high_water_mark
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions ip
  WHERE ip.is_active = true
    AND ip.high_water_mark IS NOT NULL
    AND ip.high_water_mark > ip.current_value + 1;
  v_checks := v_checks || jsonb_build_object('name','high_water_mark_consistency','category','position','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 16: yield_distribution_status_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id, 'status', yd.status, 'is_voided', yd.is_voided
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_distributions yd
  WHERE yd.is_voided = false AND yd.status != 'applied';
  v_checks := v_checks || jsonb_build_object('name','yield_distribution_status_consistency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  v_total_count := v_passed_count + v_failed_count;

  RETURN jsonb_build_object(
    'checks', v_checks,
    'summary', jsonb_build_object(
      'total', v_total_count,
      'passed', v_passed_count,
      'failed', v_failed_count,
      'all_passed', v_failed_count = 0
    )
  );
END;
$$;

ALTER FUNCTION "public"."run_invariant_checks"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."run_invariant_checks"() IS 'Fixed: Check 3 uses yield_allocations.net_amount (not net_yield_amount). Check 8 same fix. Check 9 uses ib_commission_ledger.transaction_id (not credit_transaction_id). Removed yield_allocations.credit_transaction_id from Check 9 (column does not exist).';


-- ============================================================
-- FIX 2: Revoke anon EXECUTE on ALL SECDEF functions without auth gates
-- ============================================================
-- Strategy: PostgreSQL grants EXECUTE on functions to PUBLIC by default.
-- REVOKE FROM anon is insufficient because anon inherits PUBLIC privileges.
-- Must: REVOKE ALL FROM PUBLIC, then GRANT EXECUTE to authenticated + service_role.
--
-- Category: Read functions (expose data)
REVOKE ALL ON FUNCTION public.get_fund_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fund_summary() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_paged_investor_summaries(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paged_investor_summaries(integer, integer, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_platform_flow_metrics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_flow_metrics(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_monthly_platform_aum() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_platform_aum() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_fund_composition(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fund_composition(uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_funds_with_aum() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_funds_with_aum() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_available_balance(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_drift_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_drift_summary() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_health_trend(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_health_trend(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_latest_health_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_latest_health_status() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_position_reconciliation(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_position_reconciliation(date, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_reporting_eligible_investors(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reporting_eligible_investors(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_statement_period_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_statement_period_summary(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_void_aum_impact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_void_aum_impact(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_void_transaction_impact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_void_transaction_impact(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_void_yield_impact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_void_yield_impact(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_ib_parent_candidates(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ib_parent_candidates(uuid) TO authenticated, service_role;

-- Category: Internal helpers
REVOKE ALL ON FUNCTION public.get_dust_tolerance_for_fund(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dust_tolerance_for_fund(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_fees_account_for_fund(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fees_account_for_fund(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_existing_preflow_aum(uuid, date, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_existing_preflow_aum(uuid, date, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_admin_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_name(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_system_mode() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_mode() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_super_admin_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_super_admin_role(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_import_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_import_enabled() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_crystallization_current(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_crystallization_current(uuid, uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_period_locked(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_period_locked(uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_within_edit_window(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_within_edit_window(timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_yield_period_closed(uuid, integer, integer, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_yield_period_closed(uuid, integer, integer, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_withdraw(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_withdraw(uuid, uuid, numeric) TO authenticated, service_role;

-- Category: Mutation/admin functions (highest risk)
REVOKE ALL ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.apply_yield_distribution_v5_with_lock(uuid, date, numeric, uuid, aum_purpose, date, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_yield_distribution_v5_with_lock(uuid, date, numeric, uuid, aum_purpose, date, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cancel_withdrawal_by_investor(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_investor(uuid, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_fund_aum_baseline(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_fund_aum_baseline(text, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_aum_to_positions(uuid, date, uuid, text, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_aum_to_positions(uuid, date, uuid, text, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.upsert_fund_aum_after_yield(uuid, date, numeric, aum_purpose, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_fund_aum_after_yield(uuid, date, numeric, aum_purpose, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rebuild_investor_period_balances(uuid, date, date, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rebuild_investor_period_balances(uuid, date, date, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.initialize_all_hwm_values() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initialize_all_hwm_values() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.nightly_aum_reconciliation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nightly_aum_reconciliation() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_investor_aum_percentages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_investor_aum_percentages(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.void_investor_yield_events_for_distribution(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_investor_yield_events_for_distribution(uuid, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.void_transaction_with_lock(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_transaction_with_lock(uuid, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.unvoid_transaction_with_lock(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unvoid_transaction_with_lock(uuid, uuid, text) TO authenticated, service_role;

-- Category: System checks
REVOKE ALL ON FUNCTION public.run_invariant_checks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_invariant_checks() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_integrity_check(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_integrity_check(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_integrity_pack() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_integrity_pack() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_comprehensive_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_comprehensive_health_check() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.run_daily_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_daily_health_check() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_daily_position_snapshot(date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_daily_position_snapshot(date, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_integrity_alert(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_integrity_alert(text, text, text, text, jsonb) TO authenticated, service_role;

-- Category: Trigger functions (defense-in-depth)
REVOKE ALL ON FUNCTION public.fn_ledger_drives_position() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ledger_drives_position() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cascade_void_from_transaction() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cascade_void_from_transaction() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cascade_void_to_yield_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cascade_void_to_yield_events() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_fees_account_zero_fee() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_fees_account_zero_fee() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_transaction_asset_match() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_transaction_asset_match() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_yield_distribution_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_yield_distribution_guard() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_allocation_immutable_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_allocation_immutable_fields() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_audit_immutable_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_audit_immutable_fields() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_audit_log_immutable_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_audit_log_immutable_fields() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.protect_transaction_immutable_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_transaction_immutable_fields() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_yield_to_investor_yield_events() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_yield_to_investor_yield_events() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_ib_account_type() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_ib_account_type() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_ib_allocations_from_commission_ledger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_ib_allocations_from_commission_ledger() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_yield_distribution_legacy_totals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_yield_distribution_legacy_totals() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_reporting_aum_to_transaction() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_reporting_aum_to_transaction() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.trigger_recompute_position() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_recompute_position() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_auto_aum_creation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_auto_aum_creation() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.auto_close_previous_fee_schedule() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_close_previous_fee_schedule() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.auto_close_previous_ib_schedule() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_close_previous_ib_schedule() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.alert_on_ledger_position_drift() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alert_on_ledger_position_drift() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_investor_last_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_investor_last_activity() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_investor_last_activity_withdrawal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_investor_last_activity_withdrawal() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_last_activity_on_statement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_last_activity_on_statement() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.populate_investor_fund_performance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.populate_investor_fund_performance(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.recompute_investor_positions_for_investor(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_investor_positions_for_investor(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_materialized_view_concurrently(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_materialized_view_concurrently(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_yield_materialized_views() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_yield_materialized_views() TO authenticated, service_role;

-- Category: Audit/logging
REVOKE ALL ON FUNCTION public.log_aum_position_mismatch() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_aum_position_mismatch() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.log_ledger_mismatches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_ledger_mismatches() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_ib_allocation_payout() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_ib_allocation_payout() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_delivery_result(uuid, boolean, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_delivery_result(uuid, boolean, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.build_error_response(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_error_response(text, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.build_success_response(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_success_response(jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.raise_platform_error(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.raise_platform_error(text, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.parse_platform_error(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parse_platform_error(text) TO authenticated, service_role;

-- Category: Validation/check helpers
REVOKE ALL ON FUNCTION public.check_all_funds_transaction_aum(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_all_funds_transaction_aum(date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_aum_exists_for_date(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_aum_exists_for_date(uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_aum_reconciliation(uuid, numeric, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_aum_reconciliation(uuid, numeric, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_concentration_risk() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_concentration_risk() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_duplicate_ib_allocations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_duplicate_ib_allocations() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_duplicate_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_duplicate_profile() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_duplicate_transaction_refs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_duplicate_transaction_refs() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_historical_lock(uuid, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_historical_lock(uuid, date, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_platform_data_integrity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_platform_data_integrity() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_transaction_sources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_transaction_sources() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cleanup_duplicate_preflow_aum() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_preflow_aum() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.compute_position_from_ledger(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_position_from_ledger(uuid, uuid, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_position_at_date_fix(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_position_at_date_fix(uuid, uuid, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_unrealized_pnl() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_unrealized_pnl() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_yield_allocations(uuid, numeric, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_yield_allocations(uuid, numeric, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calc_avg_daily_balance(uuid, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calc_avg_daily_balance(uuid, uuid, date, date) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_aum_matches_positions(uuid, date, numeric, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_aum_matches_positions(uuid, date, numeric, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_aum_matches_positions_strict(uuid, date, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_aum_matches_positions_strict(uuid, date, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_ib_parent_has_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_ib_parent_has_role() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_manual_aum_entry() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_manual_aum_entry() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_pre_yield_aum(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_pre_yield_aum(uuid, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_transaction_aum_exists(uuid, date, aum_purpose) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_transaction_aum_exists(uuid, date, aum_purpose) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_transaction_has_aum() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_transaction_has_aum() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_transaction_type() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_transaction_type() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_withdrawal_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_withdrawal_request() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_yield_distribution_prerequisites(uuid, date, numeric, text, numeric, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_yield_distribution_prerequisites(uuid, date, numeric, text, numeric, boolean, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_yield_parameters(uuid, date, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_yield_parameters(uuid, date, numeric, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_yield_temporal_lock(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_yield_temporal_lock(uuid, date, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.verify_yield_distribution_balance(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_yield_distribution_balance(uuid, date, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.require_super_admin(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_super_admin(text, uuid) TO authenticated, service_role;
-- ============================================================
-- FIX 2b: Supabase explicitly grants anon EXECUTE on all functions.
-- After REVOKE ALL FROM PUBLIC + GRANT TO authenticated, service_role,
-- anon still has its direct grant. Must explicitly revoke from anon.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_fund_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_paged_investor_summaries(integer, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_platform_flow_metrics(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_platform_aum() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fund_composition(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_funds_with_aum() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_balance(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_drift_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_health_trend(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_latest_health_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_position_reconciliation(date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_reporting_eligible_investors(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_statement_period_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_void_aum_impact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_void_transaction_impact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_void_yield_impact(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ib_parent_candidates(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dust_tolerance_for_fund(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fees_account_for_fund(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_existing_preflow_aum(uuid, date, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_name(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_system_mode() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_super_admin_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_import_enabled() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_crystallization_current(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_period_locked(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_within_edit_window(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_yield_period_closed(uuid, integer, integer, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_withdraw(uuid, uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution(uuid, numeric, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_yield_distribution_with_dust(uuid, numeric, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_yield_distribution_v5_with_lock(uuid, date, numeric, uuid, aum_purpose, date, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal_by_investor(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_fund_aum_baseline(text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_aum_to_positions(uuid, date, uuid, text, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_fund_aum_after_yield(uuid, date, numeric, aum_purpose, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rebuild_investor_period_balances(uuid, date, date, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.initialize_all_hwm_values() FROM anon;
REVOKE EXECUTE ON FUNCTION public.nightly_aum_reconciliation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_investor_aum_percentages(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_investor_yield_events_for_distribution(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.void_transaction_with_lock(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unvoid_transaction_with_lock(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_invariant_checks() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_integrity_check(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_integrity_pack() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_comprehensive_health_check() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_daily_health_check() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_daily_position_snapshot(date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_integrity_alert(text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_ledger_drives_position() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cascade_void_from_transaction() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cascade_void_to_yield_events() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_yield_to_investor_yield_events() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_fees_account_zero_fee() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_transaction_asset_match() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_yield_distribution_guard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_allocation_immutable_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_audit_immutable_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_audit_log_immutable_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_transaction_immutable_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_ib_account_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_ib_allocations_from_commission_ledger() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_yield_distribution_legacy_totals() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_reporting_aum_to_transaction() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_recompute_position() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_auto_aum_creation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_close_previous_fee_schedule() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_close_previous_ib_schedule() FROM anon;
REVOKE EXECUTE ON FUNCTION public.alert_on_ledger_position_drift() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_investor_last_activity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_investor_last_activity_withdrawal() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_last_activity_on_statement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.populate_investor_fund_performance(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recompute_investor_positions_for_investor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_materialized_view_concurrently(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_yield_materialized_views() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_aum_position_mismatch() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_ledger_mismatches() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_ib_allocation_payout() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_delivery_result(uuid, boolean, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.build_error_response(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.build_success_response(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.raise_platform_error(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.parse_platform_error(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calc_avg_daily_balance(uuid, uuid, date, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_position_at_date_fix(uuid, uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_unrealized_pnl() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_yield_allocations(uuid, numeric, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_all_funds_transaction_aum(date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_aum_exists_for_date(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_aum_reconciliation(uuid, numeric, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_concentration_risk() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_duplicate_ib_allocations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_duplicate_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_duplicate_transaction_refs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_historical_lock(uuid, date, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_platform_data_integrity() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_transaction_sources() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_duplicate_preflow_aum() FROM anon;
REVOKE EXECUTE ON FUNCTION public.compute_position_from_ledger(uuid, uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_integrity_alert(text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_aum_matches_positions(uuid, date, numeric, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_aum_matches_positions_strict(uuid, date, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_ib_parent_has_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_manual_aum_entry() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_pre_yield_aum(uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_aum_exists(uuid, date, aum_purpose) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_has_aum() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_transaction_type() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_withdrawal_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_yield_distribution_prerequisites(uuid, date, numeric, text, numeric, boolean, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_yield_parameters(uuid, date, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_yield_temporal_lock(uuid, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_yield_distribution_balance(uuid, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.require_super_admin(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_document_path(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_statement_path(uuid, integer, integer, text) FROM anon;