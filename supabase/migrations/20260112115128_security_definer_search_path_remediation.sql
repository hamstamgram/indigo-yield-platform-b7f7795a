-- Security remediation: CVE-mitigating search_path fix
-- This migration adds SET search_path = public to all SECURITY DEFINER functions
-- to prevent search_path hijacking attacks (CVE-2018-1058 and similar)
--
-- Functions remediated: 57
-- Priority functions addressed: check_is_admin, is_admin_safe, log_audit_event,
--   encrypt_totp_secret, decrypt_totp_secret, all admin_* and apply_* functions

CREATE OR REPLACE FUNCTION public.add_fund_to_investor(p_investor_id uuid, p_fund_id text, p_initial_shares numeric DEFAULT 0, p_cost_basis numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_position_id UUID;
BEGIN
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    shares,
    cost_basis,
    current_value,
    created_at,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_initial_shares,
    p_cost_basis,
    p_cost_basis,
    now(),
    now()
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    shares = investor_positions.shares + EXCLUDED.shares,
    cost_basis = investor_positions.cost_basis + EXCLUDED.cost_basis,
    updated_at = now()
  RETURNING id INTO v_position_id;

  RETURN v_position_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_investor_position(p_investor_id uuid, p_fund_id uuid, p_delta numeric, p_note text, p_admin_id uuid)
 RETURNS TABLE(investor_id uuid, fund_id uuid, previous_balance numeric, new_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_prev numeric; v_new numeric; v_asset text;
BEGIN
  SELECT current_value INTO v_prev FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  IF v_prev IS NULL THEN
    v_prev := 0;
    INSERT INTO investor_positions (investor_id, fund_id, fund_class, shares, current_value, cost_basis, updated_at)
    SELECT p_investor_id, p_fund_id, f.asset, p_delta, p_delta, p_delta, now() FROM funds f WHERE f.id = p_fund_id
    ON CONFLICT (investor_id, fund_id) DO NOTHING;
  END IF;
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  v_new := COALESCE(v_prev,0) + COALESCE(p_delta,0);
  INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_by)
  VALUES (gen_random_uuid(), p_investor_id, p_fund_id, 'ADJUSTMENT', v_asset, p_delta, now()::date, 'position_adjustment', p_note, p_admin_id);
  UPDATE investor_positions SET current_value = v_new, shares = shares + p_delta, updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  investor_id := p_investor_id; fund_id := p_fund_id; previous_balance := COALESCE(v_prev,0); new_balance := v_new;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_investor_position(p_investor_id uuid, p_fund_id uuid, p_new_balance numeric, p_adjustment_type character varying, p_reason text, p_admin_id uuid, p_create_transaction boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_balance NUMERIC;
  v_adjustment_amount NUMERIC;
  v_fund_asset TEXT;
  v_investor_name TEXT;
BEGIN
  -- Get current position
  SELECT ip.current_value, f.asset, CONCAT(p.first_name, ' ', p.last_name)
  INTO v_current_balance, v_fund_asset, v_investor_name
  FROM investor_positions ip
  JOIN funds f ON f.id = ip.fund_id
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Position not found'
    );
  END IF;

  v_adjustment_amount := p_new_balance - v_current_balance;

  -- Update position
  UPDATE investor_positions
  SET current_value = p_new_balance,
      updated_at = NOW()
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  -- Log adjustment
  INSERT INTO position_adjustments (
    investor_id, fund_id, adjustment_date, previous_balance,
    new_balance, adjustment_amount, adjustment_type, reason, approved_by
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    CURRENT_DATE,
    v_current_balance,
    p_new_balance,
    v_adjustment_amount,
    p_adjustment_type,
    p_reason,
    p_admin_id
  );

  -- Create transaction if requested
  IF p_create_transaction THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
    )
    VALUES (
      p_investor_id,
      p_fund_id,
      CASE WHEN v_adjustment_amount >= 0 THEN 'INTEREST' ELSE 'FEE' END,
      v_fund_asset,
      ABS(v_adjustment_amount),
      CURRENT_DATE,
      CURRENT_DATE,
      'Position adjustment: ' || p_reason
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'investor_id', p_investor_id,
    'investor_name', v_investor_name,
    'fund_id', p_fund_id,
    'fund_asset', v_fund_asset,
    'previous_balance', v_current_balance,
    'new_balance', p_new_balance,
    'adjustment_amount', v_adjustment_amount,
    'adjustment_type', p_adjustment_type
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_create_transaction(p_investor_id uuid, p_fund_id text, p_transaction_type text, p_amount numeric, p_shares numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_transaction_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only admins can create transactions';
  END IF;

  INSERT INTO public.transactions (
    investor_id,
    fund_id,
    type,
    amount,
    shares,
    notes,
    status,
    created_by,
    created_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_transaction_type,
    p_amount,
    p_shares,
    p_notes,
    'COMPLETED',
    auth.uid(),
    now()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(p_fund_id text, p_rate_date date, p_daily_rate numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.investor_positions
  SET
    current_value = current_value * (1 + p_daily_rate),
    updated_at = now()
  WHERE fund_id = p_fund_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Log the yield application
  INSERT INTO public.audit_log (table_name, operation, new_data)
  VALUES (
    'investor_positions',
    'YIELD_APPLIED',
    jsonb_build_object(
      'fund_id', p_fund_id,
      'rate_date', p_rate_date,
      'daily_rate', p_daily_rate,
      'positions_updated', v_updated_count
    )
  );

  RETURN v_updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(p_fund_id uuid, p_date date, p_gross_amount numeric, p_admin_id uuid)
 RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total numeric;
  v_asset text;
  v_ref text;
  rec record;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
BEGIN
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund % not found', p_fund_id;
  END IF;

  -- Total current_value across investors for this fund
  SELECT SUM(current_value) INTO v_total
  FROM investor_positions
  WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM for fund % on %', p_fund_id, p_date;
  END IF;

  -- idempotency key for this fund/date
  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN
    SELECT investor_id, current_value
    FROM investor_positions
    WHERE fund_id = p_fund_id
      AND current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    -- INTEREST (gross)
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at
    ) VALUES (
      gen_random_uuid(), rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now()
    );

    -- FEE (negative)
    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_at
      ) VALUES (
        gen_random_uuid(), rec.investor_id, p_fund_id, 'FEE', v_asset, v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now()
      );
    END IF;

    -- Update position current_value with net (gross - fee)
    UPDATE investor_positions
    SET current_value = current_value + v_net,
        updated_at = now()
    WHERE investor_id = rec.investor_id
      AND fund_id = p_fund_id;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_fees(p_fund_id text, p_rate_date date, p_gross_rate numeric, p_fee_rate numeric DEFAULT 0)
 RETURNS TABLE(positions_updated integer, gross_yield numeric, fees_collected numeric, net_yield numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_updated_count INTEGER := 0;
  v_total_value_before NUMERIC;
  v_gross_yield NUMERIC;
  v_fees NUMERIC;
  v_net_rate NUMERIC;
BEGIN
  -- Calculate net rate after fees
  v_net_rate := p_gross_rate * (1 - p_fee_rate);

  -- Get total value before
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_value_before
  FROM public.investor_positions
  WHERE fund_id = p_fund_id;

  -- Apply net yield
  UPDATE public.investor_positions
  SET
    current_value = current_value * (1 + v_net_rate),
    updated_at = now()
  WHERE fund_id = p_fund_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Calculate yields
  v_gross_yield := v_total_value_before * p_gross_rate;
  v_fees := v_total_value_before * p_gross_rate * p_fee_rate;

  RETURN QUERY SELECT
    v_updated_count,
    v_gross_yield,
    v_fees,
    v_gross_yield - v_fees;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_request_id uuid, p_approved_amount numeric DEFAULT NULL::numeric, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request RECORD;
  v_final_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Determine approval amount
  v_final_amount := COALESCE(p_approved_amount, v_request.requested_amount);
  
  -- Validate amount
  IF v_final_amount <= 0 THEN 
    RAISE EXCEPTION 'Approved amount must be greater than zero';
  END IF;
  
  IF v_final_amount > v_request.requested_amount THEN 
    RAISE EXCEPTION 'Approved amount cannot exceed requested amount';
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'approved',
    approved_amount = v_final_amount,
    approved_by = auth.uid(),
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id, 
    'approve', 
    jsonb_build_object(
      'approved_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_access_notification(notification_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notifications
        WHERE id = notification_id
        AND (user_id = auth.uid() OR public.is_admin())
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_withdraw(p_investor_id uuid, p_fund_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_result JSONB;
BEGIN
  -- Get investor position
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  -- Get fund details
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = p_fund_id;
  
  -- Check if position exists
  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'No position found in this fund'
    );
  END IF;
  
  -- Check if amount is valid
  IF p_amount > v_position.current_value THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Requested amount exceeds current position value',
      'current_value', v_position.current_value,
      'requested_amount', p_amount
    );
  END IF;
  
  -- Check lock period
  IF v_position.lock_until_date IS NOT NULL AND v_position.lock_until_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Position is locked until ' || v_position.lock_until_date::TEXT,
      'lock_until', v_position.lock_until_date
    );
  END IF;
  
  -- Check if there are pending withdrawals
  IF EXISTS (
    SELECT 1 FROM public.withdrawal_requests
    WHERE investor_id = p_investor_id 
      AND fund_id = p_fund_id
      AND status IN ('pending', 'approved', 'processing')
  ) THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'There is already a pending withdrawal request for this fund'
    );
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', v_position.current_value,
    'shares', v_position.shares,
    'lock_until', v_position.lock_until_date
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin(p_request_id uuid, p_reason text, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Validate cancellation reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN 
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'approved') THEN 
    RAISE EXCEPTION 'Can only cancel pending or approved requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'cancelled',
    cancellation_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'cancel',
    jsonb_build_object(
      'reason', p_reason,
      'previous_status', v_request.status,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    admin_status BOOLEAN;
BEGIN
    -- Direct query without RLS since this function runs with definer privileges
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_withdrawal(p_request_id uuid, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN 
    RAISE EXCEPTION 'Can only complete requests in processing. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    tx_hash = COALESCE(p_tx_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'tx_hash', COALESCE(p_tx_hash, v_request.tx_hash),
      'processed_amount', v_request.processed_amount,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(p_investor_id uuid, p_fund_id uuid, p_amount numeric, p_type text DEFAULT 'partial'::text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_request_id UUID;
  v_can_withdraw JSONB;
  v_fund_class TEXT;
BEGIN
  -- Check if withdrawal is allowed
  v_can_withdraw = public.can_withdraw(p_investor_id, p_fund_id, p_amount);
  
  IF NOT (v_can_withdraw->>'can_withdraw')::BOOLEAN THEN
    RAISE EXCEPTION 'Withdrawal not allowed: %', v_can_withdraw->>'reason';
  END IF;
  
  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  -- Create the request
  INSERT INTO public.withdrawal_requests (
    investor_id,
    fund_id,
    fund_class,
    requested_amount,
    withdrawal_type,
    notes,
    created_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_fund_class,
    p_amount,
    p_type,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_totp_secret(encrypted_secret bytea)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    master_key BYTEA;
    decrypted_secret TEXT;
BEGIN
    -- Get the master key for TOTP encryption
    SELECT secret INTO master_key 
    FROM pgsodium.key 
    WHERE name = 'totp_master_key';
    
    IF master_key IS NULL THEN
        RAISE EXCEPTION 'TOTP master key not found';
    END IF;
    
    -- Decrypt the secret
    decrypted_secret := convert_from(
        pgsodium.crypto_aead_det_decrypt(
            encrypted_secret,
            convert_to('totp_secret', 'utf8'),
            master_key
        ),
        'utf8'
    );
    
    RETURN decrypted_secret;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to pgcrypto
        RETURN pgp_sym_decrypt(encrypted_secret, 'totp_master_key_fallback');
END;
$function$;

CREATE OR REPLACE FUNCTION public.distribute_daily_yield(p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_admin_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_net_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investor RECORD;
  v_investor_yield NUMERIC;
  v_investor_fee NUMERIC;
  v_investor_net NUMERIC;
  v_result JSONB;
  v_distributions JSONB := '[]'::JSONB;
  v_fund_asset TEXT;
BEGIN
  -- Get fund asset for transactions
  SELECT asset INTO v_fund_asset
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Calculate current AUM from positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_current_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active positions in fund'
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'New AUM must be greater than current AUM for positive yield',
      'current_aum', v_current_aum,
      'new_aum', p_new_aum
    );
  END IF;

  -- Process each investor
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value,
      ip.current_value / NULLIF(v_current_aum, 0) as allocation_pct,
      COALESCE(p.fee_percentage, 0.20) as fee_pct,
      CONCAT(p.first_name, ' ', p.last_name) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate proportional yield
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;

    -- Calculate fee (only on positive yield)
    v_investor_fee := v_investor_yield * v_investor.fee_pct;
    v_investor_net := v_investor_yield - v_investor_fee;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_investor_net,
        updated_at = NOW()
    WHERE investor_id = v_investor.investor_id
      AND fund_id = p_fund_id;

    -- Create INTEREST transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
    )
    VALUES (
      v_investor.investor_id,
      p_fund_id,
      'INTEREST',
      v_fund_asset,
      v_investor_net,
      p_yield_date,
      p_yield_date,
      'Daily yield distribution'
    );

    -- Create FEE transaction if fee > 0
    IF v_investor_fee > 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, amount, tx_date, value_date, notes
      )
      VALUES (
        v_investor.investor_id,
        p_fund_id,
        'FEE',
        v_fund_asset,
        v_investor_fee,
        p_yield_date,
        p_yield_date,
        'Performance fee (' || ROUND(v_investor.fee_pct * 100) || '%)'
      );
    END IF;

    -- Log position adjustment
    INSERT INTO position_adjustments (
      investor_id, fund_id, adjustment_date, previous_balance,
      new_balance, adjustment_amount, adjustment_type, reason, approved_by
    )
    VALUES (
      v_investor.investor_id,
      p_fund_id,
      p_yield_date,
      v_investor.current_value,
      v_investor.current_value + v_investor_net,
      v_investor_net,
      'yield',
      'Daily yield distribution',
      p_admin_id
    );

    -- Track totals
    v_net_yield := v_net_yield + v_investor_net;
    v_total_fees := v_total_fees + v_investor_fee;

    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'previous_balance', v_investor.current_value,
      'allocation_pct', ROUND(v_investor.allocation_pct * 100, 4),
      'fee_pct', ROUND(v_investor.fee_pct * 100, 2),
      'gross_yield', ROUND(v_investor_yield::NUMERIC, 8),
      'fee', ROUND(v_investor_fee::NUMERIC, 8),
      'net_yield', ROUND(v_investor_net::NUMERIC, 8),
      'new_balance', ROUND((v_investor.current_value + v_investor_net)::NUMERIC, 8)
    );
  END LOOP;

  -- Record in fund_daily_aum
  INSERT INTO fund_daily_aum (
    fund_id, record_date, opening_aum, closing_aum,
    gross_yield, net_yield, yield_percentage,
    total_fees_collected, investor_count, entered_by, status, applied_at
  )
  VALUES (
    p_fund_id, p_yield_date, v_current_aum, p_new_aum,
    v_gross_yield, v_net_yield,
    ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 6),
    v_total_fees,
    (SELECT COUNT(*) FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0),
    p_admin_id, 'applied', NOW()
  )
  ON CONFLICT (fund_id, record_date) DO UPDATE SET
    closing_aum = EXCLUDED.closing_aum,
    gross_yield = EXCLUDED.gross_yield,
    net_yield = EXCLUDED.net_yield,
    yield_percentage = EXCLUDED.yield_percentage,
    total_fees_collected = EXCLUDED.total_fees_collected,
    investor_count = EXCLUDED.investor_count,
    status = 'applied',
    applied_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_asset', v_fund_asset,
    'yield_date', p_yield_date,
    'current_aum', v_current_aum,
    'new_aum', p_new_aum,
    'gross_yield', ROUND(v_gross_yield::NUMERIC, 8),
    'net_yield', ROUND(v_net_yield::NUMERIC, 8),
    'total_fees', ROUND(v_total_fees::NUMERIC, 8),
    'yield_percentage', ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 4),
    'investor_count', jsonb_array_length(v_distributions),
    'distributions', v_distributions
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.distribute_monthly_yield(p_fund_id text, p_year integer, p_month integer, p_total_yield numeric)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total_shares NUMERIC;
  v_yield_per_share NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get total shares in the fund
  SELECT COALESCE(SUM(shares), 0) INTO v_total_shares
  FROM public.investor_positions
  WHERE fund_id = p_fund_id AND shares > 0;

  IF v_total_shares > 0 THEN
    v_yield_per_share := p_total_yield / v_total_shares;

    -- Distribute yield proportionally
    UPDATE public.investor_positions
    SET
      current_value = current_value + (shares * v_yield_per_share),
      updated_at = now()
    WHERE fund_id = p_fund_id AND shares > 0;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encrypt_totp_secret(secret_text text)
 RETURNS bytea
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    master_key BYTEA;
    encrypted_secret BYTEA;
BEGIN
    -- Get the master key for TOTP encryption
    SELECT secret INTO master_key 
    FROM pgsodium.key 
    WHERE name = 'totp_master_key';
    
    IF master_key IS NULL THEN
        RAISE EXCEPTION 'TOTP master key not found';
    END IF;
    
    -- Encrypt the secret using authenticated encryption
    encrypted_secret := pgsodium.crypto_aead_det_encrypt(
        convert_to(secret_text, 'utf8'),
        convert_to('totp_secret', 'utf8'), -- Additional authenticated data
        master_key
    );
    
    RETURN encrypted_secret;
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback to pgcrypto if pgsodium fails
        RETURN pgp_sym_encrypt(secret_text, 'totp_master_key_fallback');
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_statement_period(p_period_id uuid, p_admin_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_is_admin BOOLEAN;
  v_current_status TEXT;
BEGIN
  -- Verify admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = p_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can finalize statement periods';
  END IF;

  -- Check current status
  SELECT status INTO v_current_status
  FROM statement_periods
  WHERE id = p_period_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Statement period not found';
  END IF;

  IF v_current_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Statement period is already finalized';
  END IF;

  -- Update the period status
  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_at = NOW(),
    finalized_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- Log the finalization event
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    user_id,
    changes,
    created_at
  ) VALUES (
    'FINALIZE',
    'statement_periods',
    p_period_id,
    p_admin_id,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', 'FINALIZED'
    ),
    NOW()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_document_path(user_id uuid, document_type text, filename text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Generate secure path without PII in filename
    -- Format: documents/{user_id}/{type}/{uuid}_{sanitized_filename}
    RETURN 'documents/' || user_id::text || '/' || document_type || '/' || 
           gen_random_uuid()::text || '_' || 
           regexp_replace(filename, '[^a-zA-Z0-9.-]', '_', 'g');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_statement_path(user_id uuid, year integer, month integer, fund_code text DEFAULT 'default'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Format: statements/{user_id}/{yyyy}/{mm}/statement-{fund_code}-{period}.pdf
    RETURN 'statements/' || user_id::text || '/' || 
           year::text || '/' || 
           lpad(month::text, 2, '0') || '/' ||
           'statement-' || fund_code || '-' || year::text || 
           lpad(month::text, 2, '0') || '.pdf';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_name(admin_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    admin_name TEXT;
BEGIN
    SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) 
    INTO admin_name
    FROM profiles 
    WHERE id = admin_id;
    
    RETURN TRIM(COALESCE(admin_name, 'Unknown'));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()
 RETURNS TABLE(id uuid, email text, first_name text, last_name text, created_at timestamp with time zone, fee_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    p.fee_percentage
  FROM public.profiles p
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_fund_net_flows(p_fund_id text, p_start_date date, p_end_date date)
 RETURNS TABLE(period_date date, inflows numeric, outflows numeric, net_flow numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.created_at::DATE as period_date,
    COALESCE(SUM(CASE WHEN t.type IN ('DEPOSIT', 'SUBSCRIPTION') THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type IN ('WITHDRAWAL', 'REDEMPTION') THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type IN ('DEPOSIT', 'SUBSCRIPTION') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'REDEMPTION') THEN -t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions t
  WHERE t.fund_id = p_fund_id
    AND t.created_at >= p_start_date
    AND t.created_at <= p_end_date
    AND t.status = 'COMPLETED'
  GROUP BY t.created_at::DATE
  ORDER BY period_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
 RETURNS TABLE(id uuid, code text, name text, asset text, fund_class text, inception_date date, status fund_status, latest_aum numeric, latest_aum_date date, investor_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    WITH latest_aum AS (
        SELECT DISTINCT ON (fund_id)
            fund_id,
            total_aum,
            as_of_date
        FROM public.fund_daily_aum
        ORDER BY fund_id, as_of_date DESC
    ),
    live_aum AS (
        SELECT
            fund_id,
            SUM(current_value) as total_value,
            COUNT(DISTINCT investor_id) as inv_count
        FROM public.investor_positions
        WHERE current_value > 0
        GROUP BY fund_id
    )
    SELECT
        f.id,
        f.code,
        f.name,
        f.asset,
        f.fund_class,
        f.inception_date,
        f.status,
        COALESCE(la.total_aum, live.total_value, 0) as latest_aum,
        la.as_of_date as latest_aum_date,
        COALESCE(live.inv_count, 0) as investor_count
    FROM public.funds f
    LEFT JOIN latest_aum la ON f.id = la.fund_id
    LEFT JOIN live_aum live ON f.id = live.fund_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_investor_period_summary(p_investor_id uuid, p_start_date date, p_end_date date)
 RETURNS TABLE(beginning_value numeric, ending_value numeric, additions numeric, redemptions numeric, net_income numeric, rate_of_return numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((
      SELECT SUM(current_value)
      FROM public.investor_positions
      WHERE investor_id = p_investor_id
        AND updated_at <= p_start_date
    ), 0)::NUMERIC as beginning_value,
    COALESCE((
      SELECT SUM(current_value)
      FROM public.investor_positions
      WHERE investor_id = p_investor_id
    ), 0)::NUMERIC as ending_value,
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE investor_id = p_investor_id
        AND type IN ('DEPOSIT', 'SUBSCRIPTION')
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ), 0)::NUMERIC as additions,
    COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE investor_id = p_investor_id
        AND type IN ('WITHDRAWAL', 'REDEMPTION')
        AND created_at >= p_start_date
        AND created_at <= p_end_date
    ), 0)::NUMERIC as redemptions,
    0::NUMERIC as net_income, -- Calculated from yield applications
    0::NUMERIC as rate_of_return; -- Calculated as (ending - beginning - additions + redemptions) / beginning
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_investor_portfolio_summary(p_investor_id uuid)
 RETURNS TABLE(total_value numeric, total_shares numeric, fund_count bigint, total_cost_basis numeric, unrealized_gain numeric, last_updated timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ip.current_value), 0)::NUMERIC as total_value,
    COALESCE(SUM(ip.shares), 0)::NUMERIC as total_shares,
    COUNT(DISTINCT ip.fund_id) as fund_count,
    COALESCE(SUM(ip.cost_basis), 0)::NUMERIC as total_cost_basis,
    COALESCE(SUM(ip.current_value) - SUM(ip.cost_basis), 0)::NUMERIC as unrealized_gain,
    MAX(ip.updated_at) as last_updated
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_monthly_platform_aum()
 RETURNS TABLE(month text, total_aum numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    WITH monthly_latest_aum AS (
        SELECT
            fund_id,
            TO_CHAR(aum_date, 'YYYY-MM') AS month_key,
            total_aum,
            aum_date,
            ROW_NUMBER() OVER (PARTITION BY fund_id, TO_CHAR(aum_date, 'YYYY-MM') ORDER BY aum_date DESC) as rn
        FROM public.fund_daily_aum
    )
    SELECT
        mla.month_key AS month,
        SUM(mla.total_aum) AS total_aum
    FROM monthly_latest_aum mla
    WHERE mla.rn = 1
    GROUP BY mla.month_key
    ORDER BY mla.month_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_by_id(profile_id uuid)
 RETURNS TABLE(id uuid, email text, first_name text, last_name text, is_admin boolean, fee_percentage numeric, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.is_admin,
    p.fee_percentage,
    p.created_at
  FROM public.profiles p
  WHERE p.id = profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_report_statistics(p_period_start date, p_period_end date)
 RETURNS TABLE(total_reports bigint, reports_by_type jsonb, reports_sent bigint, reports_pending bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_reports,
    jsonb_object_agg(COALESCE(report_type, 'unknown'), count) as reports_by_type,
    COUNT(*) FILTER (WHERE status = 'SENT')::BIGINT as reports_sent,
    COUNT(*) FILTER (WHERE status IN ('DRAFT', 'FINALIZED'))::BIGINT as reports_pending
  FROM (
    SELECT report_type, status, COUNT(*) as count
    FROM public.generated_reports
    WHERE created_at >= p_period_start AND created_at <= p_period_end
    GROUP BY report_type, status
  ) sub
  GROUP BY ();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_statement_period_summary(p_period_id uuid)
 RETURNS TABLE(total_investors integer, total_funds integer, statements_generated integer, statements_sent integer, statements_pending integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Count unique investors with performance data for this period
    (SELECT COUNT(DISTINCT user_id)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_investors,

    -- Count unique funds in this period
    (SELECT COUNT(DISTINCT fund_name)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_funds,

    -- Count generated statements
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements
     WHERE period_id = p_period_id) AS statements_generated,

    -- Count sent statements (via email delivery)
    (SELECT COUNT(*)::INTEGER
     FROM statement_email_delivery
     WHERE period_id = p_period_id AND status = 'SENT') AS statements_sent,

    -- Count pending statements (not yet sent)
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements gs
     WHERE gs.period_id = p_period_id
       AND NOT EXISTS (
         SELECT 1 FROM statement_email_delivery sed
         WHERE sed.statement_id = gs.id AND sed.status = 'SENT'
       )) AS statements_pending;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_reports(p_user_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, report_type text, report_name text, report_month date, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gr.id,
    gr.report_type,
    gr.report_name,
    gr.report_month,
    gr.status,
    gr.created_at
  FROM public.generated_reports gr
  WHERE gr.investor_id = p_user_id
  ORDER BY gr.created_at DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_2fa_required(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    user_is_admin BOOLEAN;
    policy_record RECORD;
    user_totp_record RECORD;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO user_is_admin 
    FROM profiles 
    WHERE id = p_user_id;
    
    -- Get current policy
    SELECT * INTO policy_record FROM system_2fa_policy LIMIT 1;
    
    -- Get user's TOTP settings
    SELECT * INTO user_totp_record 
    FROM user_totp_settings 
    WHERE user_id = p_user_id;
    
    -- Check if 2FA is required based on policy
    IF user_is_admin AND policy_record.require_2fa_for_admins THEN
        RETURN TRUE;
    END IF;
    
    IF NOT user_is_admin AND policy_record.require_2fa_for_investors THEN
        RETURN TRUE;
    END IF;
    
    -- Check if specifically required for this user
    IF user_totp_record.enforce_required THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_safe()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
        FALSE
    )
$function$;

CREATE OR REPLACE FUNCTION public.is_import_enabled()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT (value)::boolean 
    FROM public.system_config 
    WHERE key = 'excel_import_enabled'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_valid_share_token(token_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.secure_shares 
        WHERE token = token_value
        AND expires_at > NOW()
        AND revoked_at IS NULL
        AND (max_views IS NULL OR views_count < max_views)
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_within_edit_window(p_created_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_window_days INTEGER;
BEGIN
  SELECT (value)::integer INTO v_window_days
  FROM public.system_config 
  WHERE key = 'edit_window_days';
  
  RETURN (NOW() - p_created_at) < (v_window_days || ' days')::INTERVAL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lock_imports(p_reason text DEFAULT 'Manual lock'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_lock_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can lock imports';
  END IF;
  
  -- Update system config
  UPDATE public.system_config 
  SET value = 'false'::jsonb,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE key = 'excel_import_enabled';
  
  -- Create lock record
  INSERT INTO public.import_locks (
    locked_by,
    lock_reason,
    is_active
  ) VALUES (
    auth.uid(),
    p_reason,
    TRUE
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_access_event(p_user_id uuid, p_event text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_success boolean DEFAULT true, p_failure_reason text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO user_access_logs_enhanced (
        user_id, event, ip_address, user_agent, 
        success, failure_reason, metadata
    ) VALUES (
        p_user_id, p_event, p_ip_address, p_user_agent,
        p_success, p_failure_reason, p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit_event(p_action text, p_entity text, p_entity_id text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_meta jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        meta
    ) VALUES (
        auth.uid(),
        p_action,
        p_entity,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_meta
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_cancel_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only log if this is an investor-driven cancellation (not by admin)
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if cancelled_by is not set (meaning investor cancelled)
    IF NEW.cancelled_by IS NULL THEN
      PERFORM public.log_withdrawal_action(
        NEW.id,
        'cancel',
        jsonb_build_object(
          'reason', NEW.cancellation_reason,
          'cancelled_by', 'investor',
          'previous_status', OLD.status
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_data_edit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_import_id UUID;
  v_edit_source TEXT;
BEGIN
  -- Determine edit source
  IF current_setting('app.edit_source', true) IS NOT NULL THEN
    v_edit_source = current_setting('app.edit_source', true);
  ELSE
    v_edit_source = 'manual';
  END IF;
  
  -- Get import ID if this is import-related
  IF current_setting('app.import_id', true) IS NOT NULL THEN
    v_import_id = current_setting('app.import_id', true)::UUID;
  END IF;
  
  -- Log the edit
  INSERT INTO public.data_edit_audit (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    import_related,
    import_id,
    edited_by,
    edit_source
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    v_import_id IS NOT NULL,
    v_import_id,
    auth.uid(),
    v_edit_source
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_severity text, p_user_id uuid DEFAULT NULL::uuid, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    operation,
    user_id,
    new_data,
    created_at
  ) VALUES (
    'security_events',
    p_event_type,
    COALESCE(p_user_id, auth.uid()),
    jsonb_build_object(
      'severity', p_severity,
      'details', p_details,
      'timestamp', now()
    ),
    now()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_withdrawal_action(p_request_id uuid, p_action withdrawal_action, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.withdrawal_audit_logs (request_id, action, actor_id, details)
  VALUES (p_request_id, p_action, auth.uid(), p_details);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_withdrawal_creation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.log_withdrawal_action(
    NEW.id,
    'create',
    jsonb_build_object(
      'requested_amount', NEW.requested_amount,
      'fund_id', NEW.fund_id,
      'fund_class', NEW.fund_class,
      'withdrawal_type', NEW.withdrawal_type,
      'notes', NEW.notes
    )
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.preview_yield_distribution(p_fund_id uuid, p_new_aum numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_current_aum NUMERIC;
  v_gross_yield NUMERIC;
  v_net_yield NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_investor RECORD;
  v_investor_yield NUMERIC;
  v_investor_fee NUMERIC;
  v_investor_net NUMERIC;
  v_distributions JSONB := '[]'::JSONB;
  v_fund_asset TEXT;
  v_fund_code TEXT;
BEGIN
  -- Get fund details
  SELECT asset, code INTO v_fund_asset, v_fund_code
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Calculate current AUM from positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_current_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active positions in fund'
    );
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;

  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'New AUM must be greater than current AUM for positive yield',
      'current_aum', v_current_aum,
      'new_aum', p_new_aum
    );
  END IF;

  -- Calculate per-investor distribution (READ ONLY - no updates)
  FOR v_investor IN
    SELECT
      ip.investor_id,
      ip.current_value,
      ip.current_value / NULLIF(v_current_aum, 0) as allocation_pct,
      COALESCE(p.fee_percentage, 0.20) as fee_pct,
      CONCAT(p.first_name, ' ', p.last_name) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    v_investor_yield := v_gross_yield * v_investor.allocation_pct;
    v_investor_fee := v_investor_yield * v_investor.fee_pct;
    v_investor_net := v_investor_yield - v_investor_fee;

    v_net_yield := v_net_yield + v_investor_net;
    v_total_fees := v_total_fees + v_investor_fee;

    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'current_balance', ROUND(v_investor.current_value::NUMERIC, 8),
      'allocation_pct', ROUND(v_investor.allocation_pct * 100, 4),
      'fee_pct', ROUND(v_investor.fee_pct * 100, 2),
      'gross_yield', ROUND(v_investor_yield::NUMERIC, 8),
      'fee', ROUND(v_investor_fee::NUMERIC, 8),
      'net_yield', ROUND(v_investor_net::NUMERIC, 8),
      'new_balance', ROUND((v_investor.current_value + v_investor_net)::NUMERIC, 8)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'fund_asset', v_fund_asset,
    'current_aum', ROUND(v_current_aum::NUMERIC, 8),
    'new_aum', ROUND(p_new_aum::NUMERIC, 8),
    'gross_yield', ROUND(v_gross_yield::NUMERIC, 8),
    'net_yield', ROUND(v_net_yield::NUMERIC, 8),
    'total_fees', ROUND(v_total_fees::NUMERIC, 8),
    'yield_percentage', ROUND((v_gross_yield / NULLIF(v_current_aum, 0)) * 100, 4),
    'investor_count', jsonb_array_length(v_distributions),
    'distributions', v_distributions
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_excel_import_with_classes(p_data jsonb, p_import_type text DEFAULT 'full'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result JSONB;
  v_class_counts JSONB = '{}'::JSONB;
  v_fund_class TEXT;
  v_count INTEGER;
BEGIN
  -- Initialize result
  v_result = jsonb_build_object(
    'success', true,
    'processed', 0,
    'errors', '[]'::JSONB,
    'class_summary', '{}'::JSONB
  );

  -- Process by fund class
  FOR v_fund_class IN 
    SELECT DISTINCT fund_class 
    FROM public.funds 
    WHERE status = 'active'
  LOOP
    -- Count transactions per class
    SELECT COUNT(*) INTO v_count
    FROM jsonb_array_elements(p_data -> 'transactions') t
    WHERE t ->> 'fund_class' = v_fund_class;
    
    v_class_counts = v_class_counts || 
      jsonb_build_object(v_fund_class, v_count);
  END LOOP;

  -- Update result with class summary
  v_result = v_result || jsonb_build_object('class_summary', v_class_counts);
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_yield_distribution(p_fund_id uuid, p_gross_amount numeric, p_date date)
 RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_asset text;
  v_total numeric;
  v_ref text;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  rec record;
BEGIN
  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN RAISE EXCEPTION 'Gross amount must be positive'; END IF;
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;
  IF v_total IS NULL OR v_total <= 0 THEN RAISE EXCEPTION 'No positions or zero AUM'; END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN SELECT ip.investor_id, ip.current_value FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    investor_id := rec.investor_id; gross_amount := v_gross; fee_amount := v_fee; net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_request_id uuid, p_reason text, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE 
  v_request RECORD;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Validate rejection reason
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN 
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN 
    RAISE EXCEPTION 'Can only reject pending requests. Current status: %', v_request.status;
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    rejected_by = auth.uid(),
    rejected_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'reject',
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_daily_rate_notifications(p_rate_date date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_notification_count INTEGER := 0;
BEGIN
  -- Create notification records for users who have enabled rate notifications
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    created_at
  )
  SELECT
    ns.user_id,
    'DAILY_RATE',
    'Daily Rate Update',
    'New daily rates have been published for ' || p_rate_date::TEXT,
    now()
  FROM public.notification_settings ns
  WHERE ns.daily_rates_enabled = true
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_notification_count = ROW_COUNT;

  RETURN v_notification_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(p_fund_id text, p_aum_date date, p_total_aum numeric, p_nav_per_share numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_aum_id UUID;
BEGIN
  INSERT INTO public.fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    nav_per_share,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    p_total_aum,
    p_nav_per_share,
    auth.uid(),
    now()
  )
  ON CONFLICT (fund_id, aum_date)
  DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    nav_per_share = EXCLUDED.nav_per_share,
    updated_at = now()
  RETURNING id INTO v_aum_id;

  RETURN v_aum_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_processing_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_settlement_date date DEFAULT NULL::date, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE 
  v_request RECORD;
  v_amount NUMERIC(28,10);
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'approved' THEN 
    RAISE EXCEPTION 'Can only process approved requests. Current status: %', v_request.status;
  END IF;

  -- Determine processing amount
  v_amount := COALESCE(p_processed_amount, v_request.approved_amount);
  
  -- Validate amount
  IF v_amount <= 0 THEN 
    RAISE EXCEPTION 'Processed amount must be greater than zero';
  END IF;
  
  IF v_amount > v_request.approved_amount THEN 
    RAISE EXCEPTION 'Processed amount cannot exceed approved amount';
  END IF;

  -- Update request
  UPDATE public.withdrawal_requests
  SET 
    status = 'processing',
    processed_amount = v_amount,
    processed_at = NOW(),
    settlement_date = p_settlement_date,
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  -- Log action
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'processing',
    jsonb_build_object(
      'processed_amount', v_amount,
      'approved_amount', v_request.approved_amount,
      'tx_hash', p_tx_hash,
      'settlement_date', p_settlement_date,
      'admin_notes', p_admin_notes
    )
  );
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.test_profiles_access()
 RETURNS TABLE(test_name text, result boolean, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    -- Test 1: Can query profiles table
    RETURN QUERY
    SELECT 
        'Can query profiles'::TEXT as test_name,
        TRUE as result,
        'Query successful'::TEXT as details
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Can query profiles'::TEXT,
            FALSE,
            SQLERRM::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_imports()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Only admins can unlock imports';
  END IF;
  
  -- Update system config
  UPDATE public.system_config 
  SET value = 'true'::jsonb,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE key = 'excel_import_enabled';
  
  -- Deactivate all active locks
  UPDATE public.import_locks
  SET is_active = FALSE,
      unlocked_by = auth.uid(),
      unlocked_at = NOW()
  WHERE is_active = TRUE;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_fund_aum_baseline(p_fund_id text, p_new_baseline numeric)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.funds
  SET
    aum = p_new_baseline,
    updated_at = now()
  WHERE code = p_fund_id OR id::TEXT = p_fund_id;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_investor_aum_percentages(p_fund_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_total_aum NUMERIC;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get total AUM for the fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM public.investor_positions
  WHERE fund_id = p_fund_id;

  -- Update each investor's percentage
  IF v_total_aum > 0 THEN
    UPDATE public.investor_positions
    SET
      aum_percentage = (current_value / v_total_aum) * 100,
      updated_at = now()
    WHERE fund_id = p_fund_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  END IF;

  RETURN v_updated_count;
END;
$function$;

