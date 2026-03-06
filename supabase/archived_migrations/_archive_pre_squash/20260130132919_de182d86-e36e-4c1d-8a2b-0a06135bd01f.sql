-- Fix void_transaction to match fund_aum_events by reference_id, NOT transaction_id UUID
-- Root cause: trigger_reference contains 'DEP-{investor_id}-{date}-{random}' which matches
-- transactions_v2.reference_id, NOT transactions_v2.id (UUID)

-- Part 1: Fix the void_transaction RPC
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

  -- Get transaction record (including reference_id for cascade matching)
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

  -- Cascade void to related fund_aum_events for DEPOSIT/WITHDRAWAL/FIRST_INVESTMENT/TOP_UP transactions
  -- FIX: Match by reference_id (shared key), NOT by transaction UUID
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
        -- PRIMARY: Exact match on shared reference_id key
        (v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
        -- FALLBACK: Same fund/date if no reference (legacy records)
        OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL AND event_date = v_tx.tx_date)
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
      'cascade_match_field', 'reference_id'
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

-- Part 2: Data fix - Void orphaned fund_aum_events where transaction was voided
-- These were missed because the old matching logic used transaction UUID instead of reference_id
DO $$
BEGIN
  -- Set canonical flag to bypass trigger protection
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  -- Void fund_aum_events that reference voided transactions (matching by reference_id)
  UPDATE fund_aum_events fae
  SET 
    is_voided = true,
    voided_at = now(),
    void_reason = 'Data fix: referenced transaction (by reference_id) was voided'
  WHERE fae.is_voided = false
    AND EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.is_voided = true
        AND t.reference_id IS NOT NULL
        AND t.reference_id = fae.trigger_reference
    );
    
  -- Log the data fix
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'DATA_FIX',
    'fund_aum_events',
    'bulk_void_orphans',
    jsonb_build_object(
      'reason', 'Voided fund_aum_events orphaned by void_transaction UUID matching bug',
      'fix', 'Now matching by transactions_v2.reference_id = fund_aum_events.trigger_reference'
    )
  );
END;
$$;