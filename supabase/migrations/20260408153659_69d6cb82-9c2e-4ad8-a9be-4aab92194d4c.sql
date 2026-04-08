
-- ============================================================
-- Restore canonical flag to 3 critical RPCs
-- Fixes: CANONICAL_MUTATION_REQUIRED error on void/edit/delete
-- ============================================================

-- 1. void_yield_distribution — full restore with canonical flag + complete cascade
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
    p_distribution_id uuid,
    p_admin_id uuid,
    p_reason text,
    p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_affected_investor RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
BEGIN
  -- CRITICAL: Set canonical flags so trigger allows UPDATE/DELETE on transactions_v2
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Acquire distribution-level lock
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  -- Handle crystal distributions
  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from ' || p_distribution_id::text, consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void ALL transactions linked to this distribution
  UPDATE transactions_v2
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_txs = ROW_COUNT;

  -- Void ledger entries
  UPDATE platform_fee_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_commission_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE fee_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;

  UPDATE yield_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void distribution header LAST
  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    status = 'voided', void_reason = p_reason WHERE id = p_distribution_id;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN SELECT DISTINCT investor_id FROM transactions_v2 WHERE distribution_id = p_distribution_id LOOP
    PERFORM public.acquire_position_lock(v_dist.fund_id, v_affected_investor.investor_id);
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recalculate AUM
  PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date, 'transaction'::aum_purpose);
  IF v_dist.purpose = 'reporting' THEN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date, 'reporting'::aum_purpose);
  END IF;

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_fee_allocations', v_voided_allocs,
      'voided_crystals', v_voided_crystals, 'v6_first_principles', true, 'fund_id', v_dist.fund_id));

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs, 'voided_fee_allocations', v_voided_allocs,
    'voided_crystals', v_voided_crystals);
END;
$function$;

-- 2. edit_transaction — add canonical flag
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_record transactions_v2%ROWTYPE;
  v_new_record transactions_v2%ROWTYPE;
  v_actor_id uuid;
  v_changes jsonb := '{}';
BEGIN
  -- CRITICAL: Set canonical flag so trigger allows UPDATE on transactions_v2
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Advisory lock: prevent concurrent edit/void of same transaction
  PERFORM pg_advisory_xact_lock(hashtext('edit_tx'), hashtext(p_transaction_id::text));

  v_actor_id := auth.uid();
  
  IF NOT public.check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can edit transactions';
  END IF;
  
  SELECT * INTO v_old_record FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF v_old_record.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  IF v_old_record.is_voided = true THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  -- FIRST PRINCIPLES: Historical Lock Check (Old Date)
  IF check_historical_lock(v_old_record.fund_id, v_old_record.tx_date) THEN
    RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot edit a transaction on % because a subsequent Yield Distribution is locked on the ledger.', v_old_record.tx_date;
  END IF;

  -- FIRST PRINCIPLES: Historical Lock Check (New Date)
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    IF check_historical_lock(v_old_record.fund_id, p_tx_date) THEN
      RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot move transaction to % because a subsequent Yield Distribution is locked on the ledger.', p_tx_date;
    END IF;
  END IF;
  
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
  
  IF v_changes = '{}' THEN
    RETURN jsonb_build_object('success', true, 'message', 'No changes detected');
  END IF;
  
  UPDATE transactions_v2
  SET notes = COALESCE(p_notes, notes), tx_hash = COALESCE(p_tx_hash, tx_hash),
      reference_id = COALESCE(p_reference_id, reference_id), tx_date = COALESCE(p_tx_date, tx_date),
      updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_new_record;
  
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', p_transaction_id::text, 'UPDATE', v_actor_id,
    to_jsonb(v_old_record), to_jsonb(v_new_record),
    jsonb_build_object('changes', v_changes, 'source', 'edit_transaction_rpc'));
  
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    PERFORM public.recompute_investor_position(v_old_record.investor_id, v_old_record.fund_id);
  END IF;
  
  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'changes', v_changes);
END;
$function$;

-- 3. delete_transaction — add canonical flag
CREATE OR REPLACE FUNCTION public.delete_transaction(
  p_transaction_id uuid,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_admin_id UUID := auth.uid();
BEGIN
  -- CRITICAL: Set canonical flag so trigger allows DELETE on transactions_v2
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

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
  
  -- Audit log BEFORE delete
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
  
  -- Recompute positions
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  RETURN jsonb_build_object(
    'success', true, 
    'deleted_transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id
  );
END;
$function$;

-- Permissions: ensure authenticated + service_role can call these
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.edit_transaction(uuid, text, text, text, date) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.edit_transaction(uuid, text, text, text, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.delete_transaction(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction(uuid, text) TO authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
