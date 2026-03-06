-- Migration: First Principles Historical Lock
-- Prevents mutating transactions if a Yield Distribution has already been recorded on or after the transaction date.

CREATE OR REPLACE FUNCTION check_historical_lock(p_fund_id uuid, p_tx_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
BEGIN
  -- We consider a date locked if there is ANY non-voided yield distribution
  -- that is equal to or newer than the transaction date.
  SELECT EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= p_tx_date
      AND is_voided = false
  ) INTO v_locked;
  
  RETURN v_locked;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_investor_transaction(p_fund_id uuid, p_investor_id uuid, p_tx_type tx_type, p_amount numeric, p_tx_date date, p_reference_id text, p_admin_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text, p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose, p_distribution_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_fund record;
    v_transaction_id uuid;
    v_admin uuid;
    v_lock_key bigint;
BEGIN
    -- Set canonical RPC flag to bypass table mutation guards
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    v_admin := COALESCE(p_admin_id, auth.uid());
    IF v_admin IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: admin context required';
    END IF;

    -- 1. Validate inputs
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'P0001';
    END IF;

    -- 1a. First Principles Historical Lock
    IF check_historical_lock(p_fund_id, p_tx_date) THEN
        RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot record a new transaction on % because a Yield Distribution has already been finalized on or after this date. You must void the subsequent yields first to safely unwind the ledger.', p_tx_date;
    END IF;

    -- 2. Fetch and lock fund
    SELECT * INTO v_fund
    FROM funds
    WHERE id = p_fund_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active fund not found' USING ERRCODE = 'P0003';
    END IF;

    -- 3. Verify investor profile exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_investor_id) THEN
        RAISE EXCEPTION 'Investor profile not found' USING ERRCODE = 'P0004';
    END IF;

    -- Serialize per-investor-fund transaction
    v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 4. Check for idempotency (prevent duplicate transactions)
    IF EXISTS (
        SELECT 1 FROM transactions_v2 
        WHERE fund_id = p_fund_id 
        AND investor_id = p_investor_id 
        AND tx_date = p_tx_date 
        AND type = p_tx_type 
        AND amount = CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -p_amount ELSE p_amount END
        AND reference_id = p_reference_id
        AND NOT is_voided
    ) THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Transaction already explicitly recorded (idempotent)',
            'reference_id', p_reference_id
        );
    END IF;

    -- 5. Insert canonical transaction
    -- Note: transactions_v2 triggers will automatically update investor_positions!
    INSERT INTO public.transactions_v2 (
        fund_id,
        investor_id,
        type,
        asset,
        amount,
        tx_date,
        created_by,
        notes,
        reference_id,
        purpose,
        distribution_id,
        source,
        is_voided
    ) VALUES (
        p_fund_id,
        p_investor_id,
        p_tx_type,
        v_fund.asset,
        CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -p_amount ELSE p_amount END,
        p_tx_date,
        v_admin,
        COALESCE(p_notes, p_tx_type || ' - ' || p_reference_id),
        p_reference_id,
        p_purpose,
        p_distribution_id,
        'rpc_canonical'::tx_source,
        false
    ) RETURNING id INTO v_transaction_id;

    -- 6. Log the administrative action
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        new_values
    ) VALUES (
        v_admin,
        'apply_investor_transaction',
        'transactions_v2',
        v_transaction_id::text,
        jsonb_build_object(
            'fund_id', p_fund_id,
            'investor_id', p_investor_id,
            'tx_type', p_tx_type,
            'amount', p_amount,
            'tx_date', p_tx_date,
            'reference_id', p_reference_id
        )
    );

    RETURN json_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'message', p_tx_type || ' successfully applied.'
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_transaction(p_transaction_id uuid, p_updates jsonb, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_new_tx_date date;
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

  -- First Principles Historical Lock: Base check
  IF check_historical_lock(v_tx.fund_id, v_tx.tx_date) THEN
    RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot edit a transaction on % because a subsequent Yield Distribution is locked on the ledger.', v_tx.tx_date;
  END IF;

  IF (p_updates ? 'tx_date' OR p_updates ? 'fund_id') THEN
    v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);
    v_new_tx_date := COALESCE((p_updates->>'tx_date')::date, v_tx.tx_date);
    IF check_historical_lock(v_new_fund_id, v_new_tx_date) THEN
       RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot move transaction to % because a subsequent Yield Distribution is locked on the ledger.', v_new_tx_date;
    END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid, p_admin_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_tx RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized: admin role required'; END IF;
  IF NOT check_is_admin(p_admin_id) THEN RAISE EXCEPTION 'Unauthorized for user %', p_admin_id; END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_tx.is_voided THEN RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id; END IF;

  -- First Principles Historical Lock
  IF check_historical_lock(v_tx.fund_id, v_tx.tx_date) THEN
    RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot void a transaction on % because a subsequent Yield Distribution is locked on the ledger. You must void the subsequent yield distributions first to safely unwind the ledger.', v_tx.tx_date;
  END IF;

  UPDATE transactions_v2 SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
    voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE fund_daily_aum SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
    void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync','tx_position_sync','auto_heal_sync','trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id);

  UPDATE fee_allocations SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id) AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE ib_commission_ledger SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
    void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE platform_fee_ledger SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
    void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided, 'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided, 'platform_fee_voided', v_platform_fee_voided),
    jsonb_build_object('source', 'void_transaction_rpc', 'v6_first_principles', true));

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', p_transaction_id, 'voided_at', now(),
    'daily_aum_voided', v_daily_aum_voided, 'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided, 'platform_fee_voided', v_platform_fee_voided,
    'message', 'Transaction voided with full V6 cascade');
END;
$function$;
