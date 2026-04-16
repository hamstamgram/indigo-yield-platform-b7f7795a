
-- ============================================================
-- Migration: Withdrawal State Machine Compliance RPCs
-- Fixes 5 bugs where direct .update() calls bypass guards
-- ============================================================

-- 1. route_withdrawal_to_fees: Route pending withdrawal to INDIGO FEES
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(
  p_request_id uuid,
  p_reason text DEFAULT 'Routed to INDIGO FEES'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- Advisory lock on the withdrawal request
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- Get request details
  SELECT wr.*, f.asset
  INTO v_request
  FROM public.withdrawal_requests wr
  JOIN public.funds f ON f.id = wr.fund_id
  WHERE wr.id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Can only route pending withdrawals to fees. Current status: %', v_request.status;
  END IF;

  -- Set canonical flag so state machine guard permits the transition
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Create DUST_SWEEP transaction: debit from investor
  INSERT INTO public.transactions_v2 (
    fund_id, investor_id, tx_type, amount, tx_date, value_date,
    reference_id, notes, purpose, visibility_scope, is_system_generated
  ) VALUES (
    v_request.fund_id,
    v_request.investor_id,
    'DUST_SWEEP',
    v_request.requested_amount,
    CURRENT_DATE,
    CURRENT_DATE,
    'route-to-fees-' || p_request_id::text,
    'Routed to INDIGO FEES: ' || COALESCE(p_reason, 'Admin action'),
    'transaction',
    'admin_only',
    true
  );

  -- Create DUST_SWEEP transaction: credit to fees account
  INSERT INTO public.transactions_v2 (
    fund_id, investor_id, tx_type, amount, tx_date, value_date,
    reference_id, notes, purpose, visibility_scope, is_system_generated
  ) VALUES (
    v_request.fund_id,
    v_fees_account_id,
    'DUST_SWEEP',
    v_request.requested_amount,
    CURRENT_DATE,
    CURRENT_DATE,
    'route-to-fees-credit-' || p_request_id::text,
    'INDIGO FEES credit from routed withdrawal: ' || p_request_id::text,
    'transaction',
    'admin_only',
    true
  );

  -- Update withdrawal status to completed
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_amount = v_request.requested_amount,
    admin_notes = COALESCE(p_reason, 'Routed to INDIGO FEES'),
    processed_at = now()
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, new_values)
  VALUES (
    auth.uid(),
    'ROUTE_TO_FEES',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object(
      'reason', p_reason,
      'amount', v_request.requested_amount,
      'investor_id', v_request.investor_id,
      'fund_id', v_request.fund_id
    )
  );

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.route_withdrawal_to_fees(uuid, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.route_withdrawal_to_fees(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.route_withdrawal_to_fees(uuid, text) FROM anon, PUBLIC;

-- 2. restore_withdrawal_by_admin_v2: Restore cancelled/rejected → pending
CREATE OR REPLACE FUNCTION public.restore_withdrawal_by_admin_v2(
  p_request_id uuid,
  p_reason text,
  p_admin_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Restore reason is required (minimum 3 characters)';
  END IF;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status NOT IN ('cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Can only restore cancelled or rejected requests. Current status: %', v_request.status;
  END IF;

  -- Set canonical flag so guards permit terminal → pending transition
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Restore to pending, clear all terminal metadata
  UPDATE public.withdrawal_requests
  SET
    status = 'pending',
    cancellation_reason = NULL,
    cancelled_by = NULL,
    cancelled_at = NULL,
    rejection_reason = NULL,
    rejected_by = NULL,
    rejected_at = NULL,
    approved_amount = NULL,
    approved_by = NULL,
    approved_at = NULL,
    processed_amount = NULL,
    processed_at = NULL,
    admin_notes = COALESCE(p_admin_notes, 'Restored: ' || p_reason)
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    auth.uid(),
    'RESTORE_WITHDRAWAL',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('previous_status', v_request.status),
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes,
      'new_status', 'pending'
    )
  );

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.restore_withdrawal_by_admin_v2(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.restore_withdrawal_by_admin_v2(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_withdrawal_by_admin_v2(uuid, text, text) FROM anon, PUBLIC;

-- 3. cancel_withdrawal_by_admin_v2: Cancel pending/approved withdrawal with audit
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin_v2(
  p_request_id uuid,
  p_reason text,
  p_admin_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin privileges required';
  END IF;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_request_id::text));

  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Only pending or approved can be cancelled via this path
  -- Completed withdrawals must use void_completed_withdrawal
  IF v_request.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Can only cancel pending or approved requests via this path. Current status: %. Use void_completed_withdrawal for completed ones.', v_request.status;
  END IF;

  -- Set canonical flag
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  UPDATE public.withdrawal_requests
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = now(),
    admin_notes = COALESCE(p_admin_notes, p_reason)
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    auth.uid(),
    'CANCEL_WITHDRAWAL_ADMIN',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('previous_status', v_request.status),
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes,
      'new_status', 'cancelled'
    )
  );

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_withdrawal_by_admin_v2(uuid, text, text) FROM anon, PUBLIC;

-- Also update the guard to allow restore from terminal states when canonical flag is set
CREATE OR REPLACE FUNCTION public.guard_withdrawal_state_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- GUARD: Block manual status changes to 'approved' or 'completed' unless via Canonical RPC
  IF (NEW.status IN ('approved', 'completed')) AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'CRITICAL: Status change to % must be performed via canonical Indigo RPC for financial reconciliation.', NEW.status;
  END IF;

  -- GUARD: Completed withdrawals cannot be rolled back unless via canonical RPC
  IF OLD.status = 'completed' AND NEW.status != 'completed' AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'INVALID TRANSITION: Completed withdrawals cannot be rolled back to % without canonical RPC.', NEW.status;
  END IF;

  -- GUARD: Terminal states (rejected/cancelled) can only transition via canonical RPC
  IF OLD.status IN ('rejected', 'cancelled') AND NEW.status != OLD.status AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'INVALID TRANSITION: % withdrawals can only be transitioned via canonical RPC.', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
