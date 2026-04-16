-- ============================================================
-- Financial Logic P2 Fixes
-- Date: 2026-04-16
-- ============================================================
-- FL-5: run_invariant_checks() Check 3 — remove purpose='reporting' filter
--       so yield conservation covers ALL distributions including
--       purpose='transaction' (from crystallize_yield_before_flow)
-- FL-7: void_transaction() — remove duplicate set_config calls
--       (lines 17582-17583 in squash baseline were redundant)
-- FL-1: Mark V3 yield functions as DEPRECATED
-- FL-8: Add security_invoker='on' to 3 reconciliation views
-- ============================================================

-- FL-5: Fix run_invariant_checks Check 3 to cover all purposes
CREATE OR REPLACE FUNCTION "public"."run_invariant_checks"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_check_result JSONB;
  v_checks JSONB[] := '{}';
  v_passed_count INT := 0;
  v_failed_count INT := 0;
  v_total_checks INT := 16;
  v_violations JSONB;
  v_violation_count INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can run invariant checks';
  END IF;

  -- Check 1: position_matches_ledger
  WITH position_ledger AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value, 0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as ledger_sum,
      COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as drift
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM position_ledger;
  v_checks := v_checks || jsonb_build_object('name','position_matches_ledger','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 2: fund_aum_matches_positions (informational)
  v_violations := '[]'::jsonb;
  v_violation_count := 0;
  v_checks := v_checks || jsonb_build_object('name','fund_aum_matches_positions','category','core','passed',true,'violation_count',0,'violations',v_violations, 'note', 'AUM is dynamically derived from positions.');
  v_passed_count := v_passed_count + 1;

  -- Check 3: yield_conservation (FL-5: removed purpose='reporting' filter)
  WITH conservation AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date, yd.gross_yield,
      (SELECT COALESCE(SUM(net_amount),0) FROM yield_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_net,
      (SELECT COALESCE(SUM(fee_amount),0) FROM fee_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_fees,
      (SELECT COALESCE(SUM(ib_fee_amount),0) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_ib
    FROM yield_distributions yd
    WHERE yd.is_voided = false AND yd.gross_yield > 0
      AND yd.gross_yield_amount IS NOT NULL
  ),
  violations AS (
    SELECT distribution_id, fund_id, effective_date, gross_yield,
           sum_net + sum_fees + sum_ib as sum_parts,
           gross_yield - (sum_net + sum_fees + sum_ib) as drift
    FROM conservation WHERE ABS(gross_yield - (sum_net + sum_fees + sum_ib)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date,
    'gross_yield', gross_yield, 'sum_parts', sum_parts, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM violations;
  v_checks := v_checks || jsonb_build_object('name','yield_conservation','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 4: no_negative_positions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id, 'balance', current_value
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions WHERE current_value < -0.000001;
  v_checks := v_checks || jsonb_build_object('name','no_negative_positions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 5: no_orphaned_transactions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'transaction_id', t.id, 'investor_id', t.investor_id, 'fund_id', t.fund_id, 'type', t.type, 'amount', t.amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t
  LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
  WHERE t.is_voided = false AND ip.id IS NULL;
  v_checks := v_checks || jsonb_build_object('name','no_orphaned_transactions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 6: ib_ledger_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', ib.investor_id, 'fund_id', ib.fund_id,
    'ledger_balance', ib_balance, 'position_value', ip.current_value
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM (
    SELECT investor_id, fund_id, SUM(ib_fee_amount) as ib_balance
    FROM ib_commission_ledger WHERE is_voided = false GROUP BY investor_id, fund_id
  ) ib
  JOIN investor_positions ip ON ip.investor_id = ib.investor_id AND ip.fund_id = ib.fund_id
  WHERE ABS(ib.ib_balance - ip.current_value) > 0.000001;
  v_checks := v_checks || jsonb_build_object('name','ib_ledger_consistency','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 7: fee_allocation_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', fa.distribution_id, 'fund_id', fa.fund_id,
    'fee_amount', fa.fee_amount, 'status', fa.status
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM fee_allocations fa
  LEFT JOIN yield_distributions yd ON yd.id = fa.distribution_id
  WHERE fa.is_voided = false AND yd.id IS NULL;
  v_checks := v_checks || jsonb_build_object('name','fee_allocation_consistency','category','fees','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 8: yield_allocation_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ya.distribution_id, 'investor_id', ya.investor_id,
    'fund_id', ya.fund_id, 'net_amount', ya.net_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_allocations ya
  LEFT JOIN yield_distributions yd ON yd.id = ya.distribution_id
  WHERE ya.is_voided = false AND yd.id IS NULL;
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
      OR EXISTS (SELECT 1 FROM yield_allocations WHERE credit_transaction_id = t.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM ib_commission_ledger WHERE credit_transaction_id = t.id AND is_voided = false)
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

  -- Check 11: duplicate_transactions_check
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', t1.investor_id, 'fund_id', t1.fund_id, 'type', t1.type,
    'amount', t1.amount, 'tx_date', t1.tx_date, 'count', dupes.cnt
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t1
  JOIN (
    SELECT investor_id, fund_id, type, amount, tx_date, COUNT(*) as cnt
    FROM transactions_v2 WHERE is_voided = false
    GROUP BY investor_id, fund_id, type, amount, tx_date HAVING COUNT(*) > 1
  ) dupes ON dupes.investor_id = t1.investor_id AND dupes.fund_id = t1.fund_id
    AND dupes.type = t1.type AND dupes.amount = t1.amount AND dupes.tx_date = t1.tx_date
  WHERE t1.is_voided = false;
  v_checks := v_checks || jsonb_build_object('name','duplicate_transactions_check','category','validation','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 12: ib_allocation_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ia.distribution_id, 'investor_id', ia.investor_id,
    'fund_id', ia.fund_id, 'ib_fee_amount', ia.ib_fee_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM ib_allocations ia
  LEFT JOIN yield_distributions yd ON yd.id = ia.distribution_id
  WHERE ia.is_voided = false AND yd.id IS NULL;
  v_checks := v_checks || jsonb_build_object('name','ib_allocation_consistency','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 13: position_ledger_drift
  WITH position_ledger AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value, 0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as ledger_sum,
      COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as drift
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM position_ledger WHERE ABS(drift) BETWEEN 0.000001 AND 0.01;
  v_checks := v_checks || jsonb_build_object('name','position_ledger_drift','category','drift','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 14: crystallization_integrity
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'transaction_id', t.id, 'investor_id', t.investor_id, 'fund_id', t.fund_id,
    'crystallization_amount', t.crystallization_amount, 'amount', t.amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t
  WHERE t.is_voided = false AND t.crystallization_amount IS NOT NULL
    AND t.crystallization_amount != 0 AND ABS(t.amount) < ABS(t.crystallization_amount);
  v_checks := v_checks || jsonb_build_object('name','crystallization_integrity','category','crystallization','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 15: voided_distribution_no_active_allocations
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id, 'fund_id', yd.fund_id, 'purpose', yd.purpose
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_distributions yd
  WHERE yd.is_voided = true
    AND (
      EXISTS (SELECT 1 FROM yield_allocations WHERE distribution_id = yd.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM fee_allocations WHERE distribution_id = yd.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM ib_allocations WHERE distribution_id = yd.id AND is_voided = false)
    );
  v_checks := v_checks || jsonb_build_object('name','voided_distribution_no_active_allocations','category','validation','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 16: aum_purpose_coverage
  WITH purpose_stats AS (
    SELECT fund_id, purpose, COUNT(*) as dist_count
    FROM yield_distributions WHERE is_voided = false
    GROUP BY fund_id, purpose
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'purpose', purpose, 'distribution_count', dist_count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM purpose_stats
  WHERE purpose NOT IN ('reporting', 'transaction');
  v_checks := v_checks || jsonb_build_object('name','aum_purpose_coverage','category','aum','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  RETURN jsonb_build_object(
    'total_checks', v_total_checks,
    'passed', v_passed_count,
    'failed', v_failed_count,
    'checks', v_checks
  );
END;
$$;

ALTER FUNCTION "public"."run_invariant_checks"() OWNER TO "postgres";


-- FL-7: void_transaction — remove duplicate set_config (keep only the first set before admin check)
CREATE OR REPLACE FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided INT := 0;
  v_daily_aum_voided INT := 0;
  v_fee_allocations_voided INT := 0;
  v_ib_ledger_voided INT := 0;
  v_platform_fee_voided INT := 0;
  v_yield_events_voided INT := 0;
  v_distributions_voided INT := 0;
  v_result JSONB;
  v_affected_dist RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::TEXT));

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  UPDATE public.transactions_v2
  SET is_voided = TRUE,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
        updated_at = NOW()
    WHERE fund_id = v_tx.fund_id AND is_voided = FALSE
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
            OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL
                AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  UPDATE public.fund_daily_aum
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT,
      updated_at = NOW()
  WHERE fund_id = v_tx.fund_id AND is_voided = FALSE AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  PERFORM public.recalculate_fund_aum_for_date(
    v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
  );

  UPDATE public.fee_allocations
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE public.ib_commission_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE credit_transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fees
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  UPDATE public.investor_yield_events
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  FOR v_affected_dist IN
    SELECT id, fund_id, effective_date, gross_yield
    FROM public.yield_distributions
    WHERE credit_transaction_id = p_transaction_id AND is_voided = FALSE
  LOOP
    UPDATE public.yield_distributions
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
    WHERE id = v_affected_dist.id;
    v_distributions_voided := v_distributions_voided + 1;

    UPDATE public.yield_allocations
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE distribution_id = v_affected_dist.id AND is_voided = FALSE;

    UPDATE public.fee_allocations
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE distribution_id = v_affected_dist.id AND is_voided = FALSE;

    UPDATE public.ib_allocations
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id
    WHERE distribution_id = v_affected_dist.id AND is_voided = FALSE;
  END LOOP;

  PERFORM public.recalculate_investor_position(v_tx.investor_id, v_tx.fund_id);

  v_result := jsonb_build_object(
    'transaction_id', p_transaction_id,
    'aum_events_voided', v_aum_events_voided,
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided,
    'yield_events_voided', v_yield_events_voided,
    'distributions_voided', v_distributions_voided
  );

  RETURN v_result;
END;
$$;

ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


-- FL-1: Mark V3 yield functions as DEPRECATED
COMMENT ON FUNCTION "public"."apply_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_recorded_aum" numeric) IS 'DEPRECATED: Use apply_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';
COMMENT ON FUNCTION "public"."preview_adb_yield_distribution_v3"("p_fund_id" "uuid", "p_period_start" "date", "p_period_end" "date", "p_gross_yield_amount" numeric, "p_purpose" "text") IS 'DEPRECATED: Use preview_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';
COMMENT ON FUNCTION "public"."preview_daily_yield_to_fund_v3"("p_fund_id" "uuid", "p_yield_date" "date", "p_new_aum" numeric, "p_purpose" "text") IS 'DEPRECATED: Use preview_segmented_yield_distribution_v5 instead. V3 is dead code on the frontend path.';


-- FL-8: Add security_invoker to reconciliation views
ALTER VIEW "public"."v_fee_calculation_orphans" SET (security_invoker = on);
ALTER VIEW "public"."v_ledger_position_mismatches" SET (security_invoker = on);
ALTER VIEW "public"."v_orphaned_transactions" SET (security_invoker = on);