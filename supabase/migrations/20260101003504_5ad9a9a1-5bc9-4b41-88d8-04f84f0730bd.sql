-- Fix route_withdrawal_to_fees: drop both overloads and create correct version
-- The UI calls with (p_request_id uuid, p_reason text) signature

-- Drop all overloads
DROP FUNCTION IF EXISTS public.route_withdrawal_to_fees(uuid, text);
DROP FUNCTION IF EXISTS public.route_withdrawal_to_fees(uuid, uuid);

-- Create the correct version with 'internal_routing' instead of 'fee_routing'
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
  v_amount numeric;
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
  WHERE LOWER(email) = 'fees@indigofund.io' 
     OR LOWER(first_name || ' ' || last_name) = 'indigo fees'
  LIMIT 1;
  
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found';
  END IF;
  
  SELECT asset, fund_class INTO v_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  v_amount := COALESCE(v_request.processed_amount, v_request.requested_amount);
  
  -- 1. Withdrawal from investor (triggers update position automatically)
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
    'internal_routing',
    'FEE-WD-' || p_request_id::text,
    COALESCE(p_reason, 'Routed to INDIGO FEES'),
    auth.uid(),
    'transaction'
  ) RETURNING id INTO v_withdrawal_tx_id;
  
  -- 2. Deposit to INDIGO FEES (triggers update position automatically)
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
    'internal_routing',
    'FEE-DEP-' || p_request_id::text,
    'Fee routing from withdrawal ' || p_request_id::text,
    auth.uid(),
    'transaction'
  ) RETURNING id INTO v_deposit_tx_id;
  
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
  
  RETURN TRUE;
END;
$$;