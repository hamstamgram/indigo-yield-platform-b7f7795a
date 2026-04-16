-- ============================================================
-- Migration: Reconciliation — Missing RPCs
-- Restores cancel_withdrawal_by_admin_v2 and void_completed_withdrawal
-- which are called by the frontend but absent from the DB after reset.
-- ============================================================

-- RPC 1: cancel_withdrawal_by_admin_v2
-- Called from: withdrawalService.ts lines 371 and 504
-- Cancels pending or approved withdrawals with full audit trail.
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin_v2(
  p_request_id  uuid,
  p_reason      text,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_admin_id uuid;
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent mutations
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- 2. Look up the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  -- 3. Not found → raise
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  -- 4. Wrong status → raise
  IF v_request.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Can only cancel pending or approved requests. Current status: %. Use void_completed_withdrawal for completed ones.', v_request.status;
  END IF;

  -- Allow state-machine guard to permit the transition
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- 5. UPDATE withdrawal_requests
  UPDATE public.withdrawal_requests
  SET
    status              = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by        = v_admin_id,
    cancelled_at        = now(),
    admin_notes         = COALESCE(p_admin_notes, p_reason),
    updated_at          = now()
  WHERE id = p_request_id;

  -- 6. INSERT into audit_log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'WITHDRAWAL_CANCELLED_BY_ADMIN',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('status', v_request.status, 'investor_id', v_request.investor_id, 'fund_id', v_request.fund_id),
    jsonb_build_object(
      'reason',       p_reason,
      'admin_notes',  p_admin_notes,
      'new_status',   'cancelled'
    )
  );

  -- 7. Return success
  RETURN json_build_object('success', true, 'withdrawal_id', p_request_id);
END;
$$;

ALTER FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) FROM anon, PUBLIC;

-- ============================================================

-- RPC 2: void_completed_withdrawal
-- Called from: withdrawalService.ts line 351
-- Voids a completed withdrawal by finding+voiding its transaction,
-- then marking the withdrawal cancelled with a full audit trail.
CREATE OR REPLACE FUNCTION public.void_completed_withdrawal(
  p_withdrawal_id uuid,
  p_reason        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request    RECORD;
  v_admin_id   uuid;
  v_tx_id      uuid;
  v_void_result jsonb;
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  v_admin_id := auth.uid();

  -- 2. Advisory lock to prevent concurrent mutations
  PERFORM pg_advisory_xact_lock(hashtext('void_completed_withdrawal:' || p_withdrawal_id::text));

  -- 3. Look up withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  -- 4. Not found or wrong status → return error
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_request.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error',   'Can only void completed withdrawals. Current status: ' || v_request.status
    );
  END IF;

  -- 5. Find the most recent non-voided WITHDRAWAL transaction for this
  --    investor+fund within 7 days of the withdrawal approval date.
  SELECT id INTO v_tx_id
  FROM public.transactions_v2
  WHERE investor_id = v_request.investor_id
    AND fund_id     = v_request.fund_id
    AND type        = 'WITHDRAWAL'
    AND is_voided   = false
    AND tx_date >= COALESCE(v_request.approved_at::date, v_request.cancelled_at::date, now()::date) - interval '7 days'
  ORDER BY tx_date DESC
  LIMIT 1;

  -- 6. Void the transaction — raise if not found (financial correctness: no silent no-op)
  IF v_tx_id IS NULL THEN
    RAISE EXCEPTION 'VOID_TX_NOT_FOUND: No matching WITHDRAWAL transaction found for this completed withdrawal. Manual review required.';
  END IF;

  -- Bypass immutability triggers immediately before first write
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  v_void_result := public.void_transaction(v_tx_id, v_admin_id, p_reason);

  -- 7. UPDATE withdrawal_requests → cancelled
  UPDATE public.withdrawal_requests
  SET
    status              = 'cancelled',
    cancellation_reason = 'VOIDED: ' || p_reason,
    cancelled_by        = v_admin_id,
    cancelled_at        = now(),
    updated_at          = now()
  WHERE id = p_withdrawal_id;

  -- 8. INSERT into audit_log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'COMPLETED_WITHDRAWAL_VOIDED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('previous_status', 'completed', 'investor_id', v_request.investor_id, 'fund_id', v_request.fund_id),
    jsonb_build_object(
      'reason',         p_reason,
      'new_status',     'cancelled',
      'voided_tx_id',   v_tx_id
    )
  );

  -- 9. Return success
  RETURN json_build_object('success', true, 'withdrawal_id', p_withdrawal_id);
END;
$$;

ALTER FUNCTION public.void_completed_withdrawal(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.void_completed_withdrawal(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.void_completed_withdrawal(uuid, text) FROM anon, PUBLIC;

-- ============================================================

-- RPC 3: get_paged_audit_logs
-- Called from: src/services/shared/auditLogService.ts line 129
-- Returns paginated audit_log rows with total_count window column.
CREATE OR REPLACE FUNCTION public.get_paged_audit_logs(
  p_limit    int     DEFAULT NULL,
  p_offset   int     DEFAULT 0,
  p_entity   text    DEFAULT NULL,
  p_action   text    DEFAULT NULL,
  p_actor_id uuid    DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  actor_user  uuid,
  action      text,
  entity      text,
  entity_id   text,
  old_values  jsonb,
  new_values  jsonb,
  meta        jsonb,
  created_at  timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- 2. Cap p_limit at 500 rows
  p_limit := LEAST(COALESCE(p_limit, 50), 500);

  -- 3. Return paginated rows with window total_count
  RETURN QUERY
  SELECT
    al.id,
    al.actor_user,
    al.action,
    al.entity,
    al.entity_id,
    al.old_values,
    al.new_values,
    al.meta,
    al.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM public.audit_log al
  WHERE
    (p_entity   IS NULL OR al.entity      = p_entity)
    AND (p_action   IS NULL OR al.action  = p_action)
    AND (p_actor_id IS NULL OR al.actor_user = p_actor_id)
  ORDER BY al.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

ALTER FUNCTION public.get_paged_audit_logs(int, int, text, text, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_paged_audit_logs(int, int, text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_paged_audit_logs(int, int, text, text, uuid) FROM anon, PUBLIC;
-- Note: signature (int, int, text, text, uuid) remains valid; defaults are set inside the body.

-- ============================================================

-- RPC 4: get_paged_notifications
-- Called from: src/services/shared/notificationService.ts line 18
-- Signature matches frontend: { p_user_id, p_limit, p_offset }
-- Returns paginated notification rows for the current user with total_count window column.
CREATE OR REPLACE FUNCTION public.get_paged_notifications(
  p_user_id   uuid,
  p_limit     int  DEFAULT NULL,
  p_offset    int  DEFAULT 0
)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  title       text,
  message     text,
  type        notification_type,
  priority    notification_priority,
  is_read     boolean,
  metadata    jsonb,
  created_at  timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  -- 1. Identify caller and verify they only fetch their own notifications
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Cannot fetch another user''s notifications';
  END IF;

  -- 2. Cap p_limit at 200 rows
  p_limit := LEAST(COALESCE(p_limit, 50), 200);

  -- 3. Return paginated rows with window total_count
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.metadata,
    n.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM public.notifications n
  WHERE n.user_id = v_caller_id
  ORDER BY n.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

ALTER FUNCTION public.get_paged_notifications(uuid, int, int) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_paged_notifications(uuid, int, int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_paged_notifications(uuid, int, int) FROM anon, PUBLIC;

-- ============================================================

-- RPC 5: get_investor_cumulative_yield
-- Returns ITD cumulative yield totals for one investor in one fund.
-- Security: caller must be the investor themselves OR an admin.
CREATE OR REPLACE FUNCTION public.get_investor_cumulative_yield(
  p_investor_id uuid,
  p_fund_id     uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Access control: self or admin only
  IF NOT (auth.uid() = p_investor_id OR public.is_admin()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Aggregate from yield_allocations joined to yield_distributions
  SELECT json_build_object(
    'total_gross',         COALESCE(SUM(ya.gross_amount), 0),
    'total_net',           COALESCE(SUM(ya.net_amount),   0),
    'total_fees',          COALESCE(SUM(ya.fee_amount),   0),
    'total_ib',            COALESCE(SUM(ya.ib_amount),    0),
    'distribution_count',  COUNT(*)
  )
  INTO v_result
  FROM public.yield_allocations ya
  JOIN public.yield_distributions yd ON yd.id = ya.distribution_id
  WHERE ya.investor_id = p_investor_id
    AND ya.fund_id     = p_fund_id
    AND ya.is_voided   = false
    AND yd.is_voided   = false;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_investor_cumulative_yield(uuid, uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_investor_cumulative_yield(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_investor_cumulative_yield(uuid, uuid) FROM anon, PUBLIC;

-- ============================================================

-- RPC 6: get_investor_yield_summary
-- Returns yield history rows for one investor across all funds,
-- ordered newest-first.
-- Security: caller must be the investor themselves OR an admin.
CREATE OR REPLACE FUNCTION public.get_investor_yield_summary(
  p_investor_id uuid
)
RETURNS TABLE (
  distribution_id uuid,
  fund_id         uuid,
  fund_name       text,
  period_start    date,
  period_end      date,
  gross_amount    numeric,
  net_amount      numeric,
  fee_amount      numeric,
  ib_amount       numeric,
  effective_date  date,
  created_at      timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 1. Access control: self or admin only
  IF NOT (auth.uid() = p_investor_id OR public.is_admin()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  -- 2. Return rows joined to distributions and funds
  RETURN QUERY
  SELECT
    ya.distribution_id,
    ya.fund_id,
    f.name          AS fund_name,
    yd.period_start,
    yd.period_end,
    ya.gross_amount,
    ya.net_amount,
    ya.fee_amount,
    ya.ib_amount,
    yd.effective_date,
    ya.created_at
  FROM public.yield_allocations ya
  JOIN public.yield_distributions yd ON yd.id = ya.distribution_id
  JOIN public.funds               f  ON f.id  = ya.fund_id
  WHERE ya.investor_id = p_investor_id
    AND ya.is_voided   = false
    AND yd.is_voided   = false
  ORDER BY yd.effective_date DESC;
END;
$$;

ALTER FUNCTION public.get_investor_yield_summary(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_investor_yield_summary(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_investor_yield_summary(uuid) FROM anon, PUBLIC;

-- ============================================================

-- RPC 7: get_fund_positions_sum
-- Returns position totals for one fund. Admin-only.
CREATE OR REPLACE FUNCTION public.get_fund_positions_sum(
  p_fund_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  -- 1. Admin-only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- 2. Aggregate investor_positions for the fund
  SELECT json_build_object(
    'total_value',   COALESCE(SUM(CASE WHEN ip.is_active THEN ip.current_value ELSE 0 END), 0),
    'active_count',  COUNT(*) FILTER (WHERE ip.is_active),
    'total_count',   COUNT(*)
  )
  INTO v_result
  FROM public.investor_positions ip
  WHERE ip.fund_id = p_fund_id;

  RETURN v_result;
END;
$$;

ALTER FUNCTION public.get_fund_positions_sum(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_fund_positions_sum(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_fund_positions_sum(uuid) FROM anon, PUBLIC;

-- ============================================================

-- RPC 8: get_drift_summary
-- Admin-only integrity dashboard. Returns counts from reconciliation views
-- as a JSON object.
CREATE OR REPLACE FUNCTION public.get_drift_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_aum_mismatches            bigint;
  v_orphaned_positions        bigint;
  v_orphaned_transactions     bigint;
  v_yield_conservation_viol   bigint;
BEGIN
  -- 1. Admin-only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- 2. Count AUM/position health mismatches (non-healthy rows)
  SELECT COUNT(*) INTO v_aum_mismatches
  FROM public.v_fund_aum_position_health
  WHERE health_status <> 'healthy';

  -- 3. Count orphaned positions
  SELECT COUNT(*) INTO v_orphaned_positions
  FROM public.v_orphaned_positions;

  -- 4. Count orphaned transactions
  SELECT COUNT(*) INTO v_orphaned_transactions
  FROM public.v_orphaned_transactions;

  -- 5. Count yield conservation violations
  SELECT COUNT(*) INTO v_yield_conservation_viol
  FROM public.v_yield_conservation_violations;

  -- 6. Return JSON summary
  RETURN json_build_object(
    'aum_position_mismatches',       v_aum_mismatches,
    'orphaned_positions',            v_orphaned_positions,
    'orphaned_transactions',         v_orphaned_transactions,
    'yield_conservation_violations', v_yield_conservation_viol,
    'checked_at',                    NOW()
  );
END;
$$;

ALTER FUNCTION public.get_drift_summary() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_drift_summary() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_drift_summary() FROM anon, PUBLIC;
