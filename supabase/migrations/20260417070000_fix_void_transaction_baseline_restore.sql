-- ============================================================
-- P0 FIX: Restore void_transaction from baseline + fix Check 9
-- Date: 2026-04-17
-- ============================================================
-- The p2_fixes migration (FL-7) introduced a broken void_transaction
-- with 4 critical column/table reference errors:
--
-- 1. ib_commission_ledger.credit_transaction_id → should be transaction_id
-- 2. platform_fees (non-existent table) → should be platform_fee_ledger
-- 3. investor_yield_events.transaction_id → should be trigger_transaction_id/reference_id
-- 4. yield_distributions.credit_transaction_id → should use distribution_id from v_tx
--
-- Additionally, the baseline has a v6 yield_distribution cascade that
-- the p2_fixes version simplified incorrectly.
--
-- Also fixes: run_invariant_checks Check 9 has same credit_transaction_id
-- reference error on ib_commission_ledger.
-- ============================================================

-- ============================================================
-- FIX 1: Restore void_transaction from squash baseline (v6 cascade)
-- ============================================================
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
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
    WHERE fund_id = v_tx.fund_id AND is_voided = FALSE
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
            OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL
                AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  UPDATE public.fund_daily_aum
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
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
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fee_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  UPDATE public.investor_yield_events
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id
  WHERE (trigger_transaction_id = p_transaction_id
         OR reference_id = v_tx.reference_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- P0 FIX: Cascade void to orphaned yield_distributions
  IF v_tx.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE yield_distributions
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: all yield transactions voided from tx ' || p_transaction_id::TEXT
    WHERE id = v_tx.distribution_id
      AND is_voided = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.distribution_id = v_tx.distribution_id
          AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
          AND t.is_voided = FALSE
          AND t.id != p_transaction_id
      );
    GET DIAGNOSTICS v_distributions_voided = ROW_COUNT;
  END IF;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    FOR v_affected_dist IN
      SELECT yd.id FROM yield_distributions yd
      WHERE yd.fund_id = v_tx.fund_id
        AND yd.is_voided = FALSE
        AND yd.purpose = 'transaction'
        AND NOT EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = FALSE
        )
        AND EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = TRUE
        )
    LOOP
      UPDATE yield_distributions
      SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
          voided_by_profile_id = p_admin_id,
          void_reason = 'Cascade void: source ' || v_tx.type || ' ' || p_transaction_id::TEXT || ' voided, all yield txs orphaned'
      WHERE id = v_affected_dist.id;
      v_distributions_voided := v_distributions_voided + 1;
    END LOOP;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID', 'transactions_v2', p_transaction_id::TEXT, p_admin_id,
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'type', v_tx.type, 'amount', v_tx.amount),
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'void_reason', p_reason, 'voided_at', NOW(),
      'aum_events_voided', v_aum_events_voided,
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'distributions_voided', v_distributions_voided
    ),
    JSONB_BUILD_OBJECT(
      'source', 'void_transaction_rpc', 'cascade_v6', TRUE,
      'aum_recalculated', TRUE, 'isolation_model', 'advisory_xact_lock',
      'yield_distribution_cascade', TRUE
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_events_voided', v_aum_events_voided,
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided,
    'yield_events_voided', v_yield_events_voided,
    'distributions_voided', v_distributions_voided,
    'message', 'Transaction voided atomically with full cascade, yield distribution cascade, and AUM recalculation'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'Full cascade void: transactions_v2, fund_aum_events, fund_daily_aum, fee_allocations,
ib_commission_ledger, platform_fee_ledger, investor_yield_events, yield_distributions.
Recalculates AUM. Concurrency: pg_advisory_xact_lock on transaction ID (auto-release at tx end).
v6.0 (2026-04-17): Restored from baseline — fixed credit_transaction_id → transaction_id on ib_commission_ledger,
platform_fees → platform_fee_ledger, investor_yield_events.transaction_id → trigger_transaction_id/reference_id,
yield_distributions uses distribution_id from v_tx (not credit_transaction_id). Added P0 yield_distribution cascade.';


-- ============================================================
-- FIX 2: run_invariant_checks Check 9 — fix ib_commission_ledger.credit_transaction_id → transaction_id
-- ============================================================
-- The Check 9 in run_invariant_checks references ib_commission_ledger.credit_transaction_id
-- which does not exist. The correct column is transaction_id.
-- We need to recreate the full function since it's a single statement inside.
-- ============================================================

-- Read the current run_invariant_checks and replace only the affected line.
-- Since this is a large function, we use a targeted CREATE OR REPLACE.
-- We pull the definition from the most recent version (20260416180000 hardening + 20260416190000 dead cleanup).

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

  -- Check 3: yield_allocation_sum_matches_distribution (all purposes)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ya.distribution_id, 'total_allocated', SUM(ya.net_yield_amount)
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_allocations ya
  WHERE ya.is_voided = false
  GROUP BY ya.distribution_id
  HAVING ABS(SUM(ya.net_yield_amount) - COALESCE((SELECT yd2.total_net_amount FROM yield_distributions yd2 WHERE yd2.id = ya.distribution_id), 0)) > 0.01;
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
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ia.distribution_id, 'source_investor_id', ia.source_investor_id,
    'ib_id', ia.ib_id, 'ib_amount', ia.ib_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM ib_allocations ia
  WHERE ia.is_voided = false
    AND ia.ib_amount < 0;
  v_checks := v_checks || jsonb_build_object('name','ib_allocation_consistency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 8: yield_allocation_consistency
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', ya.distribution_id, 'investor_id', ya.investor_id,
    'net_yield_amount', ya.net_yield_amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_allocations ya
  WHERE ya.is_voided = false
    AND ya.net_yield_amount < 0;
  v_checks := v_checks || jsonb_build_object('name','yield_allocation_consistency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 9: voided_transaction_no_active_allocations
  -- FIXED: ib_commission_ledger uses transaction_id, NOT credit_transaction_id
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'transaction_id', t.id, 'type', t.type
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND (
      EXISTS (SELECT 1 FROM fee_allocations WHERE credit_transaction_id = t.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM fee_allocations WHERE debit_transaction_id = t.id AND is_voided = false)
      OR EXISTS (SELECT 1 FROM yield_allocations WHERE credit_transaction_id = t.id AND is_voided = false)
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

  -- Check 11: duplicate_transactions_check
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
  WITH ledger_totals AS (
    SELECT t.investor_id, t.fund_id,
      SUM(CASE WHEN t.type IN ('DEPOSIT','YIELD','FEE_CREDIT','IB_CREDIT','DUST_SWEEP') THEN t.amount ELSE 0 END) -
      SUM(CASE WHEN t.type IN ('WITHDRAWAL','FEE_DEBIT') THEN t.amount ELSE 0 END) AS net_balance
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

COMMENT ON FUNCTION "public"."run_invariant_checks"() IS 'Invariant checks for data consistency. Fixed Check 9: ib_commission_ledger.transaction_id instead of credit_transaction_id.';