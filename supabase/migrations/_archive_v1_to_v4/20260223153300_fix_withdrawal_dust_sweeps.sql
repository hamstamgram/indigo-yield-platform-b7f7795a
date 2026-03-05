-- Fix Withdrawal Dust Sweeping & Indigo Fees Dynamic Lookup
-- Resolves issue where dust sweeps fail to hit the Revenue page due to hardcoded UUIDs and missing tagging.

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
  v_indigo_fees_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_admin := require_super_admin();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;
  
  -- Dynamically resolve the Indigo Fees account (First Principles)
  SELECT id INTO v_indigo_fees_id FROM profiles WHERE is_system_account = true AND email ILIKE '%fees%' LIMIT 1;
  IF v_indigo_fees_id IS NULL THEN
     -- Fallback to the historic hardcoded ID just in case the system account email was changed manually
     v_indigo_fees_id := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  END IF;

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
    
    -- The user requested exactly a full exit. Due to 3-decimal truncation in `approve_and_complete_withdrawal`,
    -- there might be fractional "dust" leftover (e.g. 0.00045) which belongs to Indigo.
    v_dust := COALESCE(v_position_balance, 0);

    IF v_dust > 0 THEN
      -- Sweep from Investor
      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_request.investor_id,
        p_tx_type := 'WITHDRAWAL'::tx_type,
        p_amount := v_dust,
        p_tx_date := CURRENT_DATE,
        p_reference_id := 'DUST_SWEEP_OUT:' || p_request_id::text,
        p_admin_id := v_admin,
        p_notes := 'Full Exit Dust sweep: ' || v_dust::text
      );

      -- Sweep to Indigo Fees
      -- NOTE: We use IB_CREDIT or YIELD tag to ensure it shows up on the Revenue page as requested by the user.
      -- A generic DEPOSIT doesn't naturally look like "Revenue" depending on the UI filters.
      -- To be absolutely safe and semantic, we use 'IB_CREDIT' because it constitutes platform revenue.
      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_indigo_fees_id,
        p_tx_type := 'IB_CREDIT'::tx_type,
        p_amount := v_dust,
        p_tx_date := CURRENT_DATE,
        p_reference_id := 'DUST_RECV:' || p_request_id::text,
        p_admin_id := v_admin,
        p_notes := 'Dust received from Full Exit: ' || v_request.investor_id::text
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
