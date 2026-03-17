-- void_completed_withdrawal: Safely void a completed withdrawal.
-- Voids associated transactions (WITHDRAWAL + DUST_SWEEP), recomputes position.
-- Also fixes guard_withdrawal_state_transitions to allow completed → cancelled via canonical RPC.

-- 1. Fix the guard to allow completed → cancelled via canonical RPC
CREATE OR REPLACE FUNCTION public.guard_withdrawal_state_transitions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- GUARD: Block manual status changes to 'approved' or 'completed' unless via Canonical RPC
  IF (NEW.status IN ('approved', 'completed')) AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'CRITICAL: Status change to % must be performed via canonical Indigo RPC for financial reconciliation.', NEW.status;
  END IF;

  -- GUARD: Valid State Transitions
  -- Completed withdrawals can only be cancelled (voided) via canonical RPC
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    IF NEW.status = 'cancelled' AND public.is_canonical_rpc() THEN
      NULL; -- Allow void/cancel via RPC
    ELSE
      RAISE EXCEPTION 'INVALID TRANSITION: Completed withdrawals can only be voided via canonical RPC. Cannot change to %.', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'rejected' AND NEW.status NOT IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID TRANSITION: Rejected withdrawals must remain rejected or be cancelled.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. RPC to void completed withdrawals (voids transactions + recomputes position)
CREATE OR REPLACE FUNCTION public.void_completed_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT 'Voided by admin'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_request record;
  v_admin_id uuid;
  v_voided_tx_count int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  v_admin_id := auth.uid();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_withdrawal_id FOR UPDATE;
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_request.status NOT IN ('completed', 'pending', 'approved', 'processing') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot void withdrawal with status: ' || v_request.status);
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Void all related transactions (WITHDRAWAL + DUST_SWEEP)
  UPDATE transactions_v2
  SET is_voided = true, voided_by_profile_id = v_admin_id, voided_at = NOW(),
      void_reason = p_reason
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND type IN ('WITHDRAWAL', 'DUST_SWEEP')
    AND is_voided = false
    AND (
      reference_id LIKE '%' || p_withdrawal_id::text || '%'
      OR reference_id LIKE 'WDR-' || v_request.investor_id::text || '%'
    );
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- Update withdrawal status to cancelled
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_admin_id,
      cancelled_at = NOW(),
      admin_notes = COALESCE(admin_notes, '') || ' [VOIDED: ' || p_reason || ']',
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Recompute investor position
  PERFORM recompute_investor_position(v_request.investor_id, v_request.fund_id);

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'previous_status', v_request.status,
    'voided_transactions', v_voided_tx_count,
    'investor_id', v_request.investor_id,
    'fund_id', v_request.fund_id
  );
END;
$func$;
