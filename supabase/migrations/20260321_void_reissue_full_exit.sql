-- void_and_reissue_full_exit v2: cancel+recreate instead of reset-to-pending
-- Fixes: withdrawal state guard blocks completed->pending transition
-- New flow: void tx -> cancel old request -> create NEW request -> approve it

CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(p_transaction_id uuid, p_new_amount numeric, p_admin_id uuid, p_reason text, p_send_precision integer DEFAULT 3)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_new_request_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_orig.is_voided THEN RAISE EXCEPTION 'Transaction is already voided'; END IF;
  IF v_orig.type <> 'WITHDRAWAL' THEN RAISE EXCEPTION 'Only WITHDRAWAL transactions supported'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN RAISE EXCEPTION 'Reason must be at least 10 chars'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  -- STEP 1: Find linked withdrawal_request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id
    AND status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (request_date - v_orig.created_at))) < 86400
  ORDER BY request_date DESC LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'No linked withdrawal_request found. Use simple void-and-reissue.';
  END IF;
  v_request_id := v_request.id;

  -- STEP 2: Void the original transaction (cascades to dust sweeps)
  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);
  IF NOT COALESCE((v_void_result->>'''success''')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void: %', v_void_result;
  END IF;

  -- STEP 3: Re-activate investor position
  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  -- STEP 4: Cancel the old withdrawal_request (guard allows completed->cancelled via canonical RPC)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'V&R full-exit correction: ' || TRIM(p_reason),
      cancelled_by = p_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  -- STEP 5: Create a NEW pending withdrawal_request
  v_new_request_id := gen_random_uuid();
  INSERT INTO withdrawal_requests (
    id, fund_id, fund_class, investor_id, requested_amount, withdrawal_type,
    status, settlement_date, notes, created_by, updated_at
  ) VALUES (
    v_new_request_id,
    v_request.fund_id,
    v_request.fund_class,
    v_request.investor_id,
    ABS(p_new_amount),
    'full',
    'pending',
    CURRENT_DATE,
    'V&R correction of ' || v_request_id::text || ': ' || TRIM(p_reason),
    p_admin_id,
    NOW()
  );

  -- STEP 6: Approve the new request via approve_and_complete_withdrawal
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_new_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := true,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'''success''')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process: %', v_approve_result;
  END IF;

  -- STEP 7: Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_tx_id', p_transaction_id, 'original_amount', v_orig.amount,
      'old_request_id', v_request_id),
    jsonb_build_object('new_request_id', v_new_request_id, 'new_amount', p_new_amount,
      'approve_result', v_approve_result, 'void_result', v_void_result),
    jsonb_build_object('source', 'void_and_reissue_full_exit_rpc', 'reason', TRIM(p_reason))
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'''transaction_id''',
    'old_request_id', v_request_id,
    'new_request_id', v_new_request_id,
    'new_processed_amount', v_approve_result->>'''processed_amount''',
    'dust_amount', v_approve_result->>'''dust_amount''',
    'message', 'Full-exit withdrawal voided and re-processed'
  );
END;
$function$
;
