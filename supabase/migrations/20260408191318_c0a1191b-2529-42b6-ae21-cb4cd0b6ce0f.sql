
-- =============================================
-- MIGRATION 1: P0 — Profile Privilege Escalation Fix
-- =============================================

-- 1. Drop the unsafe self-update policy
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;

-- 2. Create column-restricted self-update policy
CREATE POLICY "profiles_update_own_restricted" ON public.profiles
FOR UPDATE
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Add a trigger to block sensitive column changes by non-admins
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can update anything
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admins: block changes to sensitive fields
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin field';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify role field';
  END IF;
  IF NEW.account_type IS DISTINCT FROM OLD.account_type AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify account_type field';
  END IF;
  IF NEW.is_system_account IS DISTINCT FROM OLD.is_system_account THEN
    RAISE EXCEPTION 'Cannot modify is_system_account field';
  END IF;
  IF NEW.include_in_reporting IS DISTINCT FROM OLD.include_in_reporting THEN
    RAISE EXCEPTION 'Cannot modify include_in_reporting field';
  END IF;
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Cannot modify kyc_status field';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify email field';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status field';
  END IF;
  IF NEW.ib_parent_id IS DISTINCT FROM OLD.ib_parent_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Cannot modify ib_parent_id field';
  END IF;
  IF NEW.ib_commission_source IS DISTINCT FROM OLD.ib_commission_source THEN
    RAISE EXCEPTION 'Cannot modify ib_commission_source field';
  END IF;
  IF NEW.onboarding_date IS DISTINCT FROM OLD.onboarding_date THEN
    RAISE EXCEPTION 'Cannot modify onboarding_date field';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- 3. Rewrite can_insert_notification — remove profiles.is_admin read
CREATE OR REPLACE FUNCTION public.can_insert_notification()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
$$;

-- 4. Rewrite ensure_admin — remove profiles.is_admin fallback
CREATE OR REPLACE FUNCTION public.ensure_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$$;

-- 5. Rewrite get_all_investors_summary — replace p.is_admin = false with user_roles exclusion
CREATE OR REPLACE FUNCTION public.get_all_investors_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(investor_row ORDER BY investor_row->>'name'), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id',              p.id,
        'name',            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'email',           p.email,
        'status',          COALESCE(p.status, 'active'),
        'account_type',    COALESCE(p.account_type::text, 'investor'),
        'totalAUM',        COALESCE(pos.total_aum, 0),
        'totalEarned',     COALESCE(earned.total_earned, 0),
        'totalPrincipal',  COALESCE(principal.total_principal, 0),
        'positionCount',   COALESCE(pos.position_count, 0),
        'assetBreakdown',  COALESCE(pos.asset_breakdown, '{}'::jsonb),
        'onboardingDate',  p.onboarding_date,
        'createdAt',       p.created_at
      ) AS investor_row
      FROM profiles p
      LEFT JOIN (
        SELECT
          ip.investor_id,
          SUM(ip.current_value)    AS total_aum,
          COUNT(*)                 AS position_count,
          jsonb_object_agg(f.asset, ip.current_value) AS asset_breakdown
        FROM investor_positions ip
        JOIN funds f ON f.id = ip.fund_id
        WHERE ip.is_active = true
        GROUP BY ip.investor_id
      ) pos ON pos.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_earned
        FROM transactions_v2
        WHERE type = 'YIELD' AND is_voided = false
        GROUP BY investor_id
      ) earned ON earned.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_principal
        FROM transactions_v2
        WHERE type = 'DEPOSIT' AND is_voided = false
        GROUP BY investor_id
      ) principal ON principal.investor_id = p.id
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
      )
    ) subq
  );
END;
$$;

-- 6. Rewrite get_paged_investor_summaries
CREATE OR REPLACE FUNCTION public.get_paged_investor_summaries(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_status text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, email text, first_name text, last_name text, status text, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.email, p.first_name, p.last_name, p.status, p.created_at,
    COUNT(*) OVER() as total_count
  FROM public.profiles p
  WHERE (p_status IS NULL OR p.status = p_status)
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
    )
  ORDER BY p.first_name ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 7. Rewrite get_platform_stats — use user_roles for admin count
CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_total_aum numeric;
  v_investor_count int;
  v_admin_count int;
BEGIN
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  SELECT COALESCE(SUM(current_value), 0)
  INTO v_total_aum
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  SELECT COUNT(DISTINCT ip.investor_id)
  INTO v_investor_count
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  SELECT COUNT(DISTINCT user_id)
  INTO v_admin_count
  FROM user_roles
  WHERE role IN ('admin', 'super_admin');

  RETURN jsonb_build_object(
    'total_aum', v_total_aum,
    'investor_count', v_investor_count,
    'admin_count', v_admin_count
  );
END;
$$;

-- 8. Rewrite void_and_reissue_full_exit — use check_is_admin
CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(p_transaction_id uuid, p_new_amount numeric, p_admin_id uuid, p_reason text, p_send_precision integer DEFAULT 3, p_new_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_new_request_id uuid;
  v_balance numeric(38,18);
  v_dust numeric(38,18);
  v_fees_account_id uuid;
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fund RECORD;
  v_effective_date date;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_orig.is_voided THEN RAISE EXCEPTION 'Transaction is already voided'; END IF;
  IF v_orig.type <> 'WITHDRAWAL' THEN RAISE EXCEPTION 'Only WITHDRAWAL transactions supported'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN RAISE EXCEPTION 'Reason must be at least 10 chars'; END IF;

  v_effective_date := COALESCE(p_new_date, v_orig.tx_date);

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  SELECT * INTO v_fund FROM funds WHERE id = v_orig.fund_id;

  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id
    AND status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (request_date - v_orig.created_at))) < 86400
  ORDER BY request_date DESC LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'No linked withdrawal_request found. Use simple void-and-reissue.';
  END IF;
  v_request_id := v_request.id;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);
  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction';
  END IF;

  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'V&R full-exit correction: ' || TRIM(p_reason),
      cancelled_by = p_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  v_new_request_id := gen_random_uuid();
  INSERT INTO withdrawal_requests (
    id, fund_id, fund_class, investor_id, requested_amount, withdrawal_type,
    status, settlement_date, notes, created_by, updated_at
  ) VALUES (
    v_new_request_id,
    v_request.fund_id,
    v_request.fund_class,
    v_request.investor_id,
    ABS(p_new_amount),
    'full',
    'pending',
    v_effective_date,
    'V&R correction of ' || v_request_id::text || ': ' || TRIM(p_reason),
    p_admin_id,
    NOW()
  );

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_new_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := false,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process withdrawal';
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_dust := v_balance;

  IF v_dust > 0 THEN
    SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

    IF v_fees_account_id IS NOT NULL THEN
      PERFORM set_config('indigo.canonical_rpc', 'true', true);

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_orig.investor_id, 'DUST_SWEEP', -ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-sweep-' || v_new_request_id::text,
        'V&R dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_tx_id;

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_fees_account_id, 'DUST_SWEEP', ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-credit-' || v_new_request_id::text,
        'Dust received from V&R of ' || v_orig.investor_id::text,
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_credit_tx_id;

      UPDATE investor_positions
      SET is_active = false, updated_at = NOW()
      WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
    END IF;
  ELSE
    UPDATE investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_tx_id', p_transaction_id, 'original_amount', v_orig.amount,
      'old_request_id', v_request_id, 'original_date', v_orig.tx_date),
    jsonb_build_object('new_request_id', v_new_request_id, 'new_amount', p_new_amount,
      'new_date', v_effective_date, 'dust_amount', v_dust),
    jsonb_build_object('source', 'void_and_reissue_full_exit_rpc_v4', 'reason', TRIM(p_reason))
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'transaction_id',
    'old_request_id', v_request_id,
    'new_request_id', v_new_request_id,
    'new_processed_amount', ABS(p_new_amount),
    'new_date', v_effective_date,
    'dust_amount', v_dust,
    'message', 'Full-exit withdrawal corrected'
  );
END;
$$;

-- 9. Rewrite finalize_statement_period — use check_is_admin
CREATE OR REPLACE FUNCTION public.finalize_statement_period(p_period_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Only administrators can finalize statement periods';
  END IF;

  SELECT status INTO v_current_status
  FROM statement_periods
  WHERE id = p_period_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Statement period not found';
  END IF;

  IF v_current_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Statement period is already finalized';
  END IF;

  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_at = NOW(),
    finalized_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_period_id;

  INSERT INTO audit_log (
    action, entity, entity_id, actor_user, new_values, meta, created_at
  ) VALUES (
    'FINALIZE', 'statement_periods', p_period_id::text, p_admin_id,
    jsonb_build_object('previous_status', v_current_status, 'new_status', 'FINALIZED'),
    jsonb_build_object('operation', 'period_finalization'),
    NOW()
  );
END;
$$;

-- 10. Rewrite unvoid_transaction — use check_is_admin
CREATE OR REPLACE FUNCTION public.unvoid_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_result jsonb;
BEGIN
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required');
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found'); END IF;
  IF v_tx.is_voided IS DISTINCT FROM true THEN RETURN jsonb_build_object('success', false, 'error_code', 'NOT_VOIDED', 'message', 'Transaction is not voided'); END IF;

  IF check_historical_lock(v_tx.fund_id, v_tx.tx_date, false) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'HISTORICAL_LOCK', 'message', 'FIRST PRINCIPLES VIOLATION: Cannot unvoid a transaction on ' || v_tx.tx_date || ' because a subsequent Yield Distribution is locked on the ledger.');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE transactions_v2 SET is_voided = false, voided_at = NULL, voided_by = NULL, void_reason = NULL, notes = COALESCE(notes, '') || E'\n[Unvoided ' || now()::text || ' by admin ' || p_admin_id::text || ': ' || trim(p_reason) || ']' WHERE id = p_transaction_id;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'message', 'Transaction unvoided successfully');
END;
$$;

-- 11. Rewrite run_invariant_checks — use is_admin() and user_roles for check 15
CREATE OR REPLACE FUNCTION public.run_invariant_checks()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  -- Check 3: yield_conservation
  WITH conservation AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date, yd.gross_yield,
      (SELECT COALESCE(SUM(net_amount),0) FROM yield_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_net,
      (SELECT COALESCE(SUM(fee_amount),0) FROM fee_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_fees,
      (SELECT COALESCE(SUM(ib_fee_amount),0) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as sum_ib
    FROM yield_distributions yd
    WHERE yd.is_voided = false AND yd.gross_yield > 0
      AND yd.gross_yield_amount IS NOT NULL
      AND yd.purpose = 'reporting'::aum_purpose
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

  -- Check 5: no_orphan_transactions
  WITH orphans AS (
    SELECT t.id as tx_id, t.investor_id, t.fund_id, t.type, t.amount
    FROM transactions_v2 t
    LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
    WHERE t.is_voided = false AND t.investor_id IS NOT NULL AND ip.investor_id IS NULL
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', tx_id, 'investor_id', investor_id, 'fund_id', fund_id, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM orphans;
  v_checks := v_checks || jsonb_build_object('name','no_orphan_transactions','category','core','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 6: ib_position_matches_ledger
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
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM ib_check;
  v_checks := v_checks || jsonb_build_object('name','ib_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 7: fee_position_matches_ledger
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
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM fee_check;
  v_checks := v_checks || jsonb_build_object('name','fee_position_matches_ledger','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 8: ib_allocation_count_matches
  WITH ib_count AS (
    SELECT yd.id as distribution_id,
      (SELECT COUNT(*) FROM ib_allocations WHERE distribution_id=yd.id AND is_voided=false) as ib_alloc_count,
      (SELECT COUNT(*) FROM yield_allocations ya
       WHERE ya.distribution_id=yd.id AND ya.is_voided=false AND ya.ib_pct > 0
      ) as expected_count
    FROM yield_distributions yd
    WHERE yd.is_voided=false AND yd.gross_yield>0 AND yd.gross_yield_amount IS NOT NULL
      AND yd.purpose = 'reporting'::aum_purpose
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'ib_alloc_count', ib_alloc_count, 'expected_count', expected_count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM ib_count WHERE ib_alloc_count != expected_count;
  v_checks := v_checks || jsonb_build_object('name','ib_allocation_count_matches','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 9: no_duplicate_ib_allocations
  WITH dup_ib AS (
    SELECT ib_investor_id, distribution_id, COUNT(*) as count
    FROM ib_allocations WHERE is_voided=false
    GROUP BY ib_investor_id, distribution_id HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ib_investor_id', ib_investor_id, 'distribution_id', distribution_id, 'count', count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM dup_ib;
  v_checks := v_checks || jsonb_build_object('name','no_duplicate_ib_allocations','category','ib','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 10: no_future_transactions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tx_id', id, 'tx_date', tx_date, 'type', type, 'amount', amount
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count
  FROM transactions_v2 WHERE is_voided=false AND tx_date > CURRENT_DATE;
  v_checks := v_checks || jsonb_build_object('name','no_future_transactions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 11: no_duplicate_distributions
  WITH dup_dist AS (
    SELECT fund_id, effective_date, purpose, COUNT(*) as count
    FROM yield_distributions WHERE is_voided=false
    GROUP BY fund_id, effective_date, purpose HAVING COUNT(*)>1
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'fund_id', fund_id, 'effective_date', effective_date, 'purpose', purpose, 'count', count
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM dup_dist;
  v_checks := v_checks || jsonb_build_object('name','no_duplicate_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 12: statement_periods_have_distributions
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
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM missing_periods;
  v_checks := v_checks || jsonb_build_object('name','statement_periods_have_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 13: audit_log_for_distributions
  WITH missing_audit AS (
    SELECT yd.id as distribution_id, yd.fund_id, yd.effective_date
    FROM yield_distributions yd
    WHERE yd.is_voided=false
      AND yd.gross_yield_amount IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM audit_log al
        WHERE al.entity_id = yd.id::text
          AND (al.entity = 'yield_distributions' OR al.action ILIKE '%yield%' OR al.action ILIKE '%adb%')
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'distribution_id', distribution_id, 'fund_id', fund_id, 'effective_date', effective_date
  )), '[]'::jsonb), COUNT(*) INTO v_violations, v_violation_count FROM missing_audit;
  v_checks := v_checks || jsonb_build_object('name','audit_log_for_distributions','category','temporal','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 14: all_tables_have_rls
  SELECT COALESCE(jsonb_agg(jsonb_build_object('table_name', tablename)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;
  v_checks := v_checks || jsonb_build_object('name','all_tables_have_rls','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 15: no_invalid_admin_accounts (FIXED: use user_roles instead of profiles.is_admin)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('profile_id', p.id, 'account_type', p.account_type)), '[]'::jsonb), COUNT(*)
  INTO v_violations, v_violation_count
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
  WHERE p.account_type IS NOT NULL AND p.account_type NOT IN ('investor', 'fees_account');
  v_checks := v_checks || jsonb_build_object('name','no_invalid_admin_accounts','category','security','passed',v_violation_count=0,'violation_count',v_violation_count,'violations',v_violations);
  IF v_violation_count = 0 THEN v_passed_count := v_passed_count + 1; ELSE v_failed_count := v_failed_count + 1; END IF;

  -- Check 16: no_orphan_auth_users
  WITH orphans AS (
    SELECT au.id as user_id, au.email
    FROM auth.users au LEFT JOIN profiles p ON p.id = au.id
    WHERE p.id IS NULL AND au.email NOT LIKE 'test.%@%'
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

-- 12. Rewrite rebuild_position_from_ledger — use check_is_admin
CREATE OR REPLACE FUNCTION public.rebuild_position_from_ledger(p_investor_id uuid, p_fund_id uuid, p_admin_id uuid, p_reason text, p_dry_run boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_computed jsonb;
  v_old_position record;
  v_new_cost_basis numeric;
  v_new_current_value numeric;
  v_new_shares numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('rebuild_pos:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_computed := compute_position_from_ledger(p_investor_id, p_fund_id);
  
  v_new_cost_basis := (v_computed->'computed'->>'cost_basis')::numeric;
  v_new_current_value := (v_computed->'computed'->>'current_value')::numeric;
  v_new_shares := (v_computed->'computed'->>'shares')::numeric;

  SELECT * INTO v_old_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Position not found');
  END IF;

  IF NOT p_dry_run THEN
    PERFORM set_canonical_rpc(true);
    
    UPDATE investor_positions
    SET cost_basis = v_new_cost_basis, current_value = v_new_current_value,
        shares = v_new_shares, updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    PERFORM set_canonical_rpc(false);

    INSERT INTO audit_log (action, entity, entity_id, actor_user, meta, old_values, new_values)
    VALUES ('position_rebuild_from_ledger', 'investor_positions',
      p_investor_id::text || '_' || p_fund_id::text, p_admin_id,
      jsonb_build_object('reason', p_reason, 'breakdown', v_computed->'breakdown'),
      jsonb_build_object('cost_basis', v_old_position.cost_basis,
        'current_value', v_old_position.current_value, 'shares', v_old_position.shares),
      jsonb_build_object('cost_basis', v_new_cost_basis,
        'current_value', v_new_current_value, 'shares', v_new_shares)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'dry_run', p_dry_run,
    'old', jsonb_build_object('cost_basis', v_old_position.cost_basis,
      'current_value', v_old_position.current_value, 'shares', v_old_position.shares),
    'new', jsonb_build_object('cost_basis', v_new_cost_basis,
      'current_value', v_new_current_value, 'shares', v_new_shares),
    'breakdown', v_computed->'breakdown'
  );
END;
$$;

-- 13. Rewrite update_user_profile_secure — use is_admin()
CREATE OR REPLACE FUNCTION public.update_user_profile_secure(p_user_id uuid, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_status text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.profiles
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 14. Rewrite get_investor_reports_v2 — replace p.is_admin = false with user_roles exclusion
CREATE OR REPLACE FUNCTION public.get_investor_reports_v2(p_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
    result JSONB;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    IF NOT (SELECT is_admin()) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT date_trunc('month', period_end_date)::date, period_end_date 
    INTO v_period_start, v_period_end 
    FROM statement_periods WHERE id = p_period_id;

    WITH investor_data AS (
        SELECT 
            p.id as investor_id,
            TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as investor_name,
            p.email as investor_email,
            COALESCE(
              (SELECT jsonb_agg(jsonb_build_object(
                  'email', ie.email,
                  'is_primary', ie.is_primary,
                  'verified', ie.verified
              )) FROM investor_emails ie WHERE ie.investor_id = p.id),
              '[]'::jsonb
            ) as investor_emails
        FROM profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
          )
          AND (p.account_type IS NULL OR p.account_type != 'fees_account')
          AND (
            EXISTS (SELECT 1 FROM investor_positions ip WHERE ip.investor_id = p.id AND ip.is_active = true AND ip.current_value > 1e-8)
            OR EXISTS (SELECT 1 FROM investor_fund_performance ifp WHERE ifp.investor_id = p.id AND ifp.period_id = p_period_id)
            OR EXISTS (SELECT 1 FROM ib_allocations iba WHERE iba.ib_investor_id = p.id AND iba.is_voided = false AND iba.effective_date >= v_period_start AND iba.effective_date <= v_period_end)
          )
    ),
    performance_records AS (
        SELECT 
            ifp.investor_id,
            jsonb_agg(jsonb_build_object(
                'report_id', ifp.id,
                'asset_code', ifp.fund_name,
                'opening_balance', ifp.mtd_beginning_balance::text,
                'closing_balance', ifp.mtd_ending_balance::text,
                'additions', ifp.mtd_additions::text,
                'withdrawals', ifp.mtd_redemptions::text,
                'yield_earned', ifp.mtd_net_income::text,
                'mtd_beginning_balance', ifp.mtd_beginning_balance::text,
                'mtd_additions', ifp.mtd_additions::text,
                'mtd_redemptions', ifp.mtd_redemptions::text,
                'mtd_net_income', ifp.mtd_net_income::text,
                'mtd_ending_balance', ifp.mtd_ending_balance::text,
                'mtd_rate_of_return', ifp.mtd_rate_of_return::text,
                'qtd_beginning_balance', ifp.qtd_beginning_balance::text,
                'qtd_additions', ifp.qtd_additions::text,
                'qtd_redemptions', ifp.qtd_redemptions::text,
                'qtd_net_income', ifp.qtd_net_income::text,
                'qtd_ending_balance', ifp.qtd_ending_balance::text,
                'qtd_rate_of_return', ifp.qtd_rate_of_return::text,
                'ytd_beginning_balance', ifp.ytd_beginning_balance::text,
                'ytd_additions', ifp.ytd_additions::text,
                'ytd_redemptions', ifp.ytd_redemptions::text,
                'ytd_net_income', ifp.ytd_net_income::text,
                'ytd_ending_balance', ifp.ytd_ending_balance::text,
                'ytd_rate_of_return', ifp.ytd_rate_of_return::text,
                'itd_beginning_balance', ifp.itd_beginning_balance::text,
                'itd_additions', ifp.itd_additions::text,
                'itd_redemptions', ifp.itd_redemptions::text,
                'itd_net_income', ifp.itd_net_income::text,
                'itd_ending_balance', ifp.itd_ending_balance::text,
                'itd_rate_of_return', ifp.itd_rate_of_return::text
            ) ORDER BY ifp.fund_name) as assets,
            SUM(ifp.mtd_ending_balance) as total_value,
            SUM(ifp.mtd_net_income) as total_yield
        FROM investor_fund_performance ifp
        WHERE ifp.period_id = p_period_id
        GROUP BY ifp.investor_id
    ),
    delivery_info AS (
        SELECT 
            gs.investor_id,
            gs.id as statement_id,
            sed.status as email_status,
            sed.sent_at
        FROM generated_statements gs
        LEFT JOIN statement_email_delivery sed ON sed.statement_id = gs.id
        WHERE gs.period_id = p_period_id
    )
    SELECT jsonb_agg(jsonb_build_object(
        'investor_id', id.investor_id,
        'investor_name', id.investor_name,
        'investor_email', id.investor_email,
        'investor_emails', id.investor_emails,
        'assets', COALESCE(pr.assets, '[]'::jsonb),
        'total_value', COALESCE(pr.total_value, 0)::text,
        'total_yield', COALESCE(pr.total_yield, 0)::text,
        'has_reports', CASE WHEN pr.assets IS NOT NULL THEN true ELSE false END,
        'report_count', COALESCE(jsonb_array_length(pr.assets), 0),
        'statement_id', di.statement_id,
        'delivery_status', CASE 
            WHEN di.email_status = 'SENT' THEN 'sent'
            WHEN di.email_status = 'FAILED' THEN 'failed'
            WHEN pr.assets IS NOT NULL OR di.statement_id IS NOT NULL THEN 'generated'
            ELSE 'missing'
          END,
        'sent_at', di.sent_at
    ) ORDER BY id.investor_name) INTO result
    FROM investor_data id
    LEFT JOIN performance_records pr ON pr.investor_id = id.investor_id
    LEFT JOIN delivery_info di ON di.investor_id = id.investor_id;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
