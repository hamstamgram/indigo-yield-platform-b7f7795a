-- Fix force_delete_investor: correct column name for ib_commission_ledger
-- The table uses 'ib_id' not 'ib_investor_id'

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_counts jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can force delete investors';
  END IF;

  -- Delete from ib_commission_ledger (uses ib_id column)
  DELETE FROM ib_commission_ledger WHERE ib_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ib_commission_ledger', v_count);

  -- Delete from ib_allocations (uses ib_investor_id column)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ib_allocations', v_count);

  -- Delete from fee_allocations
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('fee_allocations', v_count);

  -- Delete from transactions_v2
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('transactions_v2', v_count);

  -- Delete from investor_positions
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_positions', v_count);

  -- Delete from withdrawal_requests
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('withdrawal_requests', v_count);

  -- Delete from documents
  DELETE FROM documents WHERE user_profile_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('documents', v_count);

  -- Delete from investor_emails
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_emails', v_count);

  -- Delete from investor_fee_schedule
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_fee_schedule', v_count);

  -- Delete from user_roles
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('user_roles', v_count);

  -- Delete from access_logs
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('access_logs', v_count);

  -- Finally delete the profile
  DELETE FROM profiles WHERE id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('profiles', v_count);

  -- Log the deletion
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'FORCE_DELETE_INVESTOR',
    'profiles',
    p_investor_id::text,
    auth.uid(),
    v_deleted_counts
  );

  RETURN jsonb_build_object(
    'success', true,
    'investor_id', p_investor_id,
    'deleted_counts', v_deleted_counts
  );
END;
$$;