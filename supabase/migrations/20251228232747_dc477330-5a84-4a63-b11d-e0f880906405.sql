-- Fix route_withdrawal_to_fees to get asset from funds table instead of v_request.asset
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
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  PERFORM public.ensure_admin();
  
  -- Get withdrawal request
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status NOT IN ('approved', 'processing') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  
  -- Get asset from fund (or use fund_class as fallback)
  SELECT f.asset INTO v_fund_asset FROM public.funds f WHERE f.id = v_request.fund_id;
  IF v_fund_asset IS NULL THEN
    v_fund_asset := v_request.fund_class;  -- Fallback to fund_class
  END IF;

  -- Create FEE transaction (debit from investor)
  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (v_request.investor_id, v_request.fund_id, 'FEE', -ABS(v_request.processed_amount), v_fund_asset, v_request.fund_class, CURRENT_DATE, p_reason, 'fee_route_' || p_request_id::text, auth.uid(), false);

  -- Create FEE_CREDIT transaction (credit to fees account)
  INSERT INTO public.transactions_v2 (investor_id, fund_id, type, amount, asset, fund_class, tx_date, notes, reference_id, created_by, is_voided)
  VALUES (v_fees_account_id, v_request.fund_id, 'FEE_CREDIT', ABS(v_request.processed_amount), v_fund_asset, v_request.fund_class, CURRENT_DATE, 'Fee from ' || LEFT(v_request.investor_id::text, 8), 'fee_credit_' || p_request_id::text, auth.uid(), false);

  -- Update investor positions
  UPDATE public.investor_positions 
  SET current_value = current_value - ABS(v_request.processed_amount), updated_at = now() 
  WHERE investor_id = v_request.investor_id AND fund_id = v_request.fund_id;
  
  UPDATE public.investor_positions 
  SET current_value = current_value + ABS(v_request.processed_amount), updated_at = now() 
  WHERE investor_id = v_fees_account_id AND fund_id = v_request.fund_id;
  
  -- Mark withdrawal as completed
  UPDATE public.withdrawal_requests SET status = 'completed', completed_at = NOW() WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$function$;