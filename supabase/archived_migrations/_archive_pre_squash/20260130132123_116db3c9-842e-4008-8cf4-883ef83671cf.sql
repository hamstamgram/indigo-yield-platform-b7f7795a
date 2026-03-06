-- Fix void_transaction to use correct admin check function
-- The function was incorrectly calling is_admin(p_admin_id) which doesn't exist
-- The correct function is check_is_admin(p_admin_id)

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
  v_result jsonb;
  v_aum_events_voided int := 0;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Admin check - USE check_is_admin (takes UUID parameter)
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

  -- Cascade void to related fund_aum_events for DEPOSIT/WITHDRAWAL transactions
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
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
        trigger_reference LIKE '%' || p_transaction_id::text || '%'
        OR (trigger_reference IS NULL AND event_date = v_tx.tx_date)
      );
    
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- Log the void action
  INSERT INTO public.audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    old_values,
    new_values,
    meta
  ) VALUES (
    'VOID',
    'transactions_v2',
    p_transaction_id::text,
    p_admin_id,
    jsonb_build_object(
      'is_voided', false,
      'type', v_tx.type,
      'amount', v_tx.amount,
      'fund_id', v_tx.fund_id,
      'investor_id', v_tx.investor_id
    ),
    jsonb_build_object(
      'is_voided', true,
      'void_reason', p_reason,
      'voided_at', now(),
      'aum_events_voided', v_aum_events_voided
    ),
    jsonb_build_object(
      'source', 'void_transaction_rpc',
      'admin_id', p_admin_id
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