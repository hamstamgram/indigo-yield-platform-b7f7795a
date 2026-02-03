-- Bug #11: Create void_and_reissue_transaction RPC
-- Atomically voids an existing transaction and creates a corrected replacement.
-- Blocks system-generated transactions (yield/fee/IB) — use void yield distribution instead.

CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text DEFAULT NULL,
  p_new_tx_hash text DEFAULT NULL,
  p_closing_aum numeric DEFAULT NULL,
  p_reason text DEFAULT 'Void and reissue correction'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_position RECORD;
  v_void_result jsonb;
  v_new_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_computed_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- 1. Validate admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- 2. Get original transaction
  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  -- 3. Validate not already voided
  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  -- 4. Validate reason length
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  -- 5. Block system-generated transactions
  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  -- 6. Advisory lock on investor+fund to prevent concurrent modifications
  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  -- 7. Void the original transaction (handles position reversal)
  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  -- 8. Read current position (post-void) for balance_before
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0);

  -- 9. Generate new transaction ID
  v_new_tx_id := gen_random_uuid();

  -- 10. Insert new corrected transaction (copy original type + subtype)
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, tx_subtype, amount, tx_date,
    notes, tx_hash, reference_id, correction_id,
    balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_tx_id,
    v_orig.investor_id,
    v_orig.fund_id,
    v_orig.type,
    v_orig.tx_subtype,
    p_new_amount,
    p_new_date,
    COALESCE(p_new_notes, v_orig.notes),
    COALESCE(p_new_tx_hash, v_orig.tx_hash),
    'reissue_' || p_original_tx_id::text,
    p_original_tx_id,
    v_balance_before,
    v_balance_before + p_new_amount,
    false,
    p_admin_id,
    NOW()
  );

  v_balance_after := v_balance_before + p_new_amount;

  -- 11. Update investor position
  UPDATE investor_positions
  SET current_value = current_value + p_new_amount,
      updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  -- If position doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
    VALUES (v_orig.investor_id, v_orig.fund_id, p_new_amount, p_new_amount, v_orig.currency, NOW());
  END IF;

  -- 12. Auto-compute closing AUM (or use provided)
  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

  -- 13. Insert fund_aum_events
  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_orig.fund_id,
    'reissue',
    p_new_amount,
    v_computed_closing_aum,
    v_new_tx_id,
    v_orig.investor_id,
    p_new_date,
    p_admin_id
  );

  -- 14. Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE',
    'transactions_v2',
    v_new_tx_id::text,
    p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_original_tx_id,
      'original_amount', v_orig.amount,
      'original_date', v_orig.tx_date,
      'original_type', v_orig.type
    ),
    jsonb_build_object(
      'new_tx_id', v_new_tx_id,
      'new_amount', p_new_amount,
      'new_date', p_new_date,
      'closing_aum', v_computed_closing_aum,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    ),
    jsonb_build_object('reason', p_reason)
  );

  -- 15. Return result
  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_original_tx_id,
    'new_tx_id', v_new_tx_id,
    'new_amount', p_new_amount,
    'new_date', p_new_date,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'closing_aum', v_computed_closing_aum
  );
END;
$$;
