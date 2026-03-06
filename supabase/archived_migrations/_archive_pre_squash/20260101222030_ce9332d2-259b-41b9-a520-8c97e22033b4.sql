-- Fix void_transaction: Remove invalid FIRST_INVESTMENT enum reference
-- Must use exact same signature (3 params with DEFAULT) to REPLACE not create new
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
  v_actor := COALESCE(p_actor_id, auth.uid());
  
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Calculate projected balance WITHOUT FIRST_INVESTMENT (it's not a valid enum)
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_projected_balance
  FROM transactions_v2
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id
    AND is_voided = false
    AND id != p_transaction_id;
  
  IF v_projected_balance < 0 THEN
    RAISE EXCEPTION 'Cannot void: would result in negative balance (%). Void related withdrawals first.', ROUND(v_projected_balance, 4);
  END IF;
  
  UPDATE transactions_v2
  SET 
    is_voided = true,
    void_reason = p_reason,
    voided_by = v_actor,
    voided_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;
  
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
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