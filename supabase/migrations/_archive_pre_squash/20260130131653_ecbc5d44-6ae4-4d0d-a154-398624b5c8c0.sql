-- Fix: Cascade void of fund_aum_events when voiding DEPOSIT/WITHDRAWAL transactions
-- Problem: void_transaction doesn't void related fund_aum_events, causing stale Opening AUM in yield preview

-- Part 1: Fix existing orphaned fund_aum_events
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  
  -- Void fund_aum_events that reference voided transactions
  UPDATE fund_aum_events fae
  SET is_voided = true,
      void_reason = 'Cascade void: parent transaction voided',
      voided_at = NOW()
  WHERE fae.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.is_voided = true
        AND fae.trigger_reference LIKE '%' || t.id::text || '%'
    );
  
  -- Also void fund_aum_events for funds with zero active positions and no active deposits
  UPDATE fund_aum_events fae
  SET is_voided = true,
      void_reason = 'Orphan cleanup: no active positions or deposits',
      voided_at = NOW()
  WHERE fae.is_voided = false
    AND NOT EXISTS (
      SELECT 1 FROM investor_positions ip
      WHERE ip.fund_id = fae.fund_id
        AND ip.is_active = true
        AND ip.current_value > 0
    )
    AND NOT EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.fund_id = fae.fund_id
        AND t.is_voided = false
        AND t.type = 'DEPOSIT'
    );
END;
$$;

-- Part 2: Drop and recreate void_transaction with cascade to fund_aum_events
DROP FUNCTION IF EXISTS public.void_transaction(uuid, uuid, text);

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

  -- Admin check
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin privileges required'
    );
  END IF;

  -- Get the transaction to void
  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
    AND is_voided = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found or already voided'
    );
  END IF;

  -- Mark as voided - trigger handles position update
  UPDATE public.transactions_v2
  SET
    is_voided = true,
    voided_at = NOW(),
    voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- NOTE: Position update is handled by trg_recompute_on_void trigger

  -- NEW: Cascade void to fund_aum_events for DEPOSIT/WITHDRAWAL transactions
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET 
      is_voided = true,
      void_reason = 'Cascade void: transaction ' || p_transaction_id::text || ' voided',
      voided_at = NOW(),
      voided_by = p_admin_id
    WHERE fund_id = v_tx.fund_id
      AND is_voided = false
      AND (
        -- Match by trigger_reference containing the transaction ID
        trigger_reference LIKE '%' || p_transaction_id::text || '%'
        -- Or match by date if trigger_reference is NULL (legacy records)
        OR (trigger_reference IS NULL AND event_date = v_tx.tx_date)
      );
    
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID_TRANSACTION',
    'transactions_v2',
    p_transaction_id::text,
    p_admin_id,
    jsonb_build_object('is_voided', false, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'aum_events_voided', v_aum_events_voided)
  );

  v_result := jsonb_build_object(
    'success', true,
    'message', 'Transaction voided successfully',
    'transaction_id', p_transaction_id,
    'original_amount', v_tx.amount,
    'original_type', v_tx.type,
    'aum_events_voided', v_aum_events_voided
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;