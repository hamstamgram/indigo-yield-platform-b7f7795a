-- Platform Precision Upgrade: All functions to numeric(38,18)
-- + Position rebuild + BTC withdrawal date corrections

-- =============================================
-- PART 1: Upgrade all 12 functions
-- =============================================

-- 1. recompute_investor_position
DROP FUNCTION IF EXISTS public.recompute_investor_position(uuid, uuid);
CREATE OR REPLACE FUNCTION public.recompute_investor_position(p_investor_id uuid, p_fund_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      ELSE amount
    END
  ), 0) INTO v_current_value
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0) INTO v_cost_basis
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  IF v_cost_basis < 0 THEN
    v_cost_basis := 0;
  END IF;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active, updated_at)
  VALUES (p_investor_id, p_fund_id, v_current_value, v_cost_basis, 0, v_current_value > 0, now())
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$function$;

-- 2. fn_ledger_drives_position
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
        WHEN NEW.type = 'DEPOSIT' THEN ABS(NEW.amount)
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
        WHEN NEW.type = 'DEPOSIT' THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
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
          WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
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
          WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
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

-- 3. can_withdraw
CREATE OR REPLACE FUNCTION public.can_withdraw(p_investor_id uuid, p_fund_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position record;
  v_reserved numeric(38,18) := 0;
  v_available numeric(38,18) := 0;
BEGIN
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'No position found in this fund');
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0)::numeric(38,18)
  INTO v_reserved
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  v_available := COALESCE(v_position.current_value, 0)::numeric(38,18) - COALESCE(v_reserved, 0)::numeric(38,18);

  IF p_amount::numeric(38,18) > v_available THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Insufficient available balance (reserved withdrawals pending)',
      'current_value', COALESCE(v_position.current_value, 0),
      'reserved', COALESCE(v_reserved, 0),
      'available', v_available,
      'requested_amount', p_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', COALESCE(v_position.current_value, 0),
    'reserved', COALESCE(v_reserved, 0),
    'available', v_available
  );
END;
$function$;

-- 4. get_available_balance
CREATE OR REPLACE FUNCTION public.get_available_balance(p_investor_id uuid, p_fund_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric(38,18);
  v_pending numeric(38,18);
BEGIN
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  RETURN GREATEST(COALESCE(v_balance, 0) - COALESCE(v_pending, 0), 0);
END;
$function$;

-- 5. get_platform_flow_metrics
CREATE OR REPLACE FUNCTION public.get_platform_flow_metrics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_deposits numeric(38,18);
  v_total_withdrawals numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits 
  FROM public.transactions_v2 
  WHERE type = 'DEPOSIT' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals 
  FROM public.transactions_v2 
  WHERE type = 'WITHDRAWAL' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  RETURN jsonb_build_object(
    'totalDeposits', v_total_deposits,
    'totalWithdrawals', v_total_withdrawals,
    'netFlow', v_total_deposits - v_total_withdrawals
  );
END;
$function$;

-- 6. validate_yield_parameters
CREATE OR REPLACE FUNCTION public.validate_yield_parameters(p_fund_id uuid, p_yield_date date, p_gross_yield_pct numeric, p_purpose text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric(38,18);
  v_gross_yield numeric(38,18);
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  IF p_gross_yield_pct < 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'NEGATIVE_YIELD',
      'message', 'Negative yield: ' || p_gross_yield_pct || '%. All balances will decrease proportionally. Fees = 0.'
    );
  END IF;

  IF p_gross_yield_pct > 50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_HIGH', 'message', 'Yield percentage exceeds 50% daily maximum');
  ELSIF p_gross_yield_pct > 10 THEN
    v_warnings := v_warnings || jsonb_build_object('code', 'HIGH_YIELD', 'message', 'Yield percentage above 10% - please verify');
  END IF;

  IF p_gross_yield_pct < -50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_LOW', 'message', 'Negative yield exceeds -50% - please verify');
  END IF;

  SELECT aum_value INTO v_fund_aum
  FROM get_funds_aum_snapshot(p_yield_date, p_purpose::aum_purpose)
  WHERE fund_id = p_fund_id;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    v_errors := v_errors || jsonb_build_object('code', 'ZERO_AUM', 'message', 'AUM is zero - cannot apply yield');
  END IF;

  IF v_fund_aum IS NOT NULL AND v_fund_aum > 0 THEN
    v_gross_yield := v_fund_aum * (p_gross_yield_pct / 100);
    IF v_gross_yield > 0 AND v_gross_yield < 0.01 THEN
      v_warnings := v_warnings || jsonb_build_object('code', 'SMALL_YIELD', 'message', 'Calculated yield is very small: ' || v_gross_yield::text);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND effective_date = p_yield_date AND purpose = p_purpose AND status = 'applied'
  ) THEN
    v_errors := v_errors || jsonb_build_object('code', 'DUPLICATE', 'message', 'Yield already applied for this date');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE account_type = 'fees_account') THEN
    v_errors := v_errors || jsonb_build_object('code', 'NO_FEES_ACCOUNT', 'message', 'INDIGO Fees account not found');
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'calculated_yield', v_gross_yield,
    'aum', v_fund_aum
  );
END;
$function$;

-- 7. adjust_investor_position
CREATE OR REPLACE FUNCTION public.adjust_investor_position(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_tx_date date, p_reason text, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_fund_asset text;
  v_fund_class text;
  v_balance_before numeric(38,18);
  v_balance_after numeric(38,18);
  v_tx_id uuid;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());
  PERFORM pg_advisory_xact_lock(hashtext('position:' || p_investor_id::text), hashtext(p_fund_id::text));
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  SELECT COALESCE(current_value, 0) INTO v_balance_before FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;
  IF v_balance_after < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance'); END IF;
  INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, fund_class, notes, created_by, is_voided, balance_before, balance_after, source, visibility_scope)
  VALUES (p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class, p_reason, v_actor, false, v_balance_before, v_balance_after, 'manual_admin', 'investor_visible')
  RETURNING id INTO v_tx_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'balance_after', v_balance_after);
END;
$function$;

-- 8. approve_and_complete_withdrawal
CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text, p_is_full_exit boolean DEFAULT false, p_send_precision integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(38,18);
  v_balance numeric(38,18);
  v_pending_sum numeric(38,18);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(38,18);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(38,18);
  v_tx_date date;
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

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
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
      NULL;
    END;
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

    IF v_final_amount > v_balance THEN
      v_final_amount := v_balance;
      v_dust := 0;
    END IF;

    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
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

  -- Check for other pending withdrawals (exclude current request)
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

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger (only if send amount > 0)
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

  -- If full exit with dust, create DUST_SWEEP transactions
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

    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id;
  END IF;

  -- Update withdrawal request to completed
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

  -- Audit logging
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
      'settlement_date', v_tx_date
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
    'settlement_date', v_tx_date
  );
END;
$function$;

-- 9. internal_route_to_fees
CREATE OR REPLACE FUNCTION public.internal_route_to_fees(p_from_investor_id uuid, p_fund_id uuid, p_amount numeric, p_effective_date date, p_reason text, p_admin_id uuid, p_transfer_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(transfer_id uuid, debit_tx_id uuid, credit_tx_id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer_id uuid := COALESCE(p_transfer_id, gen_random_uuid());
  v_debit_tx_id uuid;
  v_credit_tx_id uuid;
  v_fund record;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Admin access required';
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Amount must be positive';
    RETURN;
  END IF;

  IF check_historical_lock(p_fund_id, p_effective_date) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'FIRST PRINCIPLES VIOLATION: Cannot route funds on ' || p_effective_date || ' because a subsequent Yield Distribution is locked on the ledger.';
    RETURN;
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fund not found for ID: ' || COALESCE(p_fund_id::text, 'NULL');
    RETURN;
  END IF;

  SELECT id INTO v_fees_account_id
  FROM public.profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fees account not configured (profiles.account_type=fees_account)';
    RETURN;
  END IF;

  SELECT
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_WITHDRAWAL'::public.tx_type LIMIT 1),
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_CREDIT'::public.tx_type LIMIT 1)
  INTO v_debit_tx_id, v_credit_tx_id;

  IF v_debit_tx_id IS NOT NULL OR v_credit_tx_id IS NOT NULL THEN
    RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Transfer already processed';
    RETURN;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_from_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (-ABS(p_amount))::numeric(38,18),
    'INTERNAL_WITHDRAWAL'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_debit_tx_id;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    v_fees_account_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    ABS(p_amount)::numeric(38,18),
    'INTERNAL_CREDIT'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_credit_tx_id;

  RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Internal transfer completed successfully';
END;
$function$;

-- 10. reconcile_investor_position_internal
CREATE OR REPLACE FUNCTION public.reconcile_investor_position_internal(p_fund_id uuid, p_investor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
  v_realized_pnl numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  v_cost_basis := GREATEST(v_cost_basis, 0);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_realized_pnl
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false)
    AND type IN ('YIELD', 'IB_CREDIT', 'INTEREST', 'FEE_CREDIT');

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO investor_positions (
    investor_id, fund_id, cost_basis, current_value, shares, realized_pnl,
    is_active, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_current_value, v_realized_pnl,
    (v_current_value > 0),
    now()
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    realized_pnl = EXCLUDED.realized_pnl,
    is_active = (EXCLUDED.current_value > 0),
    updated_at = now();
END;
$function$;

-- 11. route_withdrawal_to_fees
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(p_request_id uuid, p_actor_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_fees_investor_id uuid;
  v_internal_withdrawal_id uuid;
  v_internal_credit_id uuid;
  v_amount numeric(38,18);
  v_fund_id uuid;
  v_asset text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Actor ID must be provided';
  END IF;
  IF NOT public.has_super_admin_role(p_actor_id) THEN
    RAISE EXCEPTION 'Superadmin required for route_withdrawal_to_fees';
  END IF;

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  IF v_withdrawal.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal must be approved or processing. Current: %', v_withdrawal.status;
  END IF;

  SELECT id INTO v_fees_investor_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;
  IF v_fees_investor_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found.';
  END IF;

  v_amount := COALESCE(v_withdrawal.processed_amount, v_withdrawal.approved_amount, v_withdrawal.requested_amount);
  v_fund_id := v_withdrawal.fund_id;
  SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', v_fund_id;
  END IF;

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_withdrawal.investor_id, v_fund_id,
    'INTERNAL_WITHDRAWAL'::tx_type, -1 * v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Routed to INDIGO FEES'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_withdrawal_id;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_fees_investor_id, v_fund_id,
    'INTERNAL_CREDIT'::tx_type, v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Received from withdrawal routing'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_credit_id;

  UPDATE withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    processed_amount = v_amount,
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'Routed to INDIGO FEES: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_request_id;

  INSERT INTO audit_log (
    actor_user, action, entity, entity_id, meta
  ) VALUES (
    p_actor_id,
    'route_to_fees',
    'withdrawal_requests',
    p_request_id,
    jsonb_build_object(
      'withdrawal_id', p_request_id,
      'investor_id', v_withdrawal.investor_id,
      'fees_investor_id', v_fees_investor_id,
      'amount', v_amount,
      'asset', v_asset,
      'internal_withdrawal_id', v_internal_withdrawal_id,
      'internal_credit_id', v_internal_credit_id,
      'reason', p_reason
    )
  );

  RETURN true;
END;
$function$;

-- 12. void_and_reissue_full_exit
CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(p_transaction_id uuid, p_new_amount numeric, p_admin_id uuid, p_reason text, p_send_precision integer DEFAULT 3, p_new_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_new_request_id uuid;
  v_balance numeric(38,18);
  v_dust numeric(38,18);
  v_fees_account_id uuid;
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fund RECORD;
  v_effective_date date;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_orig.is_voided THEN RAISE EXCEPTION 'Transaction is already voided'; END IF;
  IF v_orig.type <> 'WITHDRAWAL' THEN RAISE EXCEPTION 'Only WITHDRAWAL transactions supported'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN RAISE EXCEPTION 'Reason must be at least 10 chars'; END IF;

  v_effective_date := COALESCE(p_new_date, v_orig.tx_date);

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  SELECT * INTO v_fund FROM funds WHERE id = v_orig.fund_id;

  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id
    AND status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (request_date - v_orig.created_at))) < 86400
  ORDER BY request_date DESC LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'No linked withdrawal_request found. Use simple void-and-reissue.';
  END IF;
  v_request_id := v_request.id;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);
  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction';
  END IF;

  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'V&R full-exit correction: ' || TRIM(p_reason),
      cancelled_by = p_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  v_new_request_id := gen_random_uuid();
  INSERT INTO withdrawal_requests (
    id, fund_id, fund_class, investor_id, requested_amount, withdrawal_type,
    status, settlement_date, notes, created_by, updated_at
  ) VALUES (
    v_new_request_id,
    v_request.fund_id,
    v_request.fund_class,
    v_request.investor_id,
    ABS(p_new_amount),
    'full',
    'pending',
    v_effective_date,
    'V&R correction of ' || v_request_id::text || ': ' || TRIM(p_reason),
    p_admin_id,
    NOW()
  );

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_new_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := false,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process withdrawal';
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_dust := v_balance;

  IF v_dust > 0 THEN
    SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

    IF v_fees_account_id IS NOT NULL THEN
      PERFORM set_config('indigo.canonical_rpc', 'true', true);

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_orig.investor_id, 'DUST_SWEEP', -ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-sweep-' || v_new_request_id::text,
        'V&R dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_tx_id;

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_fees_account_id, 'DUST_SWEEP', ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-credit-' || v_new_request_id::text,
        'Dust received from V&R of ' || v_orig.investor_id::text,
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_credit_tx_id;

      UPDATE investor_positions
      SET is_active = false, updated_at = NOW()
      WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
    END IF;
  ELSE
    UPDATE investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_tx_id', p_transaction_id, 'original_amount', v_orig.amount,
      'old_request_id', v_request_id, 'original_date', v_orig.tx_date),
    jsonb_build_object('new_request_id', v_new_request_id, 'new_amount', p_new_amount,
      'new_date', v_effective_date, 'dust_amount', v_dust),
    jsonb_build_object('source', 'void_and_reissue_full_exit_rpc_v4', 'reason', TRIM(p_reason))
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'transaction_id',
    'old_request_id', v_request_id,
    'new_request_id', v_new_request_id,
    'new_processed_amount', ABS(p_new_amount),
    'new_date', v_effective_date,
    'dust_amount', v_dust,
    'message', 'Full-exit withdrawal corrected'
  );
END;
$function$;

-- =============================================
-- PART 2: Rebuild all positions from ledger
-- =============================================
DO $$ 
DECLARE 
  r RECORD; 
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  FOR r IN SELECT DISTINCT investor_id, fund_id FROM transactions_v2 WHERE is_voided = false
  LOOP
    PERFORM recompute_investor_position(r.investor_id, r.fund_id);
  END LOOP;
END $$;

-- =============================================
-- PART 3: Fix BTC withdrawal_requests dates
-- =============================================

-- 964dec83: ledger tx_date = 2024-11-09
UPDATE withdrawal_requests SET
  request_date = '2024-11-09'::timestamptz,
  approved_at = '2024-11-09'::timestamptz,
  processed_at = '2024-11-09'::timestamptz
WHERE id = '964dec83-d675-4539-85ae-67decc425ce4';

-- f78d35be: ledger tx_date = 2024-12-14
UPDATE withdrawal_requests SET
  request_date = '2024-12-14'::timestamptz,
  approved_at = '2024-12-14'::timestamptz,
  processed_at = '2024-12-14'::timestamptz
WHERE id = 'f78d35be-7ddb-4b90-85a7-d8964f19b26a';

-- bc37d3f9: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = 'bc37d3f9-d306-46d8-81c3-7eac5abd12f5';

-- 7dcf819b: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = '7dcf819b-6d13-46b0-a0da-84f80ff05655';

-- ed3a039d: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = 'ed3a039d-0334-4c19-b025-eac0fdcbe6be';