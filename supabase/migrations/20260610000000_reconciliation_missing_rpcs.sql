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
    jsonb_build_object('previous_status', v_request.status),
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
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  v_admin_id := auth.uid();

  -- 2. Bypass immutability triggers
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

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

  -- 6. Void the transaction if found
  IF v_tx_id IS NOT NULL THEN
    v_void_result := public.void_transaction(v_tx_id, v_admin_id, p_reason);
  END IF;

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
