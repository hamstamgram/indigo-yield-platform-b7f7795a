-- Fix void_and_reissue_transaction: replace INSERT INTO fund_aum_events
-- with fund_daily_aum upsert (fund_aum_events table has been dropped)

CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_admin_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text DEFAULT NULL::text,
  p_new_tx_hash text DEFAULT NULL::text,
  p_closing_aum numeric DEFAULT NULL::numeric,
  p_reason text DEFAULT 'Void and reissue correction'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

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

  -- Sync AUM to fund_daily_aum (replaces old fund_aum_events INSERT)
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, source, is_voided, created_by
  ) VALUES (
    v_orig.fund_id, p_new_date, v_computed_closing_aum,
    'transaction', 'reissue_aum_sync', false, p_admin_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = NOW();

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
$function$;
