-- Simplified withdrawal: approve and complete in one atomic transaction
-- No AUM input required. No crystallization. Yield must be recorded separately before withdrawal.
-- Creates WITHDRAWAL transaction in transactions_v2, trg_ledger_sync handles position update.

CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(
  p_request_id uuid,
  p_processed_amount numeric(28,10) DEFAULT NULL,
  p_tx_hash text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Determine final amount
  v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);

  IF v_final_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount must be greater than zero';
  END IF;

  IF v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- Check investor balance
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Check for other pending withdrawals (exclude current request)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger
  INSERT INTO public.transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, visibility_scope, source,
    tx_hash
  ) VALUES (
    v_request.fund_id,
    v_request.investor_id,
    'WITHDRAWAL',
    -ABS(v_final_amount),
    CURRENT_DATE,
    v_fund.asset,
    v_fund.code,
    v_reference_id,
    COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
    v_admin_id,
    false,
    'investor_visible',
    'rpc_canonical',
    p_tx_hash
  ) RETURNING id INTO v_tx_id;

  -- trg_ledger_sync fires automatically and reduces investor_positions.current_value
  -- sync_aum_on_transaction fires automatically and updates fund_daily_aum

  -- Update withdrawal request to completed (skip intermediate states)
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
      'flow', 'approve_and_complete'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount
  );
END;
$$;

COMMENT ON FUNCTION public.approve_and_complete_withdrawal(uuid, numeric, text, text) IS
'Atomic approve + complete withdrawal in one DB transaction. No AUM input or crystallization required.
Yield must be recorded separately before withdrawal.
Creates WITHDRAWAL transaction, reduces position via trg_ledger_sync, updates fund_daily_aum via trigger.
Requires admin. Uses advisory lock for concurrency safety.';
