-- Create cancel_withdrawal_by_investor RPC
-- This allows investors to cancel their own pending withdrawal requests
-- with proper state machine validation and audit logging

CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_investor(
  p_request_id uuid,
  p_investor_id uuid,
  p_reason text DEFAULT 'Cancelled by investor'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  -- Get the withdrawal request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'Withdrawal request not found'
    );
  END IF;

  -- Verify ownership
  IF v_request.investor_id != p_investor_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHORIZED',
      'message', 'You can only cancel your own withdrawal requests'
    );
  END IF;

  -- Validate state transition (only pending can be cancelled by investor)
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE',
      'message', format('Cannot cancel withdrawal in %s status', v_request.status)
    );
  END IF;

  -- Perform the update
  UPDATE withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_at = now(),
    cancelled_by = p_investor_id
  WHERE id = p_request_id;

  -- Log to audit
  INSERT INTO audit_log (entity, entity_id, action, actor_user, meta)
  VALUES (
    'withdrawal_requests',
    p_request_id::text,
    'cancel_by_investor',
    p_investor_id,
    jsonb_build_object('reason', p_reason, 'previous_status', v_request.status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request cancelled successfully'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal_by_investor(uuid, uuid, text) TO authenticated;