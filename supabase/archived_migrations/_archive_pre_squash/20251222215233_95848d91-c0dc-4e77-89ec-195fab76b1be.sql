-- Update Withdrawal RPC Function
CREATE OR REPLACE FUNCTION public.update_withdrawal(
  p_withdrawal_id uuid,
  p_requested_amount numeric DEFAULT NULL,
  p_withdrawal_type text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
  v_changes jsonb := '{}';
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get current withdrawal
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  -- Only allow editing pending/approved withdrawals
  IF v_old_record.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cannot edit withdrawal with status: %', v_old_record.status;
  END IF;
  
  -- Build changes object and update
  IF p_requested_amount IS NOT NULL AND p_requested_amount != v_old_record.requested_amount THEN
    v_changes := v_changes || jsonb_build_object(
      'requested_amount', jsonb_build_object('old', v_old_record.requested_amount, 'new', p_requested_amount)
    );
  END IF;
  
  IF p_withdrawal_type IS NOT NULL AND p_withdrawal_type != v_old_record.withdrawal_type THEN
    v_changes := v_changes || jsonb_build_object(
      'withdrawal_type', jsonb_build_object('old', v_old_record.withdrawal_type, 'new', p_withdrawal_type)
    );
  END IF;
  
  IF p_notes IS NOT NULL AND COALESCE(p_notes, '') != COALESCE(v_old_record.notes, '') THEN
    v_changes := v_changes || jsonb_build_object(
      'notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes)
    );
  END IF;
  
  -- Update the record
  UPDATE withdrawal_requests
  SET
    requested_amount = COALESCE(p_requested_amount, requested_amount),
    withdrawal_type = COALESCE(p_withdrawal_type, withdrawal_type),
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  -- Log the update in audit
  INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
  VALUES (
    p_withdrawal_id, 
    'update', 
    v_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'changes', v_changes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'changes', v_changes);
END;
$$;

-- Delete (Cancel) Withdrawal RPC Function
CREATE OR REPLACE FUNCTION public.delete_withdrawal(
  p_withdrawal_id uuid,
  p_reason text,
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;
  
  -- Get current withdrawal
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  -- For completed withdrawals, don't allow deletion
  IF v_old_record.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete completed withdrawal - use reversal transaction instead';
  END IF;
  
  IF p_hard_delete THEN
    -- Log before hard delete
    INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel', 
      v_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'hard_delete', true,
        'previous_status', v_old_record.status,
        'deleted_record', row_to_json(v_old_record)
      )
    );
    
    -- Hard delete
    DELETE FROM withdrawal_requests WHERE id = p_withdrawal_id;
  ELSE
    -- Soft delete (mark as cancelled)
    UPDATE withdrawal_requests
    SET
      status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
    WHERE id = p_withdrawal_id;
    
    -- Log the cancellation
    INSERT INTO withdrawal_audit_log (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel', 
      v_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'hard_delete', false,
        'previous_status', v_old_record.status
      )
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_withdrawal TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_withdrawal TO authenticated;