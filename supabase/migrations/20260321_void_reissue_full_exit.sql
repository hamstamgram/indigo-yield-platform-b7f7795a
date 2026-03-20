CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(
  p_transaction_id uuid,
  p_new_amount numeric,
  p_admin_id uuid,
  p_reason text,
  p_send_precision integer DEFAULT 3
) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_new_request_id uuid;
  v_balance numeric(28,10);
  v_dust numeric(28,10);
  v_fees_account_id uuid;
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fund RECORD;
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

  -- Find linked withdrawal_request
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

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = v_orig.fund_id;

  -- Void original transaction (cascades to dust sweeps)
  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);
  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction';
  END IF;

  -- Re-activate investor position
  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  -- Cancel old withdrawal_request
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'V&R full-exit correction: ' || TRIM(p_reason),
      cancelled_by = p_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  -- Create NEW pending withdrawal_request with the EXACT amount admin entered
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

  -- Approve with p_is_full_exit = FALSE so it uses the exact p_processed_amount
  -- (full_exit=true would TRUNC(balance,3) which ignores our entered amount)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_new_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := false,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process withdrawal';
  END IF;

  -- Now handle dust manually: balance after withdrawal - entered amount
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_dust := v_balance;  -- Whatever is left after the withdrawal IS the dust

  IF v_dust > 0 THEN
    -- Find fees account
    SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

    IF v_fees_account_id IS NOT NULL THEN
      PERFORM set_config('indigo.canonical_rpc', 'true', true);

      -- Dust debit from investor
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_orig.investor_id, 'DUST_SWEEP', -ABS(v_dust),
        CURRENT_DATE, v_fund.asset,
        'dust-sweep-' || v_new_request_id::text,
        'V&R dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_tx_id;

      -- Dust credit to fees account
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_fees_account_id, 'DUST_SWEEP', ABS(v_dust),
        CURRENT_DATE, v_fund.asset,
        'dust-credit-' || v_new_request_id::text,
        'Dust received from V&R of ' || v_orig.investor_id::text,
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_credit_tx_id;

      -- Deactivate investor position (balance should now be 0)
      UPDATE investor_positions
      SET is_active = false, updated_at = NOW()
      WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
    END IF;
  ELSE
    -- No dust, just deactivate position
    UPDATE investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_tx_id', p_transaction_id, 'original_amount', v_orig.amount,
      'old_request_id', v_request_id),
    jsonb_build_object('new_request_id', v_new_request_id, 'new_amount', p_new_amount,
      'dust_amount', v_dust, 'approve_result', v_approve_result),
    jsonb_build_object('source', 'void_and_reissue_full_exit_rpc_v3', 'reason', TRIM(p_reason))
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'transaction_id',
    'old_request_id', v_request_id,
    'new_request_id', v_new_request_id,
    'new_processed_amount', ABS(p_new_amount),
    'dust_amount', v_dust,
    'message', 'Full-exit withdrawal corrected to ' || ABS(p_new_amount)::text
  );
END;
$$;

ALTER FUNCTION public.void_and_reissue_full_exit(uuid, numeric, uuid, text, integer) OWNER TO postgres;
