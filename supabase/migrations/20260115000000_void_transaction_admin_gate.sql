-- ============================================================================
-- SECURITY FIX: Add is_admin() gate to void_transaction
-- Date: 2026-01-15
-- Issue: void_transaction was missing internal is_admin() check
-- ============================================================================

BEGIN;

-- Drop existing function first to avoid signature conflicts
DROP FUNCTION IF EXISTS void_transaction(uuid, text, uuid);

-- Recreate void_transaction with is_admin() check
-- Signature: (p_transaction_id uuid, p_void_reason text, p_admin_id uuid)
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id uuid,
  p_void_reason text,
  p_admin_id uuid DEFAULT NULL
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
  v_admin uuid;
BEGIN
  -- SECURITY: Require admin role
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can void transactions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolve admin ID
  v_admin := COALESCE(p_admin_id, auth.uid());

  -- Get transaction details
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TRANSACTION_NOT_FOUND',
      'message', 'Transaction not found'
    );
  END IF;

  -- Check if already voided (handle both column names)
  IF COALESCE(v_tx.voided, v_tx.is_voided, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TRANSACTION_ALREADY_VOIDED',
      'message', 'Transaction is already voided',
      'voided_at', v_tx.voided_at
    );
  END IF;

  -- Check if period is locked
  IF is_period_locked(v_tx.fund_id, v_tx.tx_date) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'PERIOD_LOCKED',
      'message', 'Cannot void transaction in locked period',
      'fund_id', v_tx.fund_id,
      'tx_date', v_tx.tx_date
    );
  END IF;

  -- Get investor position
  SELECT id, current_value INTO v_position_id, v_current_value
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;

  -- Calculate new value after void
  IF v_tx.type = 'DEPOSIT' THEN
    v_new_value := COALESCE(v_current_value, 0) - ABS(v_tx.amount);
  ELSE
    v_new_value := COALESCE(v_current_value, 0) + ABS(v_tx.amount);
  END IF;

  -- Void the transaction (try both column names for compatibility)
  UPDATE transactions_v2
  SET voided = true,
      voided_at = now(),
      voided_by = v_admin,
      void_reason = p_void_reason
  WHERE id = p_transaction_id;

  -- Void associated yield events
  UPDATE investor_yield_events
  SET voided = true,
      voided_at = now(),
      voided_by = v_admin,
      void_reason = 'Cascade void from transaction: ' || p_void_reason
  WHERE transaction_id = p_transaction_id
    AND COALESCE(voided, is_voided, false) = false;
  GET DIAGNOSTICS v_voided_yield_events = ROW_COUNT;

  -- Update investor position
  IF v_position_id IS NOT NULL THEN
    UPDATE investor_positions
    SET current_value = v_new_value,
        updated_at = now()
    WHERE id = v_position_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'VOID_TRANSACTION',
    'transactions_v2',
    p_transaction_id::text,
    v_admin,
    jsonb_build_object(
      'transaction_type', v_tx.type,
      'amount', v_tx.amount,
      'reason', p_void_reason,
      'previous_balance', v_current_value,
      'new_balance', v_new_value,
      'voided_yield_events', v_voided_yield_events
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', now(),
    'previous_balance', v_current_value,
    'new_balance', v_new_value,
    'voided_yield_events', v_voided_yield_events
  );
END;
$$;

COMMENT ON FUNCTION void_transaction(uuid, text, uuid) IS 'Void a transaction with cascade to yield events. ADMIN ONLY via is_admin().';

COMMIT;
