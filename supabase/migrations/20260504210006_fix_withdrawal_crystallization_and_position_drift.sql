-- =============================================================
-- Fix #1: fn_ledger_drives_position — DUST_SWEEP uses raw amount
-- Fix #2: approve_and_complete_withdrawal — skip crystallization
--          during full exit if yield already distributed
-- Fix #3: sync_aum_on_position_change — prevent duplicate AUM
-- =============================================================

-- =============================================================
-- Fix #1: DUST_SWEEP should use raw amount (not forced negative)
--
-- Bug: DUST_SWEEP was forced to -1*ABS(amount), making dust
--   credits to INDIGO Fees actually DECREASE the balance
-- Fix: Treat DUST_SWEEP like DEPOSIT/YIELD — use raw amount
--   (positive = credit, negative = debit)
-- =============================================================
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
    IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
      v_delta := -1 * ABS(NEW.amount);
    ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;
    -- FIX: Removed DUST_SWEEP special case — raw amount handles both debit (-) and credit (+)
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
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;
      -- FIX: Removed DUST_SWEEP special case from UPDATE branch too
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
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;
      -- FIX: Removed DUST_SWEEP special case from unvoid branch too
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

-- =============================================================
-- Fix #2: Skip crystallization during full exit if yield was
--   already distributed for the fund
--
-- Bug: approve_and_complete_withdrawal called
--   crystallize_yield_before_flow unconditionally for full exits,
--   even when yield was already distributed by
--   apply_segmented_yield_distribution_v5. This caused a massive
--   dust tolerance error and corrupted investor positions.
--
-- Fix: Check if a non-voided yield distribution already exists
--   for this fund on or after the settlement date. If so, skip
--   crystallization (yield is already captured).
-- =============================================================
CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text, p_is_full_exit boolean DEFAULT false, p_send_precision integer DEFAULT 3) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(28,10);
  v_balance numeric(28,10);
  v_pending_sum numeric(28,10);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(28,10);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(28,10);
  v_tx_date date;
  v_dust_tolerance numeric;
  v_existing_yield boolean;
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Use settlement_date from the withdrawal request, fallback to CURRENT_DATE
  v_tx_date := COALESCE(v_request.settlement_date, CURRENT_DATE);

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- FIX: Skip crystallization if yield was already distributed for this fund
  -- Check for any non-voided yield distribution on or after settlement_date
  IF p_is_full_exit THEN
    SELECT EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = v_request.fund_id
        AND is_voided = false
        AND effective_date >= v_tx_date
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal')
    ) INTO v_existing_yield;

    IF v_existing_yield THEN
      RAISE NOTICE 'Skipping crystallization for full exit %: yield already distributed for fund % on or after %',
        p_request_id, v_request.fund_id, v_tx_date;
    ELSE
      BEGIN
        SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
        FROM investor_positions ip
        WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

        SELECT public.crystallize_yield_before_flow(
          v_request.fund_id,
          v_closing_aum,
          'withdrawal',
          'full-exit:' || p_request_id::text,
          NOW(),
          v_admin_id
        ) INTO v_crystal_result;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Crystallization failed during full exit for request %: %', p_request_id, SQLERRM;
      END;
    END IF;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    IF p_processed_amount IS NOT NULL AND p_processed_amount > 0 THEN
      v_final_amount := p_processed_amount;
    ELSE
      v_final_amount := TRUNC(v_balance, p_send_precision);
    END IF;
    v_dust := v_balance - v_final_amount;

    IF v_dust < 0 THEN
      v_dust := 0;
    END IF;

    IF v_final_amount <= 0 AND v_dust <= 0 THEN
      RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'WITHDRAWAL',
      -ABS(v_final_amount),
      v_tx_date,
      v_fund.asset,
      v_reference_id,
      COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id,
      false,
      'investor_visible',
      'rpc_canonical',
      p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  IF p_is_full_exit AND v_dust > 0 THEN
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'DUST_SWEEP',
      -ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_fees_account_id,
      'DUST_SWEEP',
      ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;
  END IF;

  IF p_is_full_exit THEN
    v_dust_tolerance := COALESCE(public.get_dust_tolerance_for_fund(v_request.fund_id), 0.01);

    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id
      AND current_value <= v_dust_tolerance;
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision,
      'settlement_date', v_tx_date,
      'crystallization_skipped', COALESCE(v_existing_yield, false)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit,
    'settlement_date', v_tx_date,
    'crystallization_skipped', COALESCE(v_existing_yield, false)
  );
END;
$$;

-- =============================================================
-- Fix #3: sync_aum_on_position_change — prevent duplicate AUM
--   records by using proper date and avoiding redundant inserts
--
-- Bug: The trigger used CURRENT_DATE which creates duplicate AUM
--   records when multiple position changes happen same day.
-- Fix: Only insert if no non-voided record exists for same
--   fund/date/purpose combination; update if exists.
-- =============================================================
CREATE OR REPLACE FUNCTION public.sync_aum_on_position_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_id uuid;
  v_new_aum numeric(28,10);
  v_aum_date date;
  v_tx_date_str text;
  v_already_synced text;
  v_updated_rows int;
BEGIN
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);

  BEGIN
    v_already_synced := current_setting('indigo.aum_synced', true);
    IF v_already_synced = 'true' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    v_tx_date_str := current_setting('indigo.current_tx_date', true);
    IF v_tx_date_str IS NOT NULL AND v_tx_date_str != '' THEN
      v_aum_date := v_tx_date_str::date;
    ELSE
      v_aum_date := CURRENT_DATE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_aum_date := CURRENT_DATE;
  END;

  PERFORM public.set_canonical_rpc(true);

  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true;

  -- FIX: UPDATE existing non-voided record first
  UPDATE fund_daily_aum
  SET total_aum = v_new_aum,
      source = 'tx_position_sync',
      updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = v_aum_date
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  -- FIX: Only insert if no non-voided record exists for this fund/date/purpose
  IF v_updated_rows = 0 AND NOT EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = v_fund_id
      AND aum_date = v_aum_date
      AND purpose = 'transaction'
      AND is_voided = false
  ) THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
    VALUES (v_fund_id, v_aum_date, v_new_aum, 'tx_position_sync', 'transaction', false);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
