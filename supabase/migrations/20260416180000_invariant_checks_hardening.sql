-- =============================================================
-- Invariant checks hardening: Fix Check 2 + Add Checks 17-20
-- 2026-04-16 | P0-5+6 from cross-domain audit
--
-- Check 2: Replace informational placeholder with actual
--   fund_daily_aum.total_aum = SUM(investor_positions.current_value)
-- Check 17: Yield idempotency — no duplicate (fund_id, period, purpose)
-- Check 18: Transaction reference_id uniqueness
-- Check 19: Balance chain — current_value = cost_basis + cumulative_yield_earned
-- Check 20: Fee conservation — platform_fees match fee_pct * gross_yield
-- =============================================================

CREATE OR REPLACE FUNCTION public.run_invariant_checks()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check_result JSONB;
  v_checks JSONB[] := '{}';
  v_passed_count INT := 0;
  v_failed_count INT := 0;
  v_total_checks INT := 20;
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

  -- Check 2: fund_aum_matches_positions (ACTUAL — was informational)
  WITH aum_vs_positions AS (
    SELECT fda.fund_id, fda.aum_date, fda.total_aum,
      COALESCE(SUM(ip.current_value), 0) as position_sum,
      fda.total_aum - COALESCE(SUM(ip.current_value), 0) as drift
    FROM fund_daily_aum fda
    JOIN funds f ON f.id = fda.fund_id AND f.status = 'active'
    LEFT JOIN investor_positions ip ON ip.fund_id = fda.fund_id AND ip.is_active = true
    WHERE fda.is_voided = false
      AND fda.aum_date = (SELECT MAX(aum_date) FROM fund_daily_aum WHERE is_voided = false)
    GROUP BY fda.fund_id, fda.aum_date, fda.total_aum
    HAVING ABS(fda.total_aum - COALESCE(SUM(ip.current_value), 0)) > 0.01
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'aum_date', aum_date,
    'total_aum', total_aum, 'position_sum', position_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM aum_vs_positions;
  v_checks := v_checks || jsonb_build_object('name','fund_aum_matches_positions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 3: yield_conservation
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

  -- Check 17: yield_idempotency — no duplicate non-voided distributions for same fund/period/purpose
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'period_end', period_end,
    'purpose', purpose, 'duplicate_count', dup_count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM (
    SELECT fund_id, effective_date as period_end, purpose, COUNT(*) as dup_count
    FROM yield_distributions
    WHERE is_voided = false
    GROUP BY fund_id, effective_date, purpose
    HAVING COUNT(*) > 1
  ) dupes;
  v_checks := v_checks || jsonb_build_object('name','yield_idempotency','category','yield','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 18: transaction_reference_id_uniqueness
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'reference_id', reference_id, 'count', dup_count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM (
    SELECT reference_id, COUNT(*) as dup_count
    FROM transactions_v2
    WHERE is_voided = false AND reference_id IS NOT NULL
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) dupes;
  v_checks := v_checks || jsonb_build_object('name','transaction_reference_id_uniqueness','category','validation','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 19: balance_chain — current_value = cost_basis + cumulative_yield_earned
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'current_value', current_value, 'cost_basis', cost_basis,
    'cumulative_yield_earned', cumulative_yield_earned,
    'expected', cost_basis + cumulative_yield_earned,
    'drift', current_value - (cost_basis + cumulative_yield_earned)
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM investor_positions
  WHERE is_active = true
    AND ABS(current_value - (COALESCE(cost_basis, 0) + COALESCE(cumulative_yield_earned, 0))) > 0.01;
  v_checks := v_checks || jsonb_build_object('name','balance_chain_integrity','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 20: fee_conservation — verify platform fees match fee_pct * distribution gross_yield
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', yd.id, 'fund_id', yd.fund_id,
    'gross_yield', yd.gross_yield, 'total_fees', fee_total,
    'expected_fee_pct', fee_pct, 'drift', drift
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM yield_distributions yd
  JOIN LATERAL (
    SELECT COALESCE(SUM(fa.fee_amount), 0) as fee_total,
      COALESCE(get_investor_fee_pct(yd.created_by, yd.fund_id, yd.effective_date), 0) as fee_pct
  ) fees ON true
  CROSS JOIN LATERAL (
    SELECT ABS(yd.gross_yield * fees.fee_pct / 100 - fees.fee_total) as drift
  ) calc
  WHERE yd.is_voided = false
    AND yd.gross_yield > 0
    AND drift > 0.01;
  v_checks := v_checks || jsonb_build_object('name','fee_conservation','category','fees','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  RETURN jsonb_build_object(
    'total_checks', v_total_checks,
    'passed', v_passed_count,
    'failed', v_failed_count,
    'checks', v_checks
  );
END;
$function$;