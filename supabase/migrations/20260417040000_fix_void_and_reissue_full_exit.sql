-- =============================================================
-- Fix void_and_reissue_full_exit: Add missing source/asset columns,
-- remove double-credit to fees account, add dust tolerance
-- 2026-04-17 | HIGH: Baseline version was missing source and asset
-- columns (blocked by enforce_transaction_via_rpc trigger), and
-- double-credited the fees account via both direct INSERT and
-- fn_ledger_drives_position trigger. Position deactivation also
-- needed dust tolerance.
-- =============================================================

CREATE OR REPLACE FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date" DEFAULT NULL::"date", "p_send_precision" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  v_dust_tolerance numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

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

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  v_new_withdrawal_amount := LEAST(p_new_amount, v_restored_amount);
  v_dust_amount := GREATEST(v_restored_amount - v_new_withdrawal_amount, 0);

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' AND is_system_account = true LIMIT 1;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  -- Create new WITHDRAWAL transaction with required source and asset columns
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, tx_date, asset,
    reference_id, notes, created_by, is_voided, visibility_scope, source
  ) VALUES (
    v_investor_id, v_fund_id,
    'WITHDRAWAL', -ABS(v_new_withdrawal_amount), COALESCE(p_new_date, v_tx.tx_date), v_asset,
    'reissue_full_' || p_transaction_id::text,
    'Full-exit reissue', p_admin_id,
    false, 'investor_visible', 'rpc_canonical'
  ) RETURNING id INTO v_new_withdrawal_tx_id;

  -- fn_ledger_drives_position handles position update on INSERT

  IF v_dust_amount > 0 AND v_fees_account_id IS NOT NULL THEN
    -- Investor DUST_SWEEP debit
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_investor_id, v_fund_id,
      'DUST_SWEEP', -ABS(v_dust_amount), COALESCE(p_new_date, v_tx.tx_date), v_asset,
      'dust-sweep-reissue-' || p_transaction_id::text,
      'Dust sweep reissue', p_admin_id,
      false, 'admin_only', 'rpc_canonical'
    ) RETURNING id INTO v_dust_debit_tx_id;

    -- Fees account DUST_SWEEP credit
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_fees_account_id, v_fund_id,
      'DUST_SWEEP', ABS(v_dust_amount), COALESCE(p_new_date, v_tx.tx_date), v_asset,
      'dust-credit-reissue-' || p_transaction_id::text,
      'Dust received from full exit reissue of ' || v_investor_id::text, p_admin_id,
      false, 'admin_only', 'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;

    -- NO direct INSERT into investor_positions for fees account
    -- fn_ledger_drives_position trigger handles position update for both DUST_SWEEP transactions
  END IF;

  -- Deactivate position using dust tolerance (avoids rounding drift zombie positions)
  v_dust_tolerance := COALESCE(public.get_dust_tolerance_for_fund(v_fund_id), 0.01);

  UPDATE investor_positions
  SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND current_value <= v_dust_tolerance;

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
    jsonb_build_object('new_amount', v_new_withdrawal_amount, 'dust', v_dust_amount, 'closing_aum', v_closing_aum,
      'position_method', 'trigger_only_no_explicit_update'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_transaction_id, 'new_tx_id', v_new_withdrawal_tx_id,
    'dust_debit_tx_id', v_dust_debit_tx_id, 'dust_credit_tx_id', v_dust_credit_tx_id,
    'new_withdrawal_amount', v_new_withdrawal_amount, 'dust_amount', v_dust_amount,
    'restored_balance', v_restored_amount, 'closing_aum', v_closing_aum
  );
END;
$$;

ALTER FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") IS 'Void and reissue a full exit withdrawal. Adds source/asset columns (needed by enforce_transaction_via_rpc trigger), removes double-credit to fees account (relies on fn_ledger_drives_position trigger), uses dust tolerance for position deactivation.';