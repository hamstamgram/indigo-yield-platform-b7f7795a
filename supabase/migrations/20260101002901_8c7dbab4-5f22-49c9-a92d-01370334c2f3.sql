-- Fix double-deduction bug in complete_withdrawal
-- The trigger update_position_on_transaction_v2 already updates positions from the ledger
-- So we must NOT manually update positions again

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
  
  -- Insert withdrawal transaction - the trigger will automatically update positions
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
  
  -- REMOVED: Manual position update - triggers handle this automatically
  -- The trigger update_position_on_transaction_v2 recalculates from ledger
  
  -- Update withdrawal request status
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;
  
  PERFORM public.log_withdrawal_action(p_request_id, 'complete', jsonb_build_object(
    'processed_amount', v_request.processed_amount,
    'tx_hash', p_transaction_hash,
    'withdrawal_tx_id', v_withdrawal_tx_id,
    'completed_by', auth.uid()
  ));
  
  RETURN TRUE;
END;
$$;

-- Fix route_withdrawal_to_fees - also remove manual position updates
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(
  p_request_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_fees_account_id UUID;
  v_asset TEXT;
  v_fund_class TEXT;
  v_withdrawal_tx_id UUID;
  v_deposit_tx_id UUID;
BEGIN
  PERFORM public.require_super_admin('route_withdrawal_to_fees');
  
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Cannot route withdrawal in status: %', v_request.status;
  END IF;
  
  -- Get INDIGO FEES account
  SELECT id INTO v_fees_account_id 
  FROM profiles 
  WHERE LOWER(email) = 'fees@indigofund.io' OR LOWER(first_name || ' ' || last_name) = 'indigo fees'
  LIMIT 1;
  
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found';
  END IF;
  
  SELECT asset, fund_class INTO v_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  -- Use processed_amount if set, otherwise requested_amount
  DECLARE
    v_amount numeric := COALESCE(v_request.processed_amount, v_request.requested_amount);
  BEGIN
    -- 1. Withdrawal from investor - triggers update position automatically
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, asset, fund_class, amount, type,
      tx_date, value_date, source, reference_id, notes, created_by, purpose
    ) VALUES (
      v_request.investor_id,
      v_request.fund_id,
      COALESCE(v_asset, 'UNKNOWN'),
      COALESCE(v_fund_class, 'UNKNOWN'),
      -ABS(v_amount),
      'WITHDRAWAL',
      CURRENT_DATE,
      CURRENT_DATE,
      'fee_routing',
      'FEE-WD-' || p_request_id::text,
      COALESCE(p_reason, 'Routed to INDIGO FEES'),
      auth.uid(),
      'transaction'
    ) RETURNING id INTO v_withdrawal_tx_id;
    
    -- 2. Deposit to INDIGO FEES - triggers update position automatically
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, asset, fund_class, amount, type,
      tx_date, value_date, source, reference_id, notes, created_by, purpose
    ) VALUES (
      v_fees_account_id,
      v_request.fund_id,
      COALESCE(v_asset, 'UNKNOWN'),
      COALESCE(v_fund_class, 'UNKNOWN'),
      ABS(v_amount),
      'DEPOSIT',
      CURRENT_DATE,
      CURRENT_DATE,
      'fee_routing',
      'FEE-DEP-' || p_request_id::text,
      'Fee routing from withdrawal ' || p_request_id::text,
      auth.uid(),
      'transaction'
    ) RETURNING id INTO v_deposit_tx_id;
    
    -- REMOVED: Manual position updates - triggers handle this automatically
    
    -- Update withdrawal request
    UPDATE public.withdrawal_requests
    SET 
      status = 'completed',
      processed_amount = v_amount,
      processed_at = NOW(),
      admin_notes = COALESCE(p_reason, 'Routed to INDIGO FEES'),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
    WHERE id = p_request_id;
    
    PERFORM public.log_withdrawal_action(p_request_id, 'route_to_fees', jsonb_build_object(
      'amount', v_amount,
      'fees_account_id', v_fees_account_id,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'deposit_tx_id', v_deposit_tx_id,
      'reason', p_reason
    ));
  END;
  
  RETURN TRUE;
END;
$$;

-- Repair jean jean's BTC position to match ledger (ledger shows 5, position was double-deducted to 0)
UPDATE investor_positions ip
SET 
  current_value = 5,
  shares = 5,
  updated_at = NOW()
FROM funds f
WHERE ip.fund_id = f.id
  AND ip.investor_id = 'e3c07bd7-8fc6-42a9-aa30-f0ab29053548'
  AND f.asset = 'BTC';