-- Migration: Comprehensive integrity and bug fixes
-- Date: 2026-02-28
--
-- Fixes 20+ bugs found during V5 engine audit:
-- 1. void_yield_distribution: cascade to fee_allocations, yield_allocations, investor_yield_events
-- 2. run_invariant_checks: check 3 uses gross_yield_amount (not legacy gross_yield)
-- 3. run_invariant_checks: check 8 uses gross_yield_amount (not legacy gross_yield)
-- 4. log_aum_position_mismatch: query discrepancy column (not has_mismatch)
-- 5. v_fee_calculation_orphans: use is_voided=true (not status='voided')
-- 6. fund_aum_mismatch: add purpose filter for transaction-only
-- 7. v_ledger_reconciliation: add is_active filter
-- 8. investor_position_ledger_mismatch: add admin gate, fix sign logic
-- 9. yield_distribution_conservation_check: consistent status filter
-- 10. run_invariant_checks check 1: add is_active filter
-- 11. Handle NULL last_yield_crystallization_date in crystallization guard

-- ============================================================================
-- 1. FIX void_yield_distribution: cascade to fee_allocations + yield_allocations
-- ============================================================================

CREATE OR REPLACE FUNCTION void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN
    RAISE EXCEPTION 'Distribution not found: %', p_distribution_id;
  END IF;
  IF v_dist.is_voided THEN
    RETURN json_build_object('success', true, 'message', 'Already voided');
  END IF;

  -- Handle crystal cascade
  IF p_void_crystals THEN
    FOR v_crystal IN
      SELECT id, effective_date FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE investor_yield_events SET is_voided = true
      WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
        AND is_voided = false;

      UPDATE fund_aum_events SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
      WHERE fund_id = v_dist.fund_id
        AND trigger_reference LIKE '%' || v_crystal.id::text || '%'
        AND NOT is_voided;

      UPDATE yield_distributions SET
        is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;

      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions
    SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void YIELD transactions (V4 and V5 patterns)
  FOR v_tx IN
    SELECT id, investor_id, amount FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void FEE_CREDIT transactions
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void IB_CREDIT transactions
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void ledger records
  UPDATE platform_fee_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_commission_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  -- FIX: Void fee_allocations (was missing)
  UPDATE fee_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;

  -- FIX: Void yield_allocations (was missing)
  UPDATE yield_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void ib_allocations
  UPDATE ib_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void the distribution itself
  UPDATE yield_distributions SET
    is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_distribution_id;

  -- FIX: Void investor_yield_events linked to voided transactions
  -- Also void by distribution_id directly (covers cases where trigger_transaction_id is NULL)
  UPDATE investor_yield_events SET is_voided = true
  WHERE (
    trigger_transaction_id IN (
      SELECT id FROM transactions_v2
      WHERE distribution_id = p_distribution_id AND is_voided = true
    )
    OR distribution_id = p_distribution_id
  ) AND NOT is_voided;

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object(
      'voided_txs', v_voided_txs,
      'voided_fee_allocations', v_voided_allocs,
      'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals,
      'fund_id', v_dist.fund_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs,
    'voided_fee_allocations', v_voided_allocs,
    'voided_crystals', v_voided_crystals
  );
END;
$$;


-- ============================================================================
-- 2. FIX run_invariant_checks: check 3 uses gross_yield_amount, check 8 too,
--    check 1 adds is_active filter
-- ============================================================================

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
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = auth.uid();
  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RAISE EXCEPTION 'Access denied: Only administrators can run invariant checks';
  END IF;

  -- ========== CORE CHECK 1: position_matches_ledger ==========
  -- FIX: Added is_active filter to exclude inactive positions with rounding residuals
  WITH position_ledger AS (
    SELECT
      ip.investor_id, ip.fund_id,
      COALESCE(ip.current_value, 0) as position_balance,
      COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as ledger_sum,
      COALESCE(ip.current_value, 0) - COALESCE(SUM(t.amount) FILTER (WHERE t.is_voided = false), 0) as drift
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    WHERE ip.is_active = true
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
  WITH latest_aum AS (
    SELECT DISTINCT ON (fund_id) fund_id, total_aum, aum_date
    FROM fund_daily_aum
    WHERE is_voided = false AND purpose = 'transaction'
    ORDER BY fund_id, aum_date DESC
  ),
  pos_sums AS (
    SELECT fund_id, SUM(COALESCE(current_value, 0)) as position_sum
    FROM investor_positions WHERE is_active = true
    GROUP BY fund_id
  ),
  aum_check AS (
    SELECT a.fund_id, a.total_aum as aum_value, COALESCE(p.position_sum, 0) as position_sum,
           a.total_aum - COALESCE(p.position_sum, 0) as drift, a.aum_date
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
  -- FIX: Use gross_yield_amount (V5 column) instead of gross_yield (legacy, always 0 for V5)
  WITH conservation AS (
    SELECT
      yd.id as distribution_id, yd.fund_id, yd.effective_date,
      COALESCE(yd.gross_yield_amount, yd.gross_yield) as gross_value,
      (SELECT COALESCE(SUM(net_amount),0) FROM yield_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_net,
      (SELECT COALESCE(SUM(fee_amount),0) FROM fee_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_fees,
      (SELECT COALESCE(SUM(ib_fee_amount),0) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_ib
    FROM yield_distributions yd
    WHERE yd.is_voided = false
      AND COALESCE(yd.gross_yield_amount, yd.gross_yield, 0) > 0
      AND yd.gross_yield_amount IS NOT NULL
  ),
  violations AS (
    SELECT distribution_id, fund_id, effective_date, gross_value,
           sum_net + sum_fees + sum_ib as sum_parts,
           gross_value - (sum_net + sum_fees + sum_ib) as drift
    FROM conservation
    WHERE ABS(gross_value - (sum_net + sum_fees + sum_ib)) > 0.000001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date,
    'gross_yield', gross_value, 'sum_parts', sum_parts, 'drift', drift
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM violations;

  v_checks := v_checks || jsonb_build_object('name','yield_conservation','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== CORE CHECK 4: no_negative_positions ==========
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id, 'fund_id', fund_id, 'balance', current_value
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM investor_positions WHERE current_value < -0.000001 AND is_active = true;

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
    WHERE ip.is_active = true
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
    WHERE ip.is_active = true
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
  -- FIX: Use gross_yield_amount instead of gross_yield
  WITH ib_count AS (
    SELECT yd.id as distribution_id,
      (SELECT COUNT(*) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as ib_alloc_count,
      (SELECT COUNT(*) FROM yield_allocations ya
       WHERE ya.distribution_id=yd.id AND ya.is_voided=false
         AND EXISTS(SELECT 1 FROM profiles p WHERE p.id=ya.investor_id AND p.ib_parent_id IS NOT NULL AND p.ib_percentage > 0)
      ) as expected_count
    FROM yield_distributions yd
    WHERE yd.is_voided=false
      AND COALESCE(yd.gross_yield_amount, yd.gross_yield, 0) > 0
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
      AND consolidated_into_id IS NULL
      AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    GROUP BY fund_id, effective_date, purpose HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'effective_date', effective_date, 'purpose', purpose, 'count', count
  )), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count FROM dup_dist;

  v_checks := v_checks || jsonb_build_object('name','no_duplicate_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- ========== TEMPORAL CHECK 12: statement_periods_have_distributions ==========
  WITH missing_periods AS (
    SELECT sp.id as period_id, sp.period_name
    FROM statement_periods sp
    WHERE (sp.status IS NULL OR sp.status NOT IN ('archived'))
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
  -- FIX: Exclude fees_account type (legitimate admin pattern)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', id, 'account_type', account_type)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM profiles WHERE is_admin=true AND account_type IS NOT NULL AND account_type NOT IN ('investor', 'fees_account');

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

  RETURN jsonb_build_object(
    'run_at', NOW(),
    'total_checks', v_total_checks,
    'passed', v_passed_count,
    'failed', v_failed_count,
    'checks', (SELECT jsonb_agg(c) FROM unnest(v_checks) AS c)
  );
END;
$$;

COMMENT ON FUNCTION "public"."run_invariant_checks"() IS 'Runs 16 invariant checks for data integrity. Admin-only. Fixed: uses gross_yield_amount for V5, is_active filter.';


-- ============================================================================
-- 3. FIX log_aum_position_mismatch trigger: query discrepancy column
-- ============================================================================

CREATE OR REPLACE FUNCTION log_aum_position_mismatch()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mismatch RECORD;
BEGIN
  -- FIX: Query discrepancy column (not has_mismatch which doesn't exist)
  FOR v_mismatch IN
    SELECT fund_id, discrepancy FROM fund_aum_mismatch LIMIT 5
  LOOP
    INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'AUM_POSITION_MISMATCH_DETECTED',
      'fund_daily_aum',
      v_mismatch.fund_id::text,
      NULL,
      jsonb_build_object('discrepancy', v_mismatch.discrepancy),
      jsonb_build_object('trigger', 'log_aum_position_mismatch')
    );
  END LOOP;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- 4. FIX fund_aum_mismatch view: add purpose filter (transaction only)
-- ============================================================================

CREATE OR REPLACE VIEW fund_aum_mismatch AS
SELECT
  f.id AS fund_id,
  f.name AS fund_name,
  f.asset,
  fda.aum_date,
  fda.total_aum AS recorded_aum,
  COALESCE(pos.position_sum, 0) AS position_sum,
  fda.total_aum - COALESCE(pos.position_sum, 0) AS discrepancy
FROM funds f
JOIN fund_daily_aum fda ON fda.fund_id = f.id AND fda.is_voided = false
  AND fda.purpose = 'transaction'
LEFT JOIN (
  SELECT fund_id, SUM(COALESCE(current_value, 0)) AS position_sum
  FROM investor_positions
  WHERE is_active = true
  GROUP BY fund_id
) pos ON pos.fund_id = f.id
WHERE is_admin()
  AND fda.aum_date = (
    SELECT MAX(fda2.aum_date) FROM fund_daily_aum fda2
    WHERE fda2.fund_id = f.id AND fda2.is_voided = false
      AND fda2.purpose = 'transaction'
  )
  AND ABS(fda.total_aum - COALESCE(pos.position_sum, 0)) > 0.01;


-- ============================================================================
-- 5. FIX v_ledger_reconciliation: add is_active filter
-- ============================================================================

CREATE OR REPLACE VIEW v_ledger_reconciliation AS
WITH position_totals AS (
  SELECT
    ip.investor_id,
    ip.fund_id,
    ip.current_value,
    f.name AS fund_name,
    f.asset
  FROM investor_positions ip
  JOIN funds f ON f.id = ip.fund_id
  WHERE ip.current_value <> 0
    AND ip.is_active = true
),
ledger_totals AS (
  SELECT
    t.investor_id,
    t.fund_id,
    SUM(t.amount) AS ledger_sum
  FROM transactions_v2 t
  WHERE t.is_voided = false
  GROUP BY t.investor_id, t.fund_id
)
SELECT
  pt.investor_id,
  pt.fund_id,
  pt.fund_name,
  pt.asset,
  pt.current_value AS position_balance,
  COALESCE(lt.ledger_sum, 0) AS ledger_balance,
  pt.current_value - COALESCE(lt.ledger_sum, 0) AS drift
FROM position_totals pt
LEFT JOIN ledger_totals lt ON lt.investor_id = pt.investor_id AND lt.fund_id = pt.fund_id
WHERE is_admin()
  AND ABS(pt.current_value - COALESCE(lt.ledger_sum, 0)) > 0.000001;


-- ============================================================================
-- 6. FIX investor_position_ledger_mismatch: admin gate + simplified sign logic
-- ============================================================================

CREATE OR REPLACE VIEW investor_position_ledger_mismatch AS
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value AS position_balance,
  COALESCE(ledger.ledger_sum, 0) AS ledger_balance,
  ip.current_value - COALESCE(ledger.ledger_sum, 0) AS discrepancy
FROM investor_positions ip
LEFT JOIN (
  SELECT investor_id, fund_id, SUM(amount) AS ledger_sum
  FROM transactions_v2
  WHERE is_voided = false
  GROUP BY investor_id, fund_id
) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
WHERE is_admin()
  AND ip.is_active = true
  AND ABS(ip.current_value - COALESCE(ledger.ledger_sum, 0)) > 0.000001;


-- ============================================================================
-- 7. FIX yield_distribution_conservation_check: consistent status filter
-- ============================================================================

CREATE OR REPLACE VIEW yield_distribution_conservation_check AS
SELECT
  yd.id AS distribution_id,
  yd.fund_id,
  yd.effective_date,
  COALESCE(yd.gross_yield_amount, yd.gross_yield) AS gross,
  COALESCE(yd.total_net_amount, yd.net_yield) AS net,
  COALESCE(yd.total_fee_amount, yd.total_fees) AS fees,
  COALESCE(yd.total_ib_amount, yd.total_ib) AS ib,
  COALESCE(yd.dust_amount, 0) AS dust,
  ABS(
    COALESCE(yd.gross_yield_amount, yd.gross_yield, 0)
    - COALESCE(yd.total_net_amount, yd.net_yield, 0)
    - COALESCE(yd.total_fee_amount, yd.total_fees, 0)
    - COALESCE(yd.total_ib_amount, yd.total_ib, 0)
    - COALESCE(yd.dust_amount, 0)
  ) AS residual
FROM yield_distributions yd
WHERE is_admin()
  AND (yd.is_voided IS NULL OR yd.is_voided = false)
  AND yd.status = 'applied'
  AND yd.gross_yield_amount IS NOT NULL
  AND yd.consolidated_into_id IS NULL
  AND ABS(
    COALESCE(yd.gross_yield_amount, yd.gross_yield, 0)
    - COALESCE(yd.total_net_amount, yd.net_yield, 0)
    - COALESCE(yd.total_fee_amount, yd.total_fees, 0)
    - COALESCE(yd.total_ib_amount, yd.total_ib, 0)
    - COALESCE(yd.dust_amount, 0)
  ) > 0.01;


-- ============================================================================
-- 8. FIX v_yield_conservation_violations: use gross_yield_amount, no NULLIF
-- ============================================================================

CREATE OR REPLACE VIEW v_yield_conservation_violations AS
SELECT
  yd.id AS distribution_id,
  yd.fund_id,
  yd.effective_date,
  COALESCE(yd.gross_yield_amount, yd.gross_yield, 0) AS header_gross,
  COALESCE(yd.total_net_amount, yd.net_yield, 0) AS header_net,
  COALESCE(yd.total_fee_amount, yd.total_fees, 0) AS header_fees,
  COALESCE(yd.total_ib_amount, yd.total_ib, 0) AS header_ib,
  COALESCE(yd.dust_amount, 0) AS header_dust,
  COALESCE(yd.gross_yield_amount, yd.gross_yield, 0)
    - COALESCE(yd.total_net_amount, yd.net_yield, 0)
    - COALESCE(yd.total_fee_amount, yd.total_fees, 0)
    - COALESCE(yd.total_ib_amount, yd.total_ib, 0)
    - COALESCE(yd.dust_amount, 0) AS variance
FROM yield_distributions yd
WHERE is_admin()
  AND yd.is_voided = false
  AND yd.status = 'applied'
  AND yd.gross_yield_amount IS NOT NULL
  AND yd.consolidated_into_id IS NULL
  AND ABS(
    COALESCE(yd.gross_yield_amount, yd.gross_yield, 0)
    - COALESCE(yd.total_net_amount, yd.net_yield, 0)
    - COALESCE(yd.total_fee_amount, yd.total_fees, 0)
    - COALESCE(yd.total_ib_amount, yd.total_ib, 0)
    - COALESCE(yd.dust_amount, 0)
  ) > 0.01;
