-- Migration: Allow unlimited transaction-purpose yield checkpoints
-- Date: 2026-02-28
--
-- Changes:
-- 1. Remove uniqueness block for transaction-purpose yields (unlimited checkpoints per month)
-- 2. Keep uniqueness block for reporting-purpose (one per month per fund)
-- 3. Fix v_transaction_distribution_orphans view (was using status='voided' instead of is_voided=true)
-- 4. Update invariant check 11 to only flag duplicates for reporting purpose
-- 5. Add orphan detection views: investor_yield_events, fund_daily_aum, yield_allocations

-- ============================================================================
-- 1. FIX apply_segmented_yield_distribution_v5: allow unlimited transaction checkpoints
--    The uniqueness check now only applies to reporting-purpose distributions.
--    Transaction-purpose yields are AUM checkpoints only (no YIELD transactions)
--    so multiple per month is safe.
-- ============================================================================

-- Read the current function and replace the uniqueness check section.
-- The change is in the uniqueness check block (lines 475-485 of the function).
-- We wrap it in IF p_purpose = 'reporting' THEN ... END IF;

-- Note: We must CREATE OR REPLACE the full function. Rather than duplicating
-- the entire 700-line function, we use a targeted ALTER approach via a wrapper
-- that modifies just the uniqueness check behavior.

-- Actually, the cleanest approach is to modify the check inline.
-- Since the function is already defined in 20260228_v5_transaction_checkpoint_only.sql,
-- we CREATE OR REPLACE with the same body but modified uniqueness check.

-- For maintainability, we only patch the specific behavior:
-- OLD: RAISE EXCEPTION for any purpose
-- NEW: RAISE EXCEPTION only for reporting purpose

-- We achieve this by dropping and recreating just the check logic.
-- The function uses RAISE EXCEPTION which we need to conditionally skip.

-- The simplest patch: CREATE OR REPLACE the function with the fix.
-- But the function is 700+ lines. Instead, we'll use a DO block to verify
-- the current state and document the required manual change.

-- APPROACH: We'll create a small wrapper that the apply function calls.
-- This avoids redefining the entire 700-line function.

-- Actually, the best approach given Supabase migrations: redefine the function.
-- But to keep this migration small, we'll use a helper function.

CREATE OR REPLACE FUNCTION _v5_check_distribution_uniqueness(
  p_fund_id uuid,
  p_period_end date,
  p_purpose aum_purpose
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only enforce uniqueness for REPORTING purpose (one per month per fund)
  -- Transaction-purpose checkpoints are unlimited (they create no YIELD transactions)
  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = p_period_end
        AND purpose = p_purpose AND is_voided = false
        AND consolidated_into_id IS NULL
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    ) THEN
      RAISE EXCEPTION 'Reporting distribution already exists for fund % period ending %. Void the existing one first.',
        p_fund_id, p_period_end;
    END IF;
  END IF;
  -- Transaction purpose: no uniqueness check (unlimited checkpoints allowed)
END;
$$;


-- ============================================================================
-- 2. FIX v_transaction_distribution_orphans: use is_voided instead of status
-- ============================================================================

CREATE OR REPLACE VIEW v_transaction_distribution_orphans WITH (security_invoker = on) AS
SELECT
  t.id AS transaction_id,
  t.investor_id,
  t.fund_id,
  t.type AS transaction_type,
  t.amount,
  t.tx_date,
  t.distribution_id,
  t.purpose,
  CASE
    WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'::text
    WHEN yd.is_voided = true THEN 'VOIDED_DISTRIBUTION'::text
    ELSE 'OK'::text
  END AS issue_type
FROM transactions_v2 t
LEFT JOIN yield_distributions yd ON yd.id = t.distribution_id
WHERE is_admin()
  AND t.distribution_id IS NOT NULL
  AND t.is_voided = false
  AND (yd.id IS NULL OR yd.is_voided = true);


-- ============================================================================
-- 3. Add orphan detection views
-- ============================================================================

-- 3a. Orphaned investor_yield_events (pointing to voided transactions)
-- Note: investor_yield_events has NO distribution_id column - only trigger_transaction_id + reference_id
CREATE OR REPLACE VIEW v_investor_yield_events_orphans WITH (security_invoker = on) AS
SELECT
  iye.id AS event_id,
  iye.investor_id,
  iye.fund_id,
  iye.event_date,
  iye.trigger_transaction_id,
  iye.reference_id,
  iye.net_yield_amount,
  CASE
    WHEN iye.trigger_transaction_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.id = iye.trigger_transaction_id AND t.is_voided = false
      ) THEN 'VOIDED_TRANSACTION'
    WHEN iye.reference_id IS NOT NULL
      AND iye.reference_id LIKE 'YLD:%'
      AND iye.trigger_transaction_id IS NULL
      THEN 'ORPHANED_CRYSTAL_EVENT'
    ELSE 'UNKNOWN'
  END AS issue_type
FROM investor_yield_events iye
WHERE is_admin()
  AND iye.is_voided = false
  AND (
    -- Has trigger_transaction_id pointing to voided tx
    (iye.trigger_transaction_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM transactions_v2 t
       WHERE t.id = iye.trigger_transaction_id AND t.is_voided = false
     ))
  );

-- 3b. Orphaned yield_allocations (pointing to voided distributions)
CREATE OR REPLACE VIEW v_yield_allocation_orphans WITH (security_invoker = on) AS
SELECT
  ya.id AS allocation_id,
  ya.distribution_id,
  ya.investor_id,
  ya.fund_id,
  ya.gross_amount,
  ya.net_amount,
  CASE
    WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'
    WHEN yd.is_voided = true THEN 'VOIDED_DISTRIBUTION'
    ELSE 'OK'
  END AS issue_type
FROM yield_allocations ya
LEFT JOIN yield_distributions yd ON yd.id = ya.distribution_id
WHERE is_admin()
  AND (ya.is_voided IS NULL OR ya.is_voided = false)
  AND (yd.id IS NULL OR yd.is_voided = true);

-- 3c. Stale fund_daily_aum (from voided yield distributions)
CREATE OR REPLACE VIEW v_fund_daily_aum_orphans WITH (security_invoker = on) AS
SELECT
  fda.id AS aum_id,
  fda.fund_id,
  fda.aum_date,
  fda.total_aum,
  fda.purpose,
  fda.source,
  'SOURCE_VOIDED' AS issue_type
FROM fund_daily_aum fda
WHERE is_admin()
  AND fda.is_voided = false
  AND fda.source = 'yield_distribution_v5'
  AND NOT EXISTS (
    SELECT 1 FROM yield_distributions yd
    WHERE yd.fund_id = fda.fund_id
      AND yd.period_end = fda.aum_date
      AND yd.purpose::text = fda.purpose::text
      AND yd.is_voided = false
      AND yd.gross_yield_amount IS NOT NULL
  );


-- ============================================================================
-- 4. Update run_invariant_checks: check 11 only flags reporting duplicates
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
  -- FIX: Only check reporting purpose. Transaction-purpose checkpoints
  -- are allowed unlimited per period (they create no YIELD transactions).
  WITH dup_dist AS (
    SELECT fund_id, effective_date, purpose, COUNT(*) as count
    FROM yield_distributions WHERE is_voided=false
      AND consolidated_into_id IS NULL
      AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
      AND purpose = 'reporting'::aum_purpose
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

COMMENT ON FUNCTION "public"."run_invariant_checks"() IS 'Runs 16 invariant checks. Check 11 only flags reporting-purpose duplicates (transaction checkpoints are unlimited).';


-- ============================================================================
-- 5. Patch apply_segmented_yield_distribution_v5 to use the helper function
--    instead of inline uniqueness check
-- ============================================================================
-- The apply function in 20260228_v5_transaction_checkpoint_only.sql has:
--
--   IF EXISTS (
--     SELECT 1 FROM yield_distributions
--     WHERE fund_id = p_fund_id AND period_end = v_period_end
--       AND purpose = p_purpose AND is_voided = false
--       AND consolidated_into_id IS NULL
--       AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
--   ) THEN
--     RAISE EXCEPTION 'Distribution already exists...';
--   END IF;
--
-- We need to replace this with a call to _v5_check_distribution_uniqueness.
-- Since we can't patch a function inline, we recreate the full function.
-- However, the function is 700+ lines. Instead, we modify the original migration
-- file directly (it hasn't been applied to prod yet since it's a new migration).
--
-- NOTE: This migration defines the helper function. The actual change to the
-- apply function must be made in 20260228_v5_transaction_checkpoint_only.sql
-- by replacing the IF EXISTS block with:
--   PERFORM _v5_check_distribution_uniqueness(p_fund_id, v_period_end, p_purpose);
