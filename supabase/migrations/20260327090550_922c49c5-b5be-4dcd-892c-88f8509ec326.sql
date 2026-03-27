-- Fix 1: fn_ledger_drives_position - add INTERNAL_CREDIT/INTERNAL_WITHDRAWAL to cost_basis
-- Fix 2: void_transaction - add investor_id filter to dust sweep cascade
-- Fix 3: recompute_on_void - correct misleading comment

-- ============================================================
-- FIX 1: fn_ledger_drives_position cost_basis alignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type = 'WITHDRAWAL' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- FIX 2: void_transaction - tighten dust sweep cascade
-- ============================================================
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
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

  -- CASCADE: investor_yield_events
  UPDATE public.investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE (trigger_transaction_id = p_transaction_id OR reference_id = v_tx.reference_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  -- CASCADE: DUST_SWEEP transactions (for full-exit withdrawals)
  -- FIX: Added investor_id filter to prevent cross-investor dust voiding
  -- dust-credit-% rows target fees_account, so they match via reference_id pattern only
  IF v_tx.type = 'WITHDRAWAL' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    UPDATE public.transactions_v2
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: dust for withdrawal ' || p_transaction_id::text
    WHERE type = 'DUST_SWEEP'
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND (reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%')
      AND (investor_id = v_tx.investor_id OR reference_id LIKE 'dust-credit-%');
    GET DIAGNOSTICS v_dust_sweeps_voided = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided),
    jsonb_build_object('source', 'void_transaction_rpc', 'cascade_v9', true,
      'dust_cascade', v_dust_sweeps_voided > 0)
  );

  RETURN jsonb_build_object(
    'success', true, 'transaction_id', p_transaction_id, 'voided_at', now(),
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided, 'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided, 'yield_events_voided', v_yield_events_voided,
    'dust_sweeps_voided', v_dust_sweeps_voided,
    'message', 'Transaction voided with cascade and dust sweep cleanup'
  );
END;
$$;

ALTER FUNCTION public.void_transaction(uuid, uuid, text) OWNER TO postgres;

-- ============================================================
-- FIX 3: recompute_on_void - correct misleading comment
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_on_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on void transitions
  IF NOT (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    RETURN NEW;
  END IF;

  -- The calling RPC (e.g., void_transaction) already set indigo.canonical_rpc = 'true'
  -- before updating transactions_v2. fn_ledger_drives_position has already handled the
  -- incremental delta in this same transaction. Skip the redundant full recompute.
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Safety net: full recompute with correct parameter order (investor first, fund second)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM reconcile_investor_position_internal(
    NEW.investor_id,  -- p_investor_id
    NEW.fund_id       -- p_fund_id
  );

  RETURN NEW;
END;
$$;