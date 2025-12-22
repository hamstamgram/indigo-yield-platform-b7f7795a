-- Add void tracking columns if not present
ALTER TABLE transactions_v2
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voided_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- Create void_transaction RPC
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
BEGIN
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Require reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Void reason must be at least 3 characters';
  END IF;
  
  -- Update transaction to voided
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = v_admin_id,
      void_reason = p_reason,
      updated_at = now()
  WHERE id = p_transaction_id;
  
  -- Recompute position for affected investor/fund
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'is_voided', false
    ),
    jsonb_build_object(
      'is_voided', true, 
      'voided_at', now(),
      'voided_by', v_admin_id,
      'void_reason', p_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'voided_amount', v_tx.amount
  );
END;
$$;

-- Create delete_transaction RPC (admin-only, voided transactions only)
CREATE OR REPLACE FUNCTION delete_transaction(
  p_transaction_id UUID,
  p_confirmation TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
BEGIN
  -- Require typed confirmation
  IF p_confirmation IS DISTINCT FROM 'DELETE TRANSACTION PERMANENTLY' THEN
    RAISE EXCEPTION 'Invalid confirmation. Type exactly: DELETE TRANSACTION PERMANENTLY';
  END IF;
  
  -- Verify admin
  IF NOT check_is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Get transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  
  -- Only allow deletion of voided transactions
  IF NOT v_tx.is_voided THEN
    RAISE EXCEPTION 'Can only delete voided transactions. Void first using void_transaction().';
  END IF;
  
  -- Audit log BEFORE delete (preserve full record)
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'DELETE_TRANSACTION', 
    'transactions_v2', 
    p_transaction_id::text, 
    v_admin_id,
    jsonb_build_object(
      'id', v_tx.id,
      'investor_id', v_tx.investor_id,
      'fund_id', v_tx.fund_id,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'reference_id', v_tx.reference_id,
      'notes', v_tx.notes,
      'is_voided', v_tx.is_voided,
      'voided_at', v_tx.voided_at,
      'voided_by', v_tx.voided_by,
      'void_reason', v_tx.void_reason,
      'created_at', v_tx.created_at
    ),
    jsonb_build_object('deleted', true, 'deleted_at', now())
  );
  
  -- Delete the transaction
  DELETE FROM transactions_v2 WHERE id = p_transaction_id;
  
  -- Recompute positions (should already be correct since tx was voided, but ensure consistency)
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'deleted_transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION void_transaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_transaction(UUID, TEXT) TO authenticated;