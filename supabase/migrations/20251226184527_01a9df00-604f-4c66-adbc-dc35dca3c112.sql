-- Fix withdrawal RPC functions: correct table name
-- Change withdrawal_audit_log (singular) → withdrawal_audit_logs (plural)

-- Drop and recreate delete_withdrawal with correct table name
DROP FUNCTION IF EXISTS public.delete_withdrawal(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.delete_withdrawal(
  p_withdrawal_id uuid, 
  p_reason text, 
  p_hard_delete boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'Reason is required for deletion';
  END IF;
  
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF v_old_record.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete completed withdrawal - use reversal transaction instead';
  END IF;
  
  IF p_hard_delete THEN
    -- Insert audit log BEFORE deletion (using correct table name: withdrawal_audit_logs)
    INSERT INTO withdrawal_audit_logs (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel'::withdrawal_action, 
      v_user_id,
      jsonb_build_object(
        'reason', p_reason,
        'hard_delete', true,
        'previous_status', v_old_record.status,
        'deleted_record', row_to_json(v_old_record)
      )
    );
    
    DELETE FROM withdrawal_requests WHERE id = p_withdrawal_id;
  ELSE
    UPDATE withdrawal_requests
    SET
      status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_user_id,
      updated_at = now()
    WHERE id = p_withdrawal_id;
    
    -- Insert audit log (using correct table name: withdrawal_audit_logs)
    INSERT INTO withdrawal_audit_logs (request_id, action, actor_id, details)
    VALUES (
      p_withdrawal_id, 
      'cancel'::withdrawal_action, 
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
$function$;

-- Drop and recreate update_withdrawal with correct table name
DROP FUNCTION IF EXISTS public.update_withdrawal(uuid, numeric, text, text, text);

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
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_record withdrawal_requests%ROWTYPE;
  v_user_id uuid;
  v_changes jsonb := '{}';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT * INTO v_old_record
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  
  IF v_old_record.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cannot edit withdrawal with status: %', v_old_record.status;
  END IF;
  
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
  
  UPDATE withdrawal_requests
  SET
    requested_amount = COALESCE(p_requested_amount, requested_amount),
    withdrawal_type = COALESCE(p_withdrawal_type, withdrawal_type),
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE notes END,
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  -- Insert audit log (using correct table name: withdrawal_audit_logs)
  INSERT INTO withdrawal_audit_logs (request_id, action, actor_id, details)
  VALUES (
    p_withdrawal_id, 
    'update'::withdrawal_action, 
    v_user_id,
    jsonb_build_object(
      'reason', p_reason,
      'changes', v_changes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'changes', v_changes);
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_withdrawal(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_withdrawal(uuid, numeric, text, text, text) TO authenticated;