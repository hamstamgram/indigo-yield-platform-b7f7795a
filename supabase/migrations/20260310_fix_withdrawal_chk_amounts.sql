CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text, p_is_full_exit boolean DEFAULT false, p_crystallize_days integer DEFAULT 0)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_request record;
  v_admin uuid;
  v_processed_amount numeric;
BEGIN
  v_admin := require_super_admin();

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Withdrawal request not found'; END IF;

  IF v_request.status::text NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Cannot complete withdrawal in % status', v_request.status;
  END IF;

  -- Determine the processed amount to use
  v_processed_amount := COALESCE(p_processed_amount, v_request.processed_amount, v_request.requested_amount);

  -- CRITICAL FIX: Ensure approved_amount is set to satisfy chk_amounts constraint
  -- when moving status out of 'pending'.
  UPDATE withdrawal_requests 
  SET 
    processed_amount = v_processed_amount,
    approved_amount = COALESCE(approved_amount, v_processed_amount), -- satisfy chk_amounts
    status = 'processing', 
    updated_at = NOW()
  WHERE id = p_request_id;

  IF p_is_full_exit THEN
    UPDATE withdrawal_requests SET is_full_exit = true, updated_at = NOW() WHERE id = p_request_id;
  END IF;

  RETURN complete_withdrawal(
    p_request_id := p_request_id,
    p_transaction_hash := p_tx_hash,
    p_admin_notes := p_admin_notes
  );
END;
$function$
