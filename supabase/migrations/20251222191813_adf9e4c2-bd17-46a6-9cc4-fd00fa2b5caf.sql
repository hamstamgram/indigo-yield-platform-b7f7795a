
-- Phase 2B: Strengthen Admin RLS Check with profiles.is_admin fallback
-- This ensures admins are recognized even if not in user_roles table

CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = check_is_admin.user_id
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = check_is_admin.user_id
    AND profiles.is_admin = true
  )
$$;

-- Phase 2C: Create Safe Edit Transaction RPC
-- Only allows editing metadata fields, writes to audit_log

CREATE OR REPLACE FUNCTION public.edit_transaction(
  p_transaction_id uuid,
  p_notes text DEFAULT NULL,
  p_tx_hash text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_tx_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_record transactions_v2%ROWTYPE;
  v_new_record transactions_v2%ROWTYPE;
  v_actor_id uuid;
  v_changes jsonb := '{}';
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  -- Check admin permission
  IF NOT public.check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can edit transactions';
  END IF;
  
  -- Get the existing transaction
  SELECT * INTO v_old_record
  FROM transactions_v2
  WHERE id = p_transaction_id;
  
  IF v_old_record.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  -- Cannot edit voided transactions
  IF v_old_record.is_voided = true THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;
  
  -- Build changes object and update fields
  IF p_notes IS NOT NULL AND p_notes IS DISTINCT FROM v_old_record.notes THEN
    v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes));
  END IF;
  
  IF p_tx_hash IS NOT NULL AND p_tx_hash IS DISTINCT FROM v_old_record.tx_hash THEN
    v_changes := v_changes || jsonb_build_object('tx_hash', jsonb_build_object('old', v_old_record.tx_hash, 'new', p_tx_hash));
  END IF;
  
  IF p_reference_id IS NOT NULL AND p_reference_id IS DISTINCT FROM v_old_record.reference_id THEN
    v_changes := v_changes || jsonb_build_object('reference_id', jsonb_build_object('old', v_old_record.reference_id, 'new', p_reference_id));
  END IF;
  
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    v_changes := v_changes || jsonb_build_object('tx_date', jsonb_build_object('old', v_old_record.tx_date, 'new', p_tx_date));
  END IF;
  
  -- If no changes, return early
  IF v_changes = '{}' THEN
    RETURN jsonb_build_object('success', true, 'message', 'No changes detected');
  END IF;
  
  -- Update the transaction
  UPDATE transactions_v2
  SET
    notes = COALESCE(p_notes, notes),
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    reference_id = COALESCE(p_reference_id, reference_id),
    tx_date = COALESCE(p_tx_date, tx_date),
    updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_new_record;
  
  -- Write to audit_log
  INSERT INTO audit_log (
    entity,
    entity_id,
    action,
    actor_user,
    old_values,
    new_values,
    meta
  ) VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'UPDATE',
    v_actor_id,
    to_jsonb(v_old_record),
    to_jsonb(v_new_record),
    jsonb_build_object('changes', v_changes, 'source', 'edit_transaction_rpc')
  );
  
  -- If tx_date changed, recompute position
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    PERFORM public.recompute_investor_position(v_old_record.investor_id, v_old_record.fund_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'changes', v_changes
  );
END;
$$;

-- Create repair_all_positions function for bulk position repair
CREATE OR REPLACE FUNCTION public.repair_all_positions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_count integer := 0;
  v_investor RECORD;
BEGIN
  -- Get current user
  v_actor_id := auth.uid();
  
  -- Check admin permission
  IF NOT public.check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can run position repair';
  END IF;
  
  -- Loop through all unique investor/fund combinations
  FOR v_investor IN 
    SELECT DISTINCT investor_id, fund_id 
    FROM transactions_v2 
    WHERE is_voided = false
  LOOP
    PERFORM public.recompute_investor_position(v_investor.investor_id, v_investor.fund_id);
    v_count := v_count + 1;
  END LOOP;
  
  -- Write to audit_log
  INSERT INTO audit_log (
    entity,
    entity_id,
    action,
    actor_user,
    meta
  ) VALUES (
    'investor_positions',
    'bulk_repair',
    'REPAIR',
    v_actor_id,
    jsonb_build_object('positions_repaired', v_count, 'source', 'repair_all_positions')
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'positions_repaired', v_count
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.edit_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_all_positions TO authenticated;
