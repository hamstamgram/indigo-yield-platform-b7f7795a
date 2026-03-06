-- Fix withdrawal RPC functions: correct table name and column names
-- Change withdrawal_audit_log → withdrawal_audit_logs
-- Change details → metadata

CREATE OR REPLACE FUNCTION update_withdrawal(
  p_withdrawal_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record RECORD;
  v_result JSON;
BEGIN
  -- Get current record
  SELECT * INTO v_old_record FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  -- Update the withdrawal
  UPDATE withdrawals
  SET
    amount = COALESCE(p_amount, amount),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Log to audit
  INSERT INTO withdrawal_audit_logs (withdrawal_id, action, actor_id, metadata)
  VALUES (
    p_withdrawal_id,
    'UPDATE',
    COALESCE(p_actor_id, auth.uid()),
    json_build_object(
      'old_amount', v_old_record.amount,
      'new_amount', COALESCE(p_amount, v_old_record.amount),
      'old_notes', v_old_record.notes,
      'new_notes', COALESCE(p_notes, v_old_record.notes)
    )
  );

  SELECT json_build_object('success', true, 'id', p_withdrawal_id) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION delete_withdrawal(
  p_withdrawal_id UUID,
  p_actor_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record RECORD;
  v_result JSON;
BEGIN
  -- Get current record
  SELECT * INTO v_old_record FROM withdrawals WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  -- Log to audit before deletion
  INSERT INTO withdrawal_audit_logs (withdrawal_id, action, actor_id, metadata)
  VALUES (
    p_withdrawal_id,
    'DELETE',
    COALESCE(p_actor_id, auth.uid()),
    json_build_object(
      'reason', COALESCE(p_reason, 'No reason provided'),
      'deleted_record', row_to_json(v_old_record)
    )
  );

  -- Delete the withdrawal
  DELETE FROM withdrawals WHERE id = p_withdrawal_id;

  SELECT json_build_object('success', true, 'deleted_id', p_withdrawal_id) INTO v_result;
  RETURN v_result;
END;
$$;