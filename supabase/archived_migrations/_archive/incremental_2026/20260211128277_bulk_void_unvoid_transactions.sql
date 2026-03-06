-- Migration: Bulk Void/Unvoid Transactions
-- Adds 3 new RPCs: unvoid_transaction, void_transactions_bulk, unvoid_transactions_bulk

-- =============================================================================
-- 1. unvoid_transaction: Reverse a voided transaction (any admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION unvoid_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx RECORD;
  v_result jsonb;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required');
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  -- Lock and fetch the transaction
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'Transaction not found');
  END IF;

  IF v_tx.is_voided IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_VOIDED', 'message', 'Transaction is not voided');
  END IF;

  -- Set canonical RPC flag to bypass immutability triggers
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Unvoid the transaction
  UPDATE transactions_v2
  SET is_voided = false,
      voided_at = NULL,
      voided_by = NULL,
      void_reason = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || now()::text || ' by admin ' || p_admin_id::text || ': ' || trim(p_reason) || ']'
  WHERE id = p_transaction_id;

  -- trg_ledger_sync fires on UPDATE of is_voided and restores the position

  -- Audit log (using correct column names)
  INSERT INTO audit_log (
    entity, entity_id, action, actor_user,
    old_values, new_values, meta
  ) VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'UNVOID',
    p_admin_id,
    jsonb_build_object('is_voided', true, 'voided_at', v_tx.voided_at, 'voided_by', v_tx.voided_by, 'void_reason', v_tx.void_reason),
    jsonb_build_object('is_voided', false),
    jsonb_build_object('reason', trim(p_reason))
  );

  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'investor_id', v_tx.investor_id,
    'fund_id', v_tx.fund_id,
    'restored_amount', v_tx.amount,
    'warning', 'AUM records may need recalculation after unvoid. Run recalculate_fund_aum_for_date if needed.'
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 2. void_transactions_bulk: Atomic bulk void (super_admin only)
-- =============================================================================
CREATE OR REPLACE FUNCTION void_transactions_bulk(
  p_transaction_ids uuid[],
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_result jsonb;
  v_single_result jsonb;
  v_results jsonb[] := '{}';
BEGIN
  -- Super admin check: must have super_admin role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_SUPER_ADMIN', 'message', 'Super admin access required for bulk operations');
  END IF;

  -- Validate array size
  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_BATCH_SIZE', 'message', 'Batch size must be between 1 and 50');
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  -- Lock all rows and validate none are already voided
  IF EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE id = ANY(p_transaction_ids) AND is_voided = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ALREADY_VOIDED', 'message', 'One or more transactions are already voided');
  END IF;

  -- Verify all IDs exist
  IF (SELECT count(*) FROM transactions_v2 WHERE id = ANY(p_transaction_ids)) != v_count THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'One or more transactions not found');
  END IF;

  -- Void each transaction using the existing RPC
  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := void_transaction(v_tx_id, p_admin_id, '[BULK] ' || trim(p_reason));
    IF (v_single_result->>'success')::boolean IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Failed to void transaction %: %', v_tx_id, v_single_result->>'message';
    END IF;
    v_results := array_append(v_results, v_single_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'transaction_ids', to_jsonb(p_transaction_ids)
  );
END;
$$;

-- =============================================================================
-- 3. unvoid_transactions_bulk: Atomic bulk unvoid (super_admin only)
-- =============================================================================
CREATE OR REPLACE FUNCTION unvoid_transactions_bulk(
  p_transaction_ids uuid[],
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
  v_results jsonb[] := '{}';
BEGIN
  -- Super admin check
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_SUPER_ADMIN', 'message', 'Super admin access required for bulk operations');
  END IF;

  -- Validate array size
  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_BATCH_SIZE', 'message', 'Batch size must be between 1 and 50');
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  -- Validate all are actually voided
  IF EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE id = ANY(p_transaction_ids) AND (is_voided IS DISTINCT FROM true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_VOIDED', 'message', 'One or more transactions are not voided');
  END IF;

  -- Verify all IDs exist
  IF (SELECT count(*) FROM transactions_v2 WHERE id = ANY(p_transaction_ids)) != v_count THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'One or more transactions not found');
  END IF;

  -- Unvoid each transaction
  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := unvoid_transaction(v_tx_id, p_admin_id, '[BULK] ' || trim(p_reason));
    IF (v_single_result->>'success')::boolean IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Failed to unvoid transaction %: %', v_tx_id, v_single_result->>'message';
    END IF;
    v_results := array_append(v_results, v_single_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'count', v_count,
    'transaction_ids', to_jsonb(p_transaction_ids),
    'warning', 'AUM records may need recalculation. Run recalculate_fund_aum_for_date for affected funds/dates.'
  );
END;
$$;
