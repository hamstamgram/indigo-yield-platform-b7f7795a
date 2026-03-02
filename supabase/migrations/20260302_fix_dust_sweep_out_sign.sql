-- Fix: DUST_SWEEP_OUT Sign Bug in Full Exit Withdrawals
--
-- Root cause: complete_withdrawal creates a DUST_SWEEP_OUT transaction using
-- 'DUST'::tx_type, but apply_investor_transaction only auto-negates
-- WITHDRAWAL, FEE, and IB types. So the dust sweep stores as positive (credit)
-- instead of negative (debit), leaving 2x the dust amount in the position.
--
-- Fix: Add DUST_SWEEP to the negation list, use DUST_SWEEP for sweep-out.

-- ============================================================
-- Step 1: Fix apply_investor_transaction — add DUST_SWEEP to negation list
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_investor_transaction(
    p_fund_id uuid,
    p_investor_id uuid,
    p_tx_type tx_type,
    p_amount numeric,
    p_tx_date date,
    p_reference_id text,
    p_admin_id uuid DEFAULT NULL::uuid,
    p_notes text DEFAULT NULL::text,
    p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
    p_distribution_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_fund record;
    v_transaction_id uuid;
    v_admin uuid;
    v_investor_lock_key bigint;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    v_admin := COALESCE(p_admin_id, auth.uid());
    IF v_admin IS NULL THEN RAISE EXCEPTION 'Unauthorized: admin context required'; END IF;
    IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'P0001'; END IF;

    PERFORM pg_advisory_xact_lock(hashtext('yield_dist'), hashtext(p_fund_id::text));

    -- First Principles Historical Lock: Explicit call with default inclusive=false
    IF check_historical_lock(p_fund_id, p_tx_date, false, p_distribution_id) THEN
        RAISE EXCEPTION 'FIRST PRINCIPLES VIOLATION: Cannot record a new transaction on % because a Yield Distribution has already been finalized on or after this date.', p_tx_date;
    END IF;

    SELECT * INTO v_fund FROM funds WHERE id = p_fund_id AND status = 'active' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Active fund not found'; END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_investor_id) THEN RAISE EXCEPTION 'Investor profile not found'; END IF;

    v_investor_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_investor_lock_key);

    -- Idempotency check
    -- FIX: Added DUST_SWEEP to negation list (was: WITHDRAWAL, FEE, IB)
    IF EXISTS (
        SELECT 1 FROM transactions_v2
        WHERE fund_id = p_fund_id AND investor_id = p_investor_id AND tx_date = p_tx_date AND type = p_tx_type
        AND amount = CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE', 'IB', 'DUST_SWEEP') THEN -p_amount ELSE p_amount END
        AND reference_id = p_reference_id AND NOT is_voided
    ) THEN
        RETURN json_build_object('success', true, 'message', 'Transaction already explicitly recorded (idempotent)', 'reference_id', p_reference_id);
    END IF;

    -- Insert canonical transaction
    -- FIX: Added DUST_SWEEP to negation list (was: WITHDRAWAL, FEE, IB)
    INSERT INTO public.transactions_v2 (
        fund_id, investor_id, type, asset, amount, tx_date, created_by,
        notes, reference_id, purpose, distribution_id, source, is_voided
    ) VALUES (
        p_fund_id, p_investor_id, p_tx_type, v_fund.asset,
        CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE', 'IB', 'DUST_SWEEP') THEN -p_amount ELSE p_amount END,
        p_tx_date, v_admin,
        COALESCE(p_notes, p_tx_type || ' - ' || p_reference_id),
        p_reference_id, p_purpose, p_distribution_id,
        'rpc_canonical'::tx_source, false
    ) RETURNING id INTO v_transaction_id;

    RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'message', p_tx_type || ' successfully applied.');
END;
$function$;


-- ============================================================
-- Step 2: Fix complete_withdrawal — use DUST_SWEEP for sweep-out
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
    p_request_id uuid,
    p_closing_aum numeric DEFAULT NULL::numeric,
    p_event_ts timestamp with time zone DEFAULT now(),
    p_transaction_hash text DEFAULT NULL::text,
    p_admin_notes text DEFAULT NULL::text
)
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

    v_dust := COALESCE(v_position_balance, 0);

    IF v_dust > 0 THEN
      -- FIX: Use DUST_SWEEP (auto-negated) instead of DUST (was stored as positive)
      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_request.investor_id,
        p_tx_type := 'DUST_SWEEP'::tx_type,
        p_amount := v_dust,
        p_tx_date := CURRENT_DATE,
        p_reference_id := 'DUST_SWEEP_OUT:' || p_request_id::text,
        p_admin_id := v_admin,
        p_notes := 'Full Exit Dust sweep: ' || v_dust::text
      );

      -- DUST_RECV stays as DUST — credit to fees account, positive is correct
      PERFORM apply_investor_transaction(
        p_fund_id := v_request.fund_id,
        p_investor_id := v_indigo_fees_id,
        p_tx_type := 'DUST'::tx_type,
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


-- ============================================================
-- Step 3: Fix existing bad data
-- ============================================================

-- Correct DUST_SWEEP_OUT transactions: flip sign, change type to DUST_SWEEP
-- Bypasses canonical_rpc guard since this is a data fix migration
DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE transactions_v2
  SET type = 'DUST_SWEEP'::tx_type, amount = -ABS(amount)
  WHERE reference_id LIKE 'DUST_SWEEP_OUT:%'
    AND type = 'DUST'
    AND amount > 0
    AND NOT is_voided;
END; $$;

-- Recompute affected investor positions
SELECT recompute_investor_position(
  p_fund_id := fund_id, p_investor_id := investor_id
)
FROM transactions_v2
WHERE reference_id LIKE 'DUST_SWEEP_OUT:%'
  AND type = 'DUST_SWEEP'
  AND NOT is_voided;
