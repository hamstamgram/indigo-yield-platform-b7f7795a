ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS is_full_exit BOOLEAN DEFAULT false;

-- Drop ALL existing complete_withdrawal functions to eliminate overload ambiguity
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, numeric, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, numeric, timestamp with time zone, text, text, boolean);
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, text, text);

-- Recreate the correct single version
CREATE OR REPLACE FUNCTION public.complete_withdrawal(p_request_id uuid, p_closing_aum numeric DEFAULT NULL::numeric, p_event_ts timestamp with time zone DEFAULT now(), p_transaction_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request record;
  v_admin uuid;
  v_result json;
  v_withdrawal_tx_id uuid;
  v_dust numeric;
  v_position_balance numeric;
  v_indigo_fees_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_admin := require_super_admin();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;
  
  -- ===== FUND LEVEL LOCK (E2) =====
  PERFORM pg_advisory_xact_lock(hashtext('yield_dist'), hashtext(v_request.fund_id::text));

  IF v_request.status::text <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals in processing status. Current: %', v_request.status;
  END IF;

  v_result := apply_investor_transaction(
    p_fund_id := v_request.fund_id,
    p_investor_id := v_request.investor_id,
    p_tx_type := 'WITHDRAWAL'::tx_type,
    p_amount := ABS(v_request.processed_amount)::numeric,
    p_tx_date := CURRENT_DATE,
    p_reference_id := 'WDR:' || p_request_id::text,
    p_admin_id := v_admin,
    p_notes := COALESCE(p_admin_notes, 'Withdrawal completion')
  );
  v_withdrawal_tx_id := (v_result->>'transaction_id')::uuid;

  IF v_request.is_full_exit THEN
    SELECT COALESCE(current_value, 0) INTO v_position_balance
    FROM investor_positions
    WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
    v_dust := COALESCE(v_position_balance, 0);

    IF v_dust > 0 THEN
      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_request.investor_id,
        p_tx_type := 'WITHDRAWAL'::tx_type,
        p_amount := v_dust,
        p_tx_date := CURRENT_DATE,
        p_reference_id := 'DUST_SWEEP:' || p_request_id::text,
        p_admin_id := v_admin,
        p_notes := 'Dust sweep: ' || v_dust::text
      );

      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_indigo_fees_id,
        p_tx_type := 'DEPOSIT'::tx_type,
        p_amount := v_dust,
        p_tx_date := CURRENT_DATE,
        p_reference_id := 'DUST_RECV:' || p_request_id::text,
        p_admin_id := v_admin,
        p_notes := 'Dust received from: ' || v_request.investor_id::text
      );
    END IF;

    UPDATE investor_positions SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  END IF;

  UPDATE withdrawal_requests SET
    status = 'completed', processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(), version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  PERFORM log_withdrawal_action(p_request_id, 'complete', jsonb_build_object('processed_amount', v_request.processed_amount));
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text, p_is_full_exit boolean DEFAULT false, p_crystallize_days integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request record;
  v_admin uuid;
  v_processed_amount numeric;
BEGIN
  v_admin := require_super_admin();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;

  IF v_request.status::text NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Cannot complete withdrawal in % status', v_request.status;
  END IF;

  -- Determine the processed amount to use
  v_processed_amount := COALESCE(p_processed_amount, v_request.processed_amount, v_request.requested_amount);

  -- First Principles: Truncate to 3 decimal places for full exits
  -- This leaves the "dust" in the position to be cleanly swept to Indigo Fees
  IF p_is_full_exit THEN
    v_processed_amount := TRUNC(v_processed_amount, 3);
  END IF;

  -- CRITICAL FIX: Ensure approved_amount is set to satisfy chk_amounts constraint
  -- when moving status out of 'pending'.
  UPDATE withdrawal_requests 
  SET 
    processed_amount = v_processed_amount,
    approved_amount = COALESCE(approved_amount, v_processed_amount), -- satisfy chk_amounts
    status = 'processing', 
    updated_at = NOW(),
    is_full_exit = p_is_full_exit -- write to actual schema column!
  WHERE id = p_request_id;

  -- Explicit parameter passing to prevent overload mismatch
  RETURN complete_withdrawal(
    p_request_id := p_request_id,
    p_closing_aum := NULL,
    p_event_ts := NOW(),
    p_transaction_hash := p_tx_hash,
    p_admin_notes := p_admin_notes
  );
END;
$function$;
