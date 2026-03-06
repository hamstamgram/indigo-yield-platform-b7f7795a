-- Fix: Semantic bug in run_invariant_checks() check 12 (statement_periods_have_distributions)
--
-- BUG: Check 12 filters statement_periods with:
--   WHERE (sp.status IS NULL OR sp.status NOT IN ('archived'))
-- But statement_periods.status has a CHECK constraint allowing ONLY 'DRAFT' or 'FINALIZED'.
-- 'archived' is impossible, making the filter equivalent to WHERE true (always passes).
-- This means ALL statement periods (including DRAFT ones) are checked, but DRAFT periods
-- have not closed yet and naturally have no distributions - this is not a violation.
--
-- FIX: Change to WHERE sp.status = 'FINALIZED' so only closed periods are required
-- to have yield distributions.

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
  v_is_admin BOOLEAN;
BEGIN
  -- Security: Only admins can run this
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = auth.uid();

  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RAISE EXCEPTION 'Access denied: Only administrators can run invariant checks';
  END IF;

  -- ========== CORE CHECK 1: position_matches_ledger ==========
  WITH position_ledger AS (
    SELECT
      ip.investor_id,
      ip.fund_id,
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
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM position_ledger;

  v_checks := v_checks || jsonb_build_object('name','position_matches_ledger','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== CORE CHECK 2: fund_aum_matches_positions ==========
  -- Fixed: filter transaction-purpose AUM only, is_active positions only,
  -- and only compare when AUM snapshot is from today (same-day only).
  -- Stale AUM snapshots naturally diverge from live positions and are not violations.
  WITH latest_aum AS (
    SELECT DISTINCT ON (fund_id) fund_id, total_aum, aum_date
    FROM fund_daily_aum
    WHERE is_voided = false
      AND purpose = 'transaction'
    ORDER BY fund_id, aum_date DESC
  ),
  pos_sums AS (
    SELECT fund_id, SUM(COALESCE(current_value, 0)) as position_sum
    FROM investor_positions
    WHERE is_active = true
    GROUP BY fund_id
  ),
  aum_check AS (
    SELECT a.fund_id, a.total_aum as aum_value, COALESCE(p.position_sum, 0) as position_sum,
           a.total_aum - COALESCE(p.position_sum, 0) as drift,
           a.aum_date
    FROM latest_aum a LEFT JOIN pos_sums p ON p.fund_id = a.fund_id
    WHERE a.aum_date = CURRENT_DATE
      AND ABS(a.total_aum - COALESCE(p.position_sum, 0)) > 0.01
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'aum_value', aum_value, 'position_sum', position_sum,
    'drift', drift, 'aum_date', aum_date
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM aum_check;

  v_checks := v_checks || jsonb_build_object('name','fund_aum_matches_positions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== CORE CHECK 3: yield_conservation ==========
  -- Exclude crystallization distributions (gross_yield_amount IS NULL)
  WITH conservation AS (
    SELECT
      yd.id as distribution_id, yd.fund_id, yd.effective_date, yd.gross_yield,
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
    FROM conservation
    WHERE ABS(gross_yield - (sum_net + sum_fees + sum_ib)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date,
    'gross_yield', gross_yield, 'sum_parts', sum_parts, 'drift', drift
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM violations;

  v_checks := v_checks || jsonb_build_object('name','yield_conservation','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== CORE CHECK 4: no_negative_positions ==========
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id, 'balance', current_value
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM investor_positions WHERE current_value < -0.000001;

  v_checks := v_checks || jsonb_build_object('name','no_negative_positions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== CORE CHECK 5: no_orphan_transactions ==========
  WITH orphans AS (
    SELECT t.id as tx_id, t.investor_id, t.fund_id, t.type, t.amount
    FROM transactions_v2 t
    LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
    WHERE t.is_voided = false AND t.investor_id IS NOT NULL AND ip.investor_id IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', tx_id, 'investor_id', investor_id, 'fund_id', fund_id, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM orphans;

  v_checks := v_checks || jsonb_build_object('name','no_orphan_transactions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== IB CHECK 6: ib_position_matches_ledger ==========
  WITH ib_check AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value,0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as ledger_sum,
      COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as drift
    FROM investor_positions ip
    INNER JOIN profiles p ON p.id = ip.investor_id AND p.account_type = 'ib'
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM ib_check;

  v_checks := v_checks || jsonb_build_object('name','ib_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== IB CHECK 7: fee_position_matches_ledger ==========
  WITH fee_check AS (
    SELECT ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value,0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as ledger_sum,
      COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0) as drift
    FROM investor_positions ip
    INNER JOIN profiles p ON p.id = ip.investor_id AND p.account_type = 'fees_account'
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(COALESCE(ip.current_value,0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided=false),0)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id,
    'position_balance', position_balance, 'ledger_sum', ledger_sum, 'drift', drift
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM fee_check;

  v_checks := v_checks || jsonb_build_object('name','fee_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== IB CHECK 8: ib_allocation_count_matches ==========
  -- Exclude crystallizations (no gross_yield_amount) and only expect IB allocations
  -- for investors with ib_percentage > 0
  WITH ib_count AS (
    SELECT yd.id as distribution_id,
      (SELECT COUNT(*) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as ib_alloc_count,
      (SELECT COUNT(*) FROM yield_allocations ya
       WHERE ya.distribution_id=yd.id AND ya.is_voided=false
         AND EXISTS(SELECT 1 FROM profiles p WHERE p.id=ya.investor_id AND p.ib_parent_id IS NOT NULL AND p.ib_percentage > 0)
      ) as expected_count
    FROM yield_distributions yd
    WHERE yd.is_voided=false AND yd.gross_yield>0
      AND yd.gross_yield_amount IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'ib_alloc_count', ib_alloc_count, 'expected_count', expected_count
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM ib_count WHERE ib_alloc_count != expected_count;

  v_checks := v_checks || jsonb_build_object('name','ib_allocation_count_matches','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== IB CHECK 9: no_duplicate_ib_allocations ==========
  WITH dup_ib AS (
    SELECT ib_investor_id, distribution_id, COUNT(*) as count
    FROM ib_allocations WHERE is_voided=false
    GROUP BY ib_investor_id, distribution_id HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ib_investor_id', ib_investor_id, 'distribution_id', distribution_id, 'count', count
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM dup_ib;

  v_checks := v_checks || jsonb_build_object('name','no_duplicate_ib_allocations','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== TEMPORAL CHECK 10: no_future_transactions ==========
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', id, 'tx_date', tx_date, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM transactions_v2 WHERE is_voided=false AND tx_date > CURRENT_DATE;

  v_checks := v_checks || jsonb_build_object('name','no_future_transactions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== TEMPORAL CHECK 11: no_duplicate_distributions ==========
  WITH dup_dist AS (
    SELECT fund_id, effective_date, purpose, COUNT(*) as count
    FROM yield_distributions WHERE is_voided=false
    GROUP BY fund_id, effective_date, purpose HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'effective_date', effective_date, 'purpose', purpose, 'count', count
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM dup_dist;

  v_checks := v_checks || jsonb_build_object('name','no_duplicate_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== TEMPORAL CHECK 12: statement_periods_have_distributions ==========
  -- Fixed: only FINALIZED periods require distributions.
  -- (Previous filter used NOT IN ('archived') but 'archived' is impossible per CHECK constraint;
  -- the filter was effectively WHERE true, incorrectly including DRAFT periods.)
  WITH missing_periods AS (
    SELECT sp.id as period_id, sp.period_name
    FROM statement_periods sp
    WHERE sp.status = 'FINALIZED'
      AND sp.period_end_date >= '2026-01-01'
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.is_voided=false
          AND yd.effective_date BETWEEN DATE_TRUNC('month', sp.period_end_date)::date AND sp.period_end_date
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'period_id', period_id, 'period_name', period_name
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM missing_periods;

  v_checks := v_checks || jsonb_build_object('name','statement_periods_have_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== TEMPORAL CHECK 13: audit_log_for_distributions ==========
  -- Exclude crystallizations (no gross_yield_amount)
  WITH missing_audit AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date
    FROM yield_distributions yd
    WHERE yd.is_voided=false
      AND yd.gross_yield_amount IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM audit_log al
        WHERE al.entity_id = yd.id::text
          AND (al.action ILIKE '%yield%' OR al.action ILIKE '%adb%')
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM missing_audit;

  v_checks := v_checks || jsonb_build_object('name','audit_log_for_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== SECURITY CHECK 14: all_tables_have_rls ==========
  SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', tablename)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;

  v_checks := v_checks || jsonb_build_object('name','all_tables_have_rls','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== SECURITY CHECK 15: no_invalid_admin_accounts ==========
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', id, 'account_type', account_type)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM profiles WHERE is_admin=true AND account_type IS NOT NULL AND account_type != 'investor';

  v_checks := v_checks || jsonb_build_object('name','no_invalid_admin_accounts','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== SECURITY CHECK 16: no_orphan_auth_users ==========
  WITH orphans AS (
    SELECT au.id as user_id, au.email
    FROM auth.users au LEFT JOIN profiles p ON p.id = au.id
    WHERE p.id IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', user_id, 'email', email)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM orphans;

  v_checks := v_checks || jsonb_build_object('name','no_orphan_auth_users','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Build final result
  RETURN jsonb_build_object(
    'run_at', NOW(),
    'total_checks', v_total_checks,
    'passed', v_passed_count,
    'failed', v_failed_count,
    'checks', (SELECT jsonb_agg(c) FROM unnest(v_checks) AS c)
  );
END;
$$;
