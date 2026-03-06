-- ============================================================
-- Fix 3 broken database functions
-- ============================================================

-- Fix 1: cleanup_withdrawal_audit_on_cancel - wrong enum type
CREATE OR REPLACE FUNCTION public.cleanup_withdrawal_audit_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO withdrawal_audit_logs (request_id, action, actor_id, details)
    VALUES (
      NEW.id,
      'cancel'::withdrawal_action,
      COALESCE(NEW.cancelled_by, auth.uid()),
      jsonb_build_object(
        'reason', NEW.cancellation_reason,
        'previous_status', OLD.status,
        'cancelled_at', now()
      )
    );
    
    UPDATE audit_log
    SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object('cancelled', true)
    WHERE entity = 'withdrawal_requests'
      AND entity_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: cascade_void_to_yield_events - remove broken yield_edit_audit update
CREATE OR REPLACE FUNCTION public.cascade_void_to_yield_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
    UPDATE data_edit_audit
    SET voided_record = true
    WHERE record_id = NEW.id::uuid
      AND table_name = 'yield_distributions';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 3: update_transaction - remove ::text cast for UUID column
CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id uuid, 
  p_updates jsonb, 
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx record;
  v_actor_id uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_allowed_fields text[] := ARRAY['tx_date', 'value_date', 'notes', 'tx_hash', 'amount', 'type', 'fund_id', 'reference_id'];
  v_field text;
  v_new_amount numeric;
  v_new_fund_id uuid;
  v_old_fund_id uuid;
BEGIN
  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Edit reason is required';
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  IF p_updates ? 'investor_id' THEN
    RAISE EXCEPTION 'Cannot change investor_id on a transaction';
  END IF;

  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_field = ANY(v_allowed_fields)) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot edit system-generated transactions';
  END IF;

  v_before := row_to_json(v_tx)::jsonb;
  v_old_fund_id := v_tx.fund_id;

  v_new_amount := COALESCE((p_updates->>'amount')::numeric, v_tx.amount);
  v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);

  UPDATE transactions_v2
  SET 
    tx_date = COALESCE((p_updates->>'tx_date')::date, tx_date),
    value_date = COALESCE((p_updates->>'value_date')::date, value_date),
    notes = COALESCE(p_updates->>'notes', notes),
    tx_hash = COALESCE(p_updates->>'tx_hash', tx_hash),
    amount = v_new_amount,
    type = COALESCE((p_updates->>'type')::tx_type, type),
    fund_id = v_new_fund_id,
    reference_id = COALESCE(p_updates->>'reference_id', reference_id)
  WHERE id = p_transaction_id;

  SELECT row_to_json(t)::jsonb INTO v_after FROM transactions_v2 t WHERE t.id = p_transaction_id;

  INSERT INTO data_edit_audit (
    table_name, record_id, operation, old_data, new_data, 
    edited_by, edit_source
  )
  VALUES (
    'transactions_v2',
    p_transaction_id,
    'UPDATE',
    v_before,
    v_after,
    v_actor_id,
    'update_transaction RPC: ' || p_reason
  );

  PERFORM recompute_investor_position(v_tx.investor_id, v_old_fund_id);
  IF v_new_fund_id IS DISTINCT FROM v_old_fund_id THEN
    PERFORM recompute_investor_position(v_tx.investor_id, v_new_fund_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'updated_at', now()
  );
END;
$$;