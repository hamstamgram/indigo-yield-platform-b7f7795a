-- Fix void_transaction: Use direct set_config() instead of wrapper function
-- Root cause: set_canonical_rpc() is SECURITY DEFINER, creating isolated context
-- The LOCAL config is discarded when the wrapper returns

-- 1. Replace void_transaction with direct set_config calls
CREATE OR REPLACE FUNCTION public.void_transaction(
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
  v_tx RECORD;
  v_aum_events_voided int := 0;
BEGIN
  -- CRITICAL FIX: Set config DIRECTLY, not via wrapper function
  -- This ensures the config is visible in THIS function's context
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Admin check
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- Get transaction record
  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;

  IF v_tx.is_voided THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction already voided'
    );
  END IF;

  -- Void the transaction
  UPDATE public.transactions_v2
  SET 
    is_voided = true,
    voided_at = now(),
    voided_by = p_admin_id,
    voided_by_profile_id = p_admin_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Cascade void to related fund_aum_events
  -- Match by reference_id (shared key), NOT by transaction UUID
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL', 'FIRST_INVESTMENT', 'TOP_UP') THEN
    UPDATE public.fund_aum_events
    SET 
      is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: transaction ' || p_transaction_id::text || ' voided'
    WHERE fund_id = v_tx.fund_id
      AND is_voided = false
      AND (
        (v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
        OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL AND event_date = v_tx.tx_date)
      );
    
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- Log the void action
  INSERT INTO public.audit_log (
    action, entity, entity_id, actor_user,
    old_values, new_values, meta
  ) VALUES (
    'VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object(
      'is_voided', false,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'fund_id', v_tx.fund_id,
      'investor_id', v_tx.investor_id,
      'reference_id', v_tx.reference_id
    ),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_at', now(),
      'aum_events_voided', v_aum_events_voided
    ),
    jsonb_build_object(
      'source', 'void_transaction_rpc',
      'admin_id', p_admin_id,
      'cascade_match_field', 'reference_id',
      'config_fix', 'direct_set_config'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', now(),
    'aum_events_voided', v_aum_events_voided,
    'message', 'Transaction voided successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- 2. Data fix: Void orphaned fund_aum_events from previous failed voids
-- Must use DO block to call set_config before UPDATE
DO $$
BEGIN
  -- Set bypass flags in this execution context
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Void orphaned AUM events where transaction was voided but AUM event wasn't
  UPDATE fund_aum_events fae
  SET 
    is_voided = true,
    voided_at = now(),
    void_reason = 'Data fix: orphaned from previous void failure'
  WHERE fae.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.is_voided = true
        AND t.reference_id IS NOT NULL
        AND t.reference_id = fae.trigger_reference
    );
END;
$$;