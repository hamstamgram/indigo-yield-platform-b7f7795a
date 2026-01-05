-- Fix complete_withdrawal to use the new apply_withdrawal_with_crystallization signature
-- The new signature is: (p_fund_id, p_investor_id, p_amount, p_closing_aum, p_effective_date, p_admin_id, p_notes, p_purpose)
-- The OLD function was calling with: (investor_id, fund_id, amount, event_ts, closing_aum, trigger_reference, purpose, admin_id)
-- This caused UUID swaps and type mismatches!

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_closing_aum numeric,
  p_event_ts timestamptz DEFAULT now(),
  p_transaction_hash text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_request record;
  v_admin uuid := auth.uid();
  v_result jsonb;
  v_withdrawal_tx_id uuid;
  v_effective_date date;
BEGIN
  PERFORM public.require_super_admin('complete_withdrawal');

  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals that are in processing status. Current status: %', v_request.status;
  END IF;

  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;

  -- Convert event timestamp to date for the new function signature
  v_effective_date := (p_event_ts AT TIME ZONE 'UTC')::date;

  -- Call apply_withdrawal_with_crystallization with the CORRECT new signature:
  -- (p_fund_id, p_investor_id, p_amount, p_closing_aum, p_effective_date, p_admin_id, p_notes, p_purpose)
  v_result := public.apply_withdrawal_with_crystallization(
    v_request.fund_id,           -- p_fund_id (was investor_id - SWAPPED)
    v_request.investor_id,       -- p_investor_id (was fund_id - SWAPPED)
    ABS(v_request.processed_amount)::numeric(28,10),  -- p_amount
    p_closing_aum,               -- p_closing_aum (was in position 5)
    v_effective_date,            -- p_effective_date (NEW - derived from p_event_ts)
    v_admin,                     -- p_admin_id (was in position 8)
    'Withdrawal completion - request ' || p_request_id::text,  -- p_notes (NEW)
    'transaction'::public.aum_purpose  -- p_purpose (was in position 7)
  );

  v_withdrawal_tx_id := (v_result->>'transaction_id')::uuid;

  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_request.processed_amount,
      'tx_hash', p_transaction_hash,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'crystallization', v_result->'crystallization',
      'completed_by', v_admin,
      'closing_aum', p_closing_aum,
      'post_flow_aum', v_result->'post_flow_aum'
    )
  );

  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.complete_withdrawal TO authenticated;