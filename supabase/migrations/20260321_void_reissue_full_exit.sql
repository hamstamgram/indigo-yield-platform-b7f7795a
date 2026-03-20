-- Migration: void_and_reissue_full_exit RPC
-- For correcting full-exit withdrawals: voids original tx + dust sweeps,
-- resets withdrawal_request to pending, then re-processes via
-- approve_and_complete_withdrawal (reusing all truncation/dust/fees logic).
--
-- Safe: Only operates on WITHDRAWAL type transactions. Uses advisory locks.
-- Reuses existing approve_and_complete_withdrawal — no logic duplication.

CREATE OR REPLACE FUNCTION "public"."void_and_reissue_full_exit"(
  "p_transaction_id" uuid,
  "p_new_amount" numeric,
  "p_admin_id" uuid,
  "p_reason" text,
  "p_send_precision" integer DEFAULT 3
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_position RECORD;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Verify admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Fetch and validate original transaction
  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF v_orig.type <> 'WITHDRAWAL' THEN
    RAISE EXCEPTION 'This function only handles WITHDRAWAL transactions. Use void_and_reissue_transaction for other types.';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  -- Advisory lock on investor+fund
  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  -- =========================================================================
  -- STEP 1: Find the linked withdrawal_request
  -- =========================================================================
  -- Match by investor_id, fund_id, and completed status with tx_date proximity
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id
    AND status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (request_date - v_orig.created_at))) < 86400  -- within 24h
  ORDER BY request_date DESC
  LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'No linked withdrawal_request found for this transaction. Use simple void-and-reissue instead.';
  END IF;

  v_request_id := v_request.id;

  -- =========================================================================
  -- STEP 2: Void the original transaction (cascades to dust sweeps via v6)
  -- =========================================================================
  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', v_void_result->>'message', 'Unknown error');
  END IF;

  -- =========================================================================
  -- STEP 3: Re-activate investor position (void set it to deactivated)
  -- =========================================================================
  -- After voiding, trg_ledger_sync should have restored the position balance.
  -- But is_active may have been set to false by the original full-exit.
  -- Re-activate it so approve_and_complete_withdrawal can read the balance.
  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id;

  -- =========================================================================
  -- STEP 4: Reset withdrawal_request to 'pending' so it can be re-processed
  -- =========================================================================
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE withdrawal_requests
  SET
    status = 'pending',
    requested_amount = ABS(p_new_amount),
    approved_amount = NULL,
    approved_by = NULL,
    approved_at = NULL,
    processed_amount = NULL,
    processed_at = NULL,
    admin_notes = COALESCE(admin_notes, '') || E'\n[V&R Reset ' || now()::text || ': ' || TRIM(p_reason) || ']',
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  -- =========================================================================
  -- STEP 5: Re-process via approve_and_complete_withdrawal
  -- =========================================================================
  -- This reuses ALL existing logic: crystallization, truncation, dust sweep,
  -- fees routing, position update, AUM recalculation, audit logging.
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := true,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process withdrawal: %', COALESCE(v_approve_result->>'error', v_approve_result->>'message', 'Unknown error');
  END IF;

  -- =========================================================================
  -- STEP 6: Audit log
  -- =========================================================================
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT',
    'transactions_v2',
    p_transaction_id::text,
    p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_transaction_id,
      'original_amount', v_orig.amount,
      'withdrawal_request_id', v_request_id
    ),
    jsonb_build_object(
      'new_amount', p_new_amount,
      'approve_result', v_approve_result,
      'void_result', v_void_result
    ),
    jsonb_build_object(
      'source', 'void_and_reissue_full_exit_rpc',
      'reason', TRIM(p_reason),
      'send_precision', p_send_precision
    )
  );

  -- =========================================================================
  -- STEP 7: Return result
  -- =========================================================================
  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'transaction_id',
    'withdrawal_request_id', v_request_id,
    'new_processed_amount', v_approve_result->>'processed_amount',
    'dust_amount', v_approve_result->>'dust_amount',
    'dust_tx_id', v_approve_result->>'dust_tx_id',
    'void_result', v_void_result,
    'message', 'Full-exit withdrawal voided and re-processed successfully'
  );
END;
$$;

ALTER FUNCTION "public"."void_and_reissue_full_exit"(uuid, numeric, uuid, text, integer) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."void_and_reissue_full_exit" IS 'Void and reissue a full-exit withdrawal. Voids original tx + dust sweeps, resets withdrawal_request, re-processes via approve_and_complete_withdrawal with full truncation/dust/fees logic.';
