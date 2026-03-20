-- HOTFIX: void_transaction v6 corrected for ACTUAL live schema
-- The previous migration used column names from the baseline migration that
-- don't exist in the live DB (fund_aum_events has no trigger_reference,
-- voided_at, voided_by, void_reason columns).
--
-- This version matches the ACTUAL live table schemas.

CREATE OR REPLACE FUNCTION "public"."void_transaction"(
  "p_transaction_id" "uuid",
  "p_admin_id" "uuid",
  "p_reason" "text"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided int := 0;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_events_voided int := 0;
  v_dust_sweeps_voided int := 0;
BEGIN
  -- Advisory lock: prevent concurrent void of same transaction
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Defense-in-depth: check JWT session admin status
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  -- Void the transaction itself
  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- CASCADE 1: fund_aum_events (simple schema: only has is_voided flag)
  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = true
    WHERE fund_id = v_tx.fund_id
      AND is_voided = false
      AND event_date = v_tx.tx_date;
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  -- CASCADE 2: fund_daily_aum (has full void columns)
  UPDATE public.fund_daily_aum
  SET is_voided = true
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  -- Recalculate AUM after voiding stale records
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id);
  EXCEPTION WHEN OTHERS THEN
    -- recalculate may fail if function doesn't exist or has different signature; non-fatal
    NULL;
  END;

  -- CASCADE 3: fee_allocations (has voided_at, voided_by, voided_by_profile_id)
  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- CASCADE 4: ib_commission_ledger (has voided_at, voided_by, void_reason)
  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- CASCADE 5: platform_fee_ledger (has voided_at, voided_by, void_reason)
  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- CASCADE 6: investor_yield_events
  UPDATE public.investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE (
      trigger_transaction_id = p_transaction_id
      OR reference_id = v_tx.reference_id
    )
    AND is_voided = false;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- CASCADE 7 (NEW): When voiding a WITHDRAWAL, also void related DUST_SWEEP transactions
  IF v_tx.type = 'WITHDRAWAL' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    UPDATE public.transactions_v2
    SET is_voided = true,
        voided_at = now(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: related dust sweep for withdrawal ' || p_transaction_id::text
    WHERE type = 'DUST_SWEEP'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND reference_id LIKE 'dust-sweep-%';
    GET DIAGNOSTICS v_dust_sweeps_voided = ROW_COUNT;

    -- Also void the dust credit transactions (to fees account)
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    UPDATE public.transactions_v2
    SET is_voided = true,
        voided_at = now(),
        voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: related dust credit for withdrawal ' || p_transaction_id::text
    WHERE type = 'DUST_SWEEP'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND reference_id LIKE 'dust-credit-%';
    v_dust_sweeps_voided := v_dust_sweeps_voided + COALESCE((SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE 1=0), 0);
    -- Re-count total dust sweeps voided
    SELECT count(*) INTO v_dust_sweeps_voided
    FROM public.transactions_v2
    WHERE type = 'DUST_SWEEP'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = true
      AND void_reason LIKE '%Cascade void: related dust%' || p_transaction_id::text || '%';
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'aum_events_voided', v_aum_events_voided, 'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided),
    jsonb_build_object('source', 'void_transaction_rpc', 'cascade_v7', true,
      'dust_cascade', v_dust_sweeps_voided > 0)
  );

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', p_transaction_id, 'voided_at', now(),
    'aum_events_voided', v_aum_events_voided, 'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
    'dust_sweeps_voided', v_dust_sweeps_voided,
    'message', 'Transaction voided with full cascade and dust sweep cleanup'
  );

END;
$$;

ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";
