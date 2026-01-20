-- ============================================================================
-- Update void_transaction RPC to set voided_by_profile_id
-- Must DROP first due to return type change from previous version
-- ============================================================================

DROP FUNCTION IF EXISTS void_transaction(uuid, uuid, text);

CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_position_id uuid;
  v_current_value numeric(28,10);
  v_new_value numeric(28,10);
  v_voided_yield_events int := 0;
BEGIN
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;

  IF v_tx IS NULL THEN
    PERFORM raise_platform_error('TRANSACTION_NOT_FOUND', jsonb_build_object('transaction_id', p_transaction_id));
  END IF;

  IF v_tx.is_voided THEN
    PERFORM raise_platform_error('TRANSACTION_ALREADY_VOIDED', jsonb_build_object('transaction_id', p_transaction_id, 'voided_at', v_tx.voided_at));
  END IF;

  IF is_period_locked(v_tx.fund_id, v_tx.tx_date) THEN
    PERFORM raise_platform_error('PERIOD_LOCKED', jsonb_build_object('fund_id', v_tx.fund_id, 'tx_date', v_tx.tx_date, 'operation', 'void_transaction'));
  END IF;

  SELECT id, current_value INTO v_position_id, v_current_value
  FROM investor_positions WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

  v_new_value := COALESCE(v_current_value, 0) - v_tx.amount;

  IF v_tx.type = 'DEPOSIT' AND v_new_value < 0 THEN
    PERFORM raise_platform_error('INSUFFICIENT_BALANCE', jsonb_build_object('current_value', v_current_value, 'transaction_amount', v_tx.amount, 'projected_balance', v_new_value));
  END IF;

  -- Void transaction with voided_by_profile_id
  UPDATE transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  UPDATE investor_yield_events
  SET voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void from transaction: ' || p_reason
  WHERE transaction_id = p_transaction_id AND NOT voided;
  GET DIAGNOSTICS v_voided_yield_events = ROW_COUNT;

  IF v_position_id IS NOT NULL THEN
    UPDATE investor_positions SET current_value = v_new_value, updated_at = now() WHERE id = v_position_id;
  END IF;

  INSERT INTO audit_log (entity, action, actor_user, meta)
  VALUES ('transactions_v2', 'VOID_TRANSACTION', p_admin_id, jsonb_build_object('transaction_id', p_transaction_id, 'reason', p_reason, 'voided_yield_events', v_voided_yield_events));

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'new_balance', v_new_value);
END;
$$;