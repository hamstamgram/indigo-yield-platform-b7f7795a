-- P0-02: Consolidate complete_withdrawal overloads into 1 canonical function
-- This migration removes legacy/redundant overloads and keeps the crystallization-based version

-- Step 1: Drop legacy overload (direct ledger write - bypasses crystallization, security risk)
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, text, text);

-- Step 2: Drop redundant overload (event_ts first - same logic, confusing parameter order)
DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, timestamptz, numeric, text, text);

-- Step 3: Recreate canonical function with updated documentation
-- Signature: (request_id, closing_aum, event_ts, tx_hash, notes)
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_closing_aum numeric(28,10),
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
BEGIN
  -- Require super admin for withdrawal completion
  PERFORM public.require_super_admin('complete_withdrawal');

  -- Fetch withdrawal request
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals in processing status. Current: %', v_request.status;
  END IF;

  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;

  -- Execute withdrawal with crystallization (atomic position + AUM update)
  v_result := public.apply_withdrawal_with_crystallization(
    p_fund_id := v_request.fund_id,
    p_investor_id := v_request.investor_id,
    p_amount := ABS(v_request.processed_amount)::numeric(28,10),
    p_closing_aum := p_closing_aum,
    p_actor_id := v_admin
  );

  v_withdrawal_tx_id := (v_result->>'transaction_id')::uuid;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_request.processed_amount,
      'tx_hash', p_transaction_hash,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'crystallization', v_result->'crystallization',
      'completed_by', v_admin
    )
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.complete_withdrawal(uuid, numeric, timestamptz, text, text) IS
'CANONICAL: Complete a withdrawal request with crystallization.
Requires super_admin. Creates ledger transaction and updates investor position atomically.
Parameters:
  - p_request_id: UUID of the withdrawal request (must be in "processing" status)
  - p_closing_aum: Current fund AUM for crystallization calculation (REQUIRED)
  - p_event_ts: Timestamp for the transaction (defaults to now())
  - p_transaction_hash: Blockchain transaction hash (optional)
  - p_admin_notes: Administrative notes (optional)
Consolidated from 3 overloads in P0-02 cleanup.';