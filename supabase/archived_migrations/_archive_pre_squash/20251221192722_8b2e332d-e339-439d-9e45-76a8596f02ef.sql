-- P0 Fix: Drop and recreate complete_withdrawal RPC with correct column names
-- Fix: processed_date → processed_at, p_admin_notes → p_notes (consistency)

DROP FUNCTION IF EXISTS public.complete_withdrawal(uuid, text, text);

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID,
  p_tx_hash TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_request RECORD;
  v_withdrawal_tx_id UUID;
  v_fund_asset TEXT;
  v_fund_class TEXT;
  v_current_position NUMERIC;
BEGIN
  -- Ensure admin privileges
  PERFORM public.ensure_admin();
  
  -- Get request details with FOR UPDATE lock to prevent race conditions
  SELECT * INTO v_request 
  FROM public.withdrawal_requests 
  WHERE id = p_request_id
  FOR UPDATE;
  
  IF v_request IS NULL THEN 
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  -- Idempotency: if already completed, return success
  IF v_request.status = 'completed' THEN
    RETURN TRUE;
  END IF;
  
  IF v_request.status != 'processing' THEN 
    RAISE EXCEPTION 'Can only complete requests in processing status. Current status: %', v_request.status;
  END IF;

  -- Get fund details
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  -- Check for existing withdrawal transaction (idempotency via reference_id)
  IF EXISTS (
    SELECT 1 FROM transactions_v2 
    WHERE reference_id = 'WD-' || p_request_id::text
  ) THEN
    -- Already processed, just update status
    UPDATE public.withdrawal_requests
    SET status = 'completed',
        tx_hash = COALESCE(p_tx_hash, tx_hash),
        admin_notes = COALESCE(p_notes, admin_notes),
        processed_at = NOW()
    WHERE id = p_request_id;
    
    PERFORM public.log_withdrawal_action(
      p_request_id,
      'complete',
      jsonb_build_object('note', 'Already processed, status updated only')
    );
    
    RETURN TRUE;
  END IF;

  -- Check current position balance to prevent negative balance
  SELECT shares INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id;
  
  IF v_current_position IS NULL OR v_current_position < v_request.processed_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', 
      COALESCE(v_current_position, 0), v_request.processed_amount;
  END IF;

  -- Create WITHDRAWAL transaction in ledger (token-denominated)
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, is_system_generated,
    visibility_scope, reference_id, tx_hash, notes, created_by, 
    approved_by, approved_at, purpose
  ) VALUES (
    gen_random_uuid(), v_request.investor_id, v_request.fund_id, 
    v_fund_asset, v_fund_class, v_request.processed_amount, 'WITHDRAWAL',
    CURRENT_DATE, CURRENT_DATE, 'withdrawal_processing', FALSE,
    'investor_visible', 'WD-' || p_request_id::text,
    COALESCE(p_tx_hash, v_request.tx_hash),
    'Withdrawal request ' || p_request_id::text,
    auth.uid(), auth.uid(), NOW(), 'transaction'
  ) RETURNING id INTO v_withdrawal_tx_id;
  
  -- Update investor position (decrease balance - token denominated)
  UPDATE investor_positions
  SET current_value = current_value - v_request.processed_amount,
      shares = shares - v_request.processed_amount,
      last_transaction_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET status = 'completed',
      tx_hash = COALESCE(p_tx_hash, tx_hash),
      admin_notes = COALESCE(p_notes, admin_notes),
      processed_at = NOW()
  WHERE id = p_request_id;

  -- Log action with full details
  PERFORM public.log_withdrawal_action(
    p_request_id, 'complete',
    jsonb_build_object(
      'tx_hash', COALESCE(p_tx_hash, v_request.tx_hash),
      'processed_amount', v_request.processed_amount,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'admin_notes', p_notes,
      'fund_asset', v_fund_asset
    )
  );
  
  RETURN TRUE;
END;
$$;