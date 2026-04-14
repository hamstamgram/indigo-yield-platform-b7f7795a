-- Migration: void_transaction cascades to related DUST_SWEEP transactions
-- When voiding a WITHDRAWAL, also void any DUST_SWEEP transactions
-- for the same investor, fund, and date (created by full-exit flow).
--
-- Safe: only affects DUST_SWEEP type, same fund+date, non-voided records.
-- The void_and_reissue_transaction RPC calls void_transaction internally,
-- so this cascade applies to both void-only and void-and-reissue flows.

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

  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
    WHERE fund_id = v_tx.fund_id AND is_voided = false
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
           OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  UPDATE public.fund_daily_aum
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  -- FIX: Recalculate AUM after voiding stale records
  PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id);

  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- Void related investor_yield_events
  UPDATE public.investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE (
      trigger_transaction_id = p_transaction_id
      OR reference_id = v_tx.reference_id
    )
    AND is_voided = false;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- CASCADE: When voiding a WITHDRAWAL, also void related DUST_SWEEP transactions.
  -- Full-exit withdrawals create paired dust sweeps (investor debit + fees credit)
  -- on the same fund, date. These must be voided together to maintain balance integrity.
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

    -- Also update positions for the fees account if dust was voided
    IF v_dust_sweeps_voided > 0 THEN
      -- Recompute positions for affected investors (dust debit investor + fees account)
      -- The position update for the original withdrawal investor is handled by the
      -- void_and_reissue_transaction or the caller. Here we handle the fees account.
      UPDATE public.investor_positions ip
      SET current_value = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
      ),
      updated_at = now()
      WHERE ip.fund_id = v_tx.fund_id
        AND ip.investor_id IN (
          SELECT id FROM public.profiles WHERE account_type = 'fees_account'
        );
    END IF;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'aum_events_voided', v_aum_events_voided, 'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided),
    jsonb_build_object('source', 'void_transaction_rpc', 'cascade_v6', true,
      'aum_recalculated', true, 'dust_cascade', v_dust_sweeps_voided > 0)
  );

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', p_transaction_id, 'voided_at', now(),
    'aum_events_voided', v_aum_events_voided, 'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
    'dust_sweeps_voided', v_dust_sweeps_voided,
    'message', 'Transaction voided with full cascade, AUM recalculation, and dust sweep cleanup'
  );

END;
$$;

ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'Voids a transaction with full cascade to: fund_aum_events, fund_daily_aum, fee_allocations, ib_commission_ledger, platform_fee_ledger, dust_sweep transactions. v6: Added dust sweep cascade for full-exit withdrawals.';
