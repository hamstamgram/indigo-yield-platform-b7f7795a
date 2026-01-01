-- Fix complete_withdrawal function to use existing columns
-- The table has `processed_at` but not `completed_at` or `completed_by`

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id uuid,
  p_transaction_hash text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_asset TEXT;
  v_fund_class TEXT;
  v_withdrawal_tx_id UUID;
  v_resulting_balance numeric;
BEGIN
  PERFORM public.require_super_admin('complete_withdrawal');
  
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals that are in processing status. Current status: %', v_request.status;
  END IF;
  
  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;
  
  SELECT COALESCE(current_value, 0) - ABS(v_request.processed_amount) INTO v_resulting_balance
  FROM investor_positions
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  IF v_resulting_balance IS NOT NULL AND v_resulting_balance < 0 THEN
    RAISE EXCEPTION 'Withdrawal would result in negative balance (%.8f)', v_resulting_balance;
  END IF;
  
  SELECT asset, fund_class INTO v_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, reference_id, notes, created_by, purpose
  ) VALUES (
    v_request.investor_id,
    v_request.fund_id,
    COALESCE(v_asset, 'UNKNOWN'),
    COALESCE(v_fund_class, 'UNKNOWN'),
    -ABS(v_request.processed_amount),
    'WITHDRAWAL',
    CURRENT_DATE,
    CURRENT_DATE,
    'withdrawal_completion',
    'WD-' || p_request_id::text,
    COALESCE(p_admin_notes, 'Withdrawal completed'),
    auth.uid(),
    'transaction'
  ) RETURNING id INTO v_withdrawal_tx_id;
  
  UPDATE public.investor_positions 
  SET 
    current_value = current_value - ABS(v_request.processed_amount),
    shares = shares - ABS(v_request.processed_amount),
    cost_basis = GREATEST(0, cost_basis - ABS(v_request.processed_amount)),
    last_transaction_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id;
  
  -- FIX: Use processed_at instead of completed_at (column doesn't exist)
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;
  
  -- The audit log captures who completed it via auth.uid()
  PERFORM public.log_withdrawal_action(p_request_id, 'complete', jsonb_build_object(
    'processed_amount', v_request.processed_amount,
    'tx_hash', p_transaction_hash,
    'withdrawal_tx_id', v_withdrawal_tx_id,
    'completed_by', auth.uid(),
    'shares_deducted', true,
    'cost_basis_deducted', true
  ));
  
  RETURN TRUE;
END;
$$;