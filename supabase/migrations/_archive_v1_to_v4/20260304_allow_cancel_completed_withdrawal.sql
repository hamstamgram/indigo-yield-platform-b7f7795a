-- Allow cancelling/voiding completed withdrawals
-- When a completed withdrawal is cancelled, void the associated WITHDRAWAL + DUST transactions
-- The trg_ledger_sync trigger will automatically reverse the position changes
--
-- Fixes from audit:
--   1. void_reason (not voided_reason)
--   2. Reference patterns: WDR:{request_id}, DUST_SWEEP_OUT:{request_id}, DUST_RECV:{request_id}
--   3. Advisory lock to prevent concurrent voiding
--   4. FOR UPDATE on SELECT to prevent race conditions
--   5. Match both DUST_SWEEP and DUST types for sweep-out and credit transactions

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin(
  p_request_id uuid,
  p_reason text,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request RECORD;
  v_was_completed boolean := false;
  v_voided_count int := 0;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- Validate cancellation reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Advisory lock to prevent concurrent cancellation of the same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Get request details with row lock
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status NOT IN ('pending', 'approved', 'processing', 'completed') THEN
    RAISE EXCEPTION 'Can only cancel pending, approved, processing, or completed requests. Current status: %', v_request.status;
  END IF;

  v_was_completed := (v_request.status = 'completed');

  -- If completed, void the associated WITHDRAWAL and DUST transactions
  IF v_was_completed THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- Void WITHDRAWAL transaction (WDR:{request_id})
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal cancellation: ' || p_reason
    WHERE reference_id = 'WDR:' || p_request_id::text
      AND is_voided = false;
    GET DIAGNOSTICS v_voided_count = ROW_COUNT;

    -- Void DUST_SWEEP transaction (DUST_SWEEP_OUT:{request_id})
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal cancellation: ' || p_reason
    WHERE reference_id = 'DUST_SWEEP_OUT:' || p_request_id::text
      AND is_voided = false;

    -- Void DUST credit transaction to fees_account (DUST_RECV:{request_id})
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal cancellation: ' || p_reason
    WHERE reference_id = 'DUST_RECV:' || p_request_id::text
      AND is_voided = false;

    -- Re-activate the investor position if it was deactivated (full exit case)
    UPDATE investor_positions
    SET is_active = true, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id
      AND is_active = false;

    PERFORM set_config('indigo.canonical_rpc', 'false', true);
  END IF;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'cancel',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'admin_notes', p_admin_notes,
      'was_completed', v_was_completed,
      'transactions_voided', v_was_completed,
      'withdrawal_tx_voided', v_voided_count > 0
    )
  );

  RETURN TRUE;
END;
$$;

-- Also fix delete_withdrawal to allow completed status
CREATE OR REPLACE FUNCTION public.delete_withdrawal(
  p_withdrawal_id uuid,
  p_reason text,
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- SECURITY: Require admin privileges
  PERFORM public.ensure_admin();

  v_user_id := auth.uid();

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;

  -- Advisory lock to prevent concurrent deletion of the same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_withdrawal_id::text));

  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  -- If completed, void associated transactions first
  IF v_old_record.status = 'completed' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- Void WITHDRAWAL transaction
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal deletion: ' || p_reason
    WHERE reference_id = 'WDR:' || p_withdrawal_id::text
      AND is_voided = false;

    -- Void DUST_SWEEP transaction
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal deletion: ' || p_reason
    WHERE reference_id = 'DUST_SWEEP_OUT:' || p_withdrawal_id::text
      AND is_voided = false;

    -- Void DUST credit transaction to fees_account
    UPDATE transactions_v2
    SET is_voided = true,
        voided_at = NOW(),
        void_reason = 'Withdrawal deletion: ' || p_reason
    WHERE reference_id = 'DUST_RECV:' || p_withdrawal_id::text
      AND is_voided = false;

    -- Re-activate the investor position if deactivated (full exit)
    UPDATE investor_positions
    SET is_active = true, updated_at = NOW()
    WHERE investor_id = v_old_record.investor_id
      AND fund_id = v_old_record.fund_id
      AND is_active = false;

    PERFORM set_config('indigo.canonical_rpc', 'false', true);
  END IF;

  IF p_hard_delete THEN
    DELETE FROM withdrawal_requests WHERE id = p_withdrawal_id;
  ELSE
    UPDATE withdrawal_requests
    SET
      status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
    WHERE id = p_withdrawal_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
