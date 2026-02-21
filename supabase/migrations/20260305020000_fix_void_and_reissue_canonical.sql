-- Migration: Fix void_and_reissue_transaction canonical guard and audit log
-- Date: 2026-03-05
-- Context: 
-- 1. Adds missing indigo.canonical_rpc session flag to bypass transaction guard.
-- 2. Fixes incorrect audit_logs table name and column names to match actual schema.

BEGIN;

CREATE OR REPLACE FUNCTION public.void_and_reissue_transaction(
  p_record_id uuid,
  p_new_values jsonb,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_old_tx RECORD;
  v_new_tx_id uuid;
  v_fund_id uuid;
  v_investor_id uuid;
  v_tx_type text;
  v_amount numeric;
  v_tx_date date;
  v_reference_id text;
  v_notes text;
  v_asset text;
  v_purpose public.aum_purpose;
BEGIN
  -- Set canonical RPC flag to bypass table mutation guards
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- 1. Fetch old transaction
  SELECT * INTO v_old_tx FROM transactions_v2 WHERE id = p_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction % not found', p_record_id;
  END IF;

  IF v_old_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction % is already voided', p_record_id;
  END IF;

  -- Cannot manually reissue system events
  IF v_old_tx.type IN ('YIELD_DISTRIBUTION', 'FEE_CREDIT', 'IB_CREDIT', 'MANAGEMENT_FEE_CREDIT') THEN
    RAISE EXCEPTION 'Cannot manually reissue system transaction type %', v_old_tx.type;
  END IF;

  v_fund_id := v_old_tx.fund_id;
  v_investor_id := v_old_tx.investor_id;
  v_asset := v_old_tx.asset;

  -- 2. Validate inputs
  v_tx_type := COALESCE((p_new_values->>'tx_type'), v_old_tx.type);
  
  -- Prevent type changes except FIRST_INVESTMENT <-> DEPOSIT
  IF v_tx_type != v_old_tx.type THEN
     IF NOT (v_old_tx.type IN ('DEPOSIT', 'FIRST_INVESTMENT') AND v_tx_type IN ('DEPOSIT', 'FIRST_INVESTMENT')) THEN
        RAISE EXCEPTION 'Cannot change transaction type from % to %', v_old_tx.type, v_tx_type;
     END IF;
  END IF;

  v_amount := COALESCE((p_new_values->>'amount')::numeric, v_old_tx.amount);
  v_tx_date := COALESCE((p_new_values->>'tx_date')::date, v_old_tx.tx_date);
  v_reference_id := COALESCE((p_new_values->>'reference_id'), v_old_tx.reference_id);
  v_notes := COALESCE((p_new_values->>'notes'), v_old_tx.notes);
  v_purpose := COALESCE((p_new_values->>'purpose')::public.aum_purpose, v_old_tx.purpose);

  -- 3. Void old transaction 
  UPDATE transactions_v2 
  SET is_voided = true, 
      voided_at = now(), 
      voided_by = p_admin_id, 
      void_reason = p_reason
  WHERE id = p_record_id;

  -- 4. Create new transaction (calling pure flow logic)
  SELECT (apply_investor_transaction(
    p_fund_id := v_fund_id,
    p_investor_id := v_investor_id,
    p_tx_type := v_tx_type::tx_type,
    p_amount := v_amount,
    p_tx_date := v_tx_date,
    p_reference_id := v_reference_id || '_R', -- Append '_R' to indicate Reissue
    p_admin_id := p_admin_id,
    p_notes := v_notes,
    p_purpose := v_purpose
  )->>'transaction_id')::uuid INTO v_new_tx_id;

  -- 5. Audit log
  INSERT INTO public.audit_log (
    entity,
    entity_id,
    action,
    actor_user,
    old_values,
    new_values
  ) VALUES (
    'transactions_v2',
    v_new_tx_id::text,
    'REISSUE',
    p_admin_id,
    jsonb_build_object('voided_id', p_record_id, 'reason', p_reason),
    p_new_values
  );

  RETURN jsonb_build_object(
    'voided_tx_id', p_record_id,
    'new_tx_id', v_new_tx_id,
    'message', 'Transaction voided and reissued'
  );

END;
$$;

COMMIT;
