-- Fix route_withdrawal_to_fees with idempotency, proper shares handling, and repair corrupted data

-- Step 1: Repair corrupted position data
-- Fix alec beckman's position (was double-debited, now negative - should be 0)
UPDATE public.investor_positions 
SET 
  current_value = 0,
  shares = 0,
  cost_basis = 0,
  updated_at = NOW()
WHERE investor_id = '36330a7e-ecd9-4ab7-9679-496f78f090ce'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';

-- Fix INDIGO FEES position (was double-credited - should be 49.9999997500)
UPDATE public.investor_positions 
SET 
  current_value = 49.9999997500,
  shares = 49.9999997500,
  updated_at = NOW()
WHERE investor_id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';

-- Step 2: Delete duplicate transactions created by double-execution
-- Keep only the first fee_route and fee_credit transactions
DELETE FROM public.transactions_v2 
WHERE reference_id LIKE 'fee_route_%' 
  AND id NOT IN (
    SELECT DISTINCT ON (reference_id) id 
    FROM public.transactions_v2 
    WHERE reference_id LIKE 'fee_route_%'
    ORDER BY reference_id, created_at ASC
  );

DELETE FROM public.transactions_v2 
WHERE reference_id LIKE 'fee_credit_%' 
  AND id NOT IN (
    SELECT DISTINCT ON (reference_id) id 
    FROM public.transactions_v2 
    WHERE reference_id LIKE 'fee_credit_%'
    ORDER BY reference_id, created_at ASC
  );

-- Step 3: Fix route_withdrawal_to_fees function with idempotency and proper shares handling
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(
  p_request_id uuid, 
  p_reason text DEFAULT 'Fee routing'::text
)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
DECLARE 
  v_request RECORD; 
  v_fund_asset TEXT;
  v_amount NUMERIC;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_position RECORD;
  v_shares_to_transfer NUMERIC;
  v_cost_basis_to_transfer NUMERIC;
  v_reference_id TEXT;
BEGIN
  PERFORM public.ensure_admin();
  
  -- Build reference_id for idempotency check
  v_reference_id := 'fee_route_' || p_request_id::text;
  
  -- IDEMPOTENCY CHECK: Prevent duplicate execution
  IF EXISTS (
    SELECT 1 FROM public.transactions_v2 
    WHERE reference_id = v_reference_id
  ) THEN
    RAISE NOTICE 'Fee routing already processed for request %', p_request_id;
    RETURN FALSE;
  END IF;
  
  -- Get withdrawal request
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Request not found: %', p_request_id; 
  END IF;
  IF v_request.status NOT IN ('approved', 'processing') THEN 
    RAISE EXCEPTION 'Invalid status for fee routing: %', v_request.status; 
  END IF;
  
  -- Get the amount to use (approved_amount, or fallback to requested_amount)
  v_amount := COALESCE(v_request.approved_amount, v_request.requested_amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN 
    RAISE EXCEPTION 'Invalid withdrawal amount: %', v_amount; 
  END IF;
  
  -- Get asset from fund (or use fund_class as fallback)
  SELECT f.asset INTO v_fund_asset FROM public.funds f WHERE f.id = v_request.fund_id;
  IF v_fund_asset IS NULL THEN
    v_fund_asset := v_request.fund_class;
  END IF;
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Cannot determine asset for fund_id: %', v_request.fund_id;
  END IF;

  -- Get investor's current position for shares calculation
  SELECT shares, current_value, cost_basis 
  INTO v_investor_position
  FROM public.investor_positions 
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  -- Validate sufficient balance
  IF v_investor_position.current_value IS NULL OR v_investor_position.current_value < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance: has %, needs %', 
      COALESCE(v_investor_position.current_value, 0), v_amount;
  END IF;
  
  -- Calculate shares to transfer proportionally
  IF v_investor_position.current_value > 0 THEN
    v_shares_to_transfer := v_investor_position.shares * (v_amount / v_investor_position.current_value);
    v_cost_basis_to_transfer := COALESCE(v_investor_position.cost_basis, 0) * (v_amount / v_investor_position.current_value);
  ELSE
    v_shares_to_transfer := v_amount; -- 1:1 fallback
    v_cost_basis_to_transfer := v_amount;
  END IF;

  -- Create FEE transaction (debit from investor)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    v_request.investor_id, v_request.fund_id, 'FEE', -ABS(v_amount), 
    v_fund_asset, v_request.fund_class, CURRENT_DATE, 
    p_reason, v_reference_id, auth.uid(), false
  );

  -- Create FEE_CREDIT transaction (credit to fees account)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, fund_class, 
    tx_date, notes, reference_id, created_by, is_voided
  )
  VALUES (
    v_fees_account_id, v_request.fund_id, 'FEE_CREDIT', ABS(v_amount), 
    v_fund_asset, v_request.fund_class, CURRENT_DATE, 
    'Fee routing from ' || LEFT(v_request.investor_id::text, 8), 
    'fee_credit_' || p_request_id::text, auth.uid(), false
  );

  -- Update investor positions (deduct from investor) - including shares and cost_basis
  UPDATE public.investor_positions 
  SET 
    current_value = current_value - ABS(v_amount),
    shares = shares - ABS(v_shares_to_transfer),
    cost_basis = GREATEST(0, COALESCE(cost_basis, 0) - ABS(v_cost_basis_to_transfer)),
    updated_at = NOW()
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  -- Update fees account positions (credit to INDIGO FEES) - including shares
  UPDATE public.investor_positions 
  SET 
    current_value = current_value + ABS(v_amount),
    shares = shares + ABS(v_shares_to_transfer),
    updated_at = NOW()
  WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id;
  
  -- If INDIGO FEES doesn't have a position in this fund, create one
  IF NOT FOUND THEN
    INSERT INTO public.investor_positions (
      investor_id, fund_id, fund_class, shares, current_value, cost_basis, created_at, updated_at
    )
    VALUES (
      v_fees_account_id, v_request.fund_id, v_request.fund_class,
      ABS(v_shares_to_transfer), ABS(v_amount), 0, NOW(), NOW()
    );
  END IF;
  
  -- Mark withdrawal as completed
  UPDATE public.withdrawal_requests 
  SET 
    status = 'completed', 
    processed_at = NOW(),
    processed_amount = v_amount,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$function$;