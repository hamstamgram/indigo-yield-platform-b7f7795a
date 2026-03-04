-- Allow cancelling/voiding completed withdrawals
-- When a completed withdrawal is cancelled, void the associated WITHDRAWAL + DUST_SWEEP transactions
-- The trg_ledger_sync trigger will automatically reverse the position changes

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
  v_tx RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- Validate cancellation reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status NOT IN ('pending', 'approved', 'processing', 'completed') THEN
    RAISE EXCEPTION 'Can only cancel pending, approved, processing, or completed requests. Current status: %', v_request.status;
  END IF;

  v_was_completed := (v_request.status = 'completed');

  -- If completed, void the associated WITHDRAWAL and DUST_SWEEP transactions
  IF v_was_completed THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- Void all non-voided transactions linked to this withdrawal
    FOR v_tx IN
      SELECT id, type, reference_id FROM transactions_v2
      WHERE investor_id = v_request.investor_id
        AND fund_id = v_request.fund_id
        AND is_voided = false
        AND (
          -- Match WITHDRAWAL transactions by reference pattern WDR-{investor_id}-...
          (type = 'WITHDRAWAL' AND reference_id LIKE 'WDR-' || v_request.investor_id || '-%'
           AND tx_date >= COALESCE(v_request.approved_at::date, v_request.request_date))
          OR
          -- Match DUST_SWEEP transactions by reference pattern dust-{sweep|credit}-{request_id}
          (type = 'DUST_SWEEP' AND (
            reference_id = 'dust-sweep-' || p_request_id::text
            OR reference_id = 'dust-credit-' || p_request_id::text
          ))
        )
    LOOP
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = NOW(),
          voided_reason = 'Withdrawal cancellation: ' || p_reason
      WHERE id = v_tx.id;
    END LOOP;

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
      'transactions_voided', v_was_completed
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
  v_tx RECORD;
BEGIN
  -- SECURITY: Require admin privileges
  PERFORM public.ensure_admin();

  v_user_id := auth.uid();

  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;

  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  -- If completed, void associated transactions first
  IF v_old_record.status = 'completed' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    FOR v_tx IN
      SELECT id FROM transactions_v2
      WHERE investor_id = v_old_record.investor_id
        AND fund_id = v_old_record.fund_id
        AND is_voided = false
        AND (
          (type = 'WITHDRAWAL' AND reference_id LIKE 'WDR-' || v_old_record.investor_id || '-%'
           AND tx_date >= COALESCE(v_old_record.approved_at::date, v_old_record.request_date))
          OR
          (type = 'DUST_SWEEP' AND (
            reference_id = 'dust-sweep-' || p_withdrawal_id::text
            OR reference_id = 'dust-credit-' || p_withdrawal_id::text
          ))
        )
    LOOP
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = NOW(),
          voided_reason = 'Withdrawal deletion: ' || p_reason
      WHERE id = v_tx.id;
    END LOOP;

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
