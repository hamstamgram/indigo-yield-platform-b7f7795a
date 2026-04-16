-- Fix: void_and_reissue_transaction must set canonical_rpc flag BEFORE any INSERT
-- The trigger enforce_canonical_transaction_mutation blocks direct INSERTs on
-- transactions_v2 unless indigo.canonical_rpc = 'true'. The function sets this
-- at the top, but if the remote DB doesn't have the latest version (e.g. from
-- a partial migration apply), the INSERT will fail with P0001.
--
-- This migration recreates the function with the canonical flag set at the
-- very start, and also re-sets it before the INSERT as defense-in-depth.
--
-- Also fixes: front-end sends p_reason (not positional) and missing
-- p_closing_aum has a DEFAULT, so JSON-named-param call works.

CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text DEFAULT NULL,
  p_new_tx_hash text DEFAULT NULL,
  p_closing_aum numeric DEFAULT NULL,
  p_reason text DEFAULT 'Void and reissue correction'
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
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
  -- CRITICAL: Set canonical RPC flag FIRST before any table mutation
  -- This is required by enforce_canonical_transaction_mutation trigger.
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  -- Void the original (void_transaction sets canonical_rpc internally)
  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  -- Re-set canonical flag after void_transaction returns (defense-in-depth)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0);

  v_new_tx_id := gen_random_uuid();

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

  UPDATE investor_positions
  SET current_value = current_value + p_new_amount,
      updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  IF NOT FOUND THEN
    INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
    VALUES (v_orig.investor_id, v_orig.fund_id, p_new_amount, p_new_amount, v_orig.currency, NOW());
  END IF;

  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

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

-- Also fix: void_and_reissue_full_exit missing canonical_rpc
CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_reason text,
  p_new_date date DEFAULT NULL,
  p_send_precision text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_withdrawal_request RECORD;
  v_void_result jsonb;
  v_dust_sweep_count int := 0;
  v_investor_id uuid;
  v_fund_id uuid;
  v_asset text;
  v_original_amount numeric;
  v_restored_amount numeric;
  v_new_withdrawal_amount numeric;
  v_dust_amount numeric;
  v_new_withdrawal_tx_id uuid;
  v_dust_debit_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_balance_before numeric;
  v_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  v_investor_id := v_tx.investor_id;
  v_fund_id := v_tx.fund_id;
  v_asset := v_tx.asset;
  v_original_amount := ABS(v_tx.amount);

  SELECT * INTO v_withdrawal_request FROM withdrawal_requests
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND status IN ('completed', 'approved')
  ORDER BY created_at DESC LIMIT 1;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  v_new_withdrawal_amount := LEAST(p_new_amount, v_restored_amount);
  v_dust_amount := GREATEST(v_restored_amount - v_new_withdrawal_amount, 0);

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  v_new_withdrawal_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, amount, tx_date,
    notes, reference_id, balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_withdrawal_tx_id, v_investor_id, v_fund_id,
    'WITHDRAWAL', -v_new_withdrawal_amount, COALESCE(p_new_date, v_tx.tx_date),
    'Full-exit reissue', 'reissue_full_' || p_transaction_id::text,
    v_balance_before, v_balance_before - v_new_withdrawal_amount,
    false, p_admin_id, NOW()
  );

  IF v_dust_amount > 0 THEN
    v_dust_debit_tx_id := gen_random_uuid();

    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, amount, tx_date,
      notes, reference_id, balance_before, balance_after,
      is_system_generated, created_by, created_at
    ) VALUES (
      v_dust_debit_tx_id, v_investor_id, v_fund_id,
      'DUST_SWEEP', -v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
      'Dust sweep reissue', 'dust-sweep-reissue-' || p_transaction_id::text,
      v_balance_before - v_new_withdrawal_amount, v_balance_before - v_new_withdrawal_amount - v_dust_amount,
      false, p_admin_id, NOW()
    );

    IF v_fees_account_id IS NOT NULL THEN
      v_dust_credit_tx_id := gen_random_uuid();

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, amount, tx_date,
        notes, reference_id, balance_before, balance_after,
        is_system_generated, created_by, created_at
      ) VALUES (
        v_dust_credit_tx_id, v_fees_account_id, v_fund_id,
        'DUST_SWEEP', v_dust_amount, COALESCE(p_new_date, v_tx.tx_date),
        'Dust sweep reissue (fees credit)', 'dust-sweep-reissue-' || p_transaction_id::text,
        0, v_dust_amount,
        false, p_admin_id, NOW()
      );

      INSERT INTO investor_positions (investor_id, fund_id, current_value, invested_amount, currency, updated_at)
      VALUES (v_fees_account_id, v_fund_id, v_dust_amount, 0, v_asset, NOW())
      ON CONFLICT (investor_id, fund_id) DO UPDATE
        SET current_value = COALESCE(investor_positions.current_value, 0) + v_dust_amount,
            updated_at = NOW();
    END IF;
  END IF;

  UPDATE investor_positions
  SET current_value = GREATEST(COALESCE(current_value, 0) - v_restored_amount, 0),
      updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
  FROM investor_positions WHERE fund_id = v_fund_id;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_fund_id, 'full_exit_reissue', -v_new_withdrawal_amount,
    v_closing_aum, v_new_withdrawal_tx_id, v_investor_id,
    COALESCE(p_new_date, v_tx.tx_date), p_admin_id
  );

  IF v_withdrawal_request.id IS NOT NULL THEN
    UPDATE withdrawal_requests
    SET status = 'completed', processed_amount = v_new_withdrawal_amount
    WHERE id = v_withdrawal_request.id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_amount', v_original_amount),
    jsonb_build_object('new_amount', v_new_withdrawal_amount, 'dust', v_dust_amount, 'closing_aum', v_closing_aum),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_new_withdrawal_tx_id,
    'dust_debit_tx_id', v_dust_debit_tx_id,
    'dust_credit_tx_id', v_dust_credit_tx_id,
    'new_withdrawal_amount', v_new_withdrawal_amount,
    'dust_amount', v_dust_amount,
    'restored_balance', v_restored_amount,
    'closing_aum', v_closing_aum
  );
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION public.void_and_reissue_transaction TO authenticated;
GRANT ALL ON FUNCTION public.void_and_reissue_transaction TO service_role;
GRANT ALL ON FUNCTION public.void_and_reissue_full_exit TO authenticated;
GRANT ALL ON FUNCTION public.void_and_reissue_full_exit TO service_role;