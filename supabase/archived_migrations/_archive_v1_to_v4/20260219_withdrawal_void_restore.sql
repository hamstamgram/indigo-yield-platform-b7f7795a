-- Migration: Add restore_withdrawal_by_admin RPC
-- Purpose: Allow admins to restore cancelled/rejected withdrawals back to pending
-- This extends the withdrawal state machine to allow admin-driven un-cancellation

-- Create the restore RPC
CREATE OR REPLACE FUNCTION public.restore_withdrawal_by_admin(
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
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Restore reason is required (minimum 3 characters)';
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Only cancelled or rejected withdrawals can be restored
  IF v_request.status NOT IN ('cancelled', 'rejected') THEN
    RAISE EXCEPTION 'Can only restore cancelled or rejected requests. Current status: %', v_request.status;
  END IF;

  -- Restore to pending status, clear cancellation/rejection fields
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
    admin_notes = COALESCE(p_admin_notes, 'Restored: ' || p_reason)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'restore',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'admin_notes', p_admin_notes,
      'restored_by', auth.uid()
    )
  );

  RETURN TRUE;
END;
$$;

ALTER FUNCTION public.restore_withdrawal_by_admin(uuid, text, text) OWNER TO postgres;

COMMENT ON FUNCTION public.restore_withdrawal_by_admin(uuid, text, text)
IS 'Admin function to restore a cancelled or rejected withdrawal back to pending status. Clears all cancellation/rejection metadata. Logged for audit.';

-- Grant execute to authenticated users (RLS + ensure_admin() handles authorization)
GRANT EXECUTE ON FUNCTION public.restore_withdrawal_by_admin(uuid, text, text) TO authenticated;
