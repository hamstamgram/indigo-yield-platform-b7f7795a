-- Fix void_transaction dust cascade: match BOTH frontend and backend reference patterns
-- AND heal ALL fund AUM snapshots globally

-- Step 1: Replace void_transaction with hardened dust cascade
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
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_events_voided int := 0;
  v_dust_sweeps_voided int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
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

  -- CASCADE: fund_daily_aum
  UPDATE public.fund_daily_aum
  SET is_voided = true
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'AUM refresh failed for fund % date %: %', v_tx.fund_id, v_tx.tx_date, SQLERRM;
  END;

  -- CASCADE: fee_allocations
  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- CASCADE: ib_commission_ledger
  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- CASCADE: platform_fee_ledger
  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- CASCADE: investor_yield_events (guarded)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE public.investor_yield_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id
    WHERE (trigger_transaction_id = p_transaction_id OR reference_id = v_tx.reference_id)
      AND is_voided = false;
    GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;
  END IF;

  -- CASCADE: DUST transactions (BOTH frontend and backend patterns)
  -- Frontend creates: type=DUST_SWEEP, reference_id LIKE 'dust-sweep-%' / 'dust-credit-%'
  -- Backend (complete_withdrawal) creates: type=DUST_SWEEP ref='DUST_SWEEP_OUT:*', type=DUST ref='DUST_RECV:*'
  IF v_tx.type = 'WITHDRAWAL' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    UPDATE public.transactions_v2
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: dust for withdrawal ' || p_transaction_id::text
    WHERE type IN ('DUST_SWEEP', 'DUST')
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND (
        -- Frontend pattern (useTransactionSubmit)
        reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%'
        -- Backend pattern (complete_withdrawal / approve_and_complete_withdrawal)
        OR reference_id LIKE 'DUST_SWEEP_OUT:%' OR reference_id LIKE 'DUST_RECV:%'
      )
      AND (
        investor_id = v_tx.investor_id
        OR reference_id LIKE 'dust-credit-%'
        OR reference_id LIKE 'DUST_RECV:%'
      );
    GET DIAGNOSTICS v_dust_sweeps_voided = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided),
    jsonb_build_object('source', 'void_transaction_rpc'));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transaction voided successfully',
    'transaction_id', p_transaction_id,
    'cascade_summary', jsonb_build_object(
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided
    )
  );
END;
$$;

-- Step 2: Global AUM snapshot heal for ALL active funds
DO $$
DECLARE
  v_row RECORD;
  v_result jsonb;
  v_count int := 0;
BEGIN
  FOR v_row IN
    SELECT DISTINCT f.id as fund_id, d.aum_date
    FROM funds f
    JOIN fund_daily_aum d ON d.fund_id = f.id AND d.is_voided = false
    WHERE f.status = 'active'
    ORDER BY d.aum_date
  LOOP
    v_result := recalculate_fund_aum_for_date(v_row.fund_id, v_row.aum_date);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Healed % AUM snapshots across all active funds', v_count;
END;
$$;