-- Fix 1: Update validate_transaction_type to skip validation when voiding
CREATE OR REPLACE FUNCTION public.validate_transaction_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_current_value numeric;
BEGIN
  -- SKIP validation entirely when voiding a transaction
  -- The void_transaction RPC handles its own balance checks
  IF TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false THEN
    RETURN NEW;
  END IF;

  -- Make negative amounts for outflow transaction types
  IF NEW.type IN ('WITHDRAWAL', 'FEE') AND NEW.amount > 0 THEN 
    NEW.amount := -ABS(NEW.amount); 
  END IF;
  
  -- Check sufficient balance for withdrawals only (INSERT operations)
  IF TG_OP = 'INSERT' AND NEW.type = 'WITHDRAWAL' THEN
    SELECT COALESCE(current_value, 0) INTO v_current_value 
    FROM public.investor_positions 
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    
    IF COALESCE(v_current_value, 0) + NEW.amount < 0 THEN 
      RAISE EXCEPTION 'Insufficient balance: %', v_current_value; 
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix 2: Update void_transaction to pre-check for negative balance
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tx RECORD;
  v_actor uuid;
  v_projected_balance numeric;
BEGIN
  -- Get actor
  v_actor := COALESCE(p_actor_id, auth.uid());
  
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
  
  -- Calculate what balance would be after voiding this transaction
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT', 'FIRST_INVESTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_projected_balance
  FROM transactions_v2
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id
    AND is_voided = false
    AND id != p_transaction_id;  -- Exclude the transaction being voided
  
  -- Block if voiding would result in negative balance
  IF v_projected_balance < 0 THEN
    RAISE EXCEPTION 'Cannot void: would result in negative balance (%). Void related withdrawals first.', ROUND(v_projected_balance, 4);
  END IF;
  
  -- Void the transaction
  UPDATE transactions_v2
  SET 
    is_voided = true,
    void_reason = p_reason,
    voided_by = v_actor,
    voided_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Recompute investor position
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- Log to audit
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'VOID',
    v_actor,
    jsonb_build_object('is_voided', false),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('transaction_type', v_tx.type, 'amount', v_tx.amount)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', NOW()
  );
END;
$function$;