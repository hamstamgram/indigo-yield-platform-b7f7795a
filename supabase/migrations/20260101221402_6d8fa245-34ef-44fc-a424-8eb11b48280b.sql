-- Fix void_transaction function: Remove invalid FIRST_INVESTMENT enum reference
-- FIRST_INVESTMENT is not a valid tx_type enum value - first investments are stored as DEPOSIT with tx_subtype='first_investment'

CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_delta NUMERIC;
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get transaction details
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;

  -- Calculate reversal delta (opposite of original effect)
  -- DEPOSIT types add to balance, so void subtracts (negative delta)
  -- WITHDRAWAL types subtract from balance, so void adds (positive delta)
  v_delta := CASE 
    WHEN v_tx.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN -v_tx.amount
    WHEN v_tx.type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL') THEN v_tx.amount
    ELSE 0
  END;

  -- Mark transaction as voided
  UPDATE transactions_v2
  SET 
    is_voided = true,
    voided_at = NOW(),
    voided_by = v_current_user_id,
    void_reason = p_reason
  WHERE id = p_transaction_id;

  -- Update investor position (reverse the original transaction effect)
  UPDATE investor_positions
  SET 
    current_balance = current_balance + v_delta,
    updated_at = NOW()
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id;

  -- Write audit log
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'VOID',
    v_current_user_id,
    jsonb_build_object('is_voided', false),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('reversal_delta', v_delta, 'original_amount', v_tx.amount, 'original_type', v_tx.type::text)
  );
END;
$$;