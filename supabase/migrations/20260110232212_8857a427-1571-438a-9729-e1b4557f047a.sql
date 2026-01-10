-- ===========================================
-- System Hardening: Function Synchronization
-- ===========================================

-- 1. Fix void_transaction JSONB key for consistency (tx_date instead of transaction_date)
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_actor uuid;
  v_projected_balance numeric;
  v_aum_result jsonb;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  v_actor := COALESCE(p_actor_id, auth.uid());
  
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;
  
  -- Calculate projected balance after voiding
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
  
  -- Check for yields calculated AFTER this transaction's effective date
  SELECT array_agg(DISTINCT yd.id)
  INTO v_dependent_yields
  FROM yield_distributions yd
  WHERE yd.fund_id = v_tx.fund_id
    AND yd.effective_date >= v_tx.tx_date
    AND yd.status = 'applied'
    AND yd.voided_at IS NULL;
  
  IF array_length(v_dependent_yields, 1) > 0 THEN
    v_yield_warning := jsonb_build_object(
      'warning', 'YIELDS_MAY_REQUIRE_RECALCULATION',
      'severity', 'HIGH',
      'affected_yield_ids', to_jsonb(v_dependent_yields),
      'count', array_length(v_dependent_yields, 1),
      'tx_date', v_tx.tx_date,
      'recommendation', 'Review and consider recalculating yields for dates >= ' || v_tx.tx_date::text
    );
    
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'VOID_YIELD_DEPENDENCY_WARNING',
      'transactions_v2',
      p_transaction_id::text,
      v_actor,
      v_yield_warning,
      jsonb_build_object(
        'fund_id', v_tx.fund_id,
        'investor_id', v_tx.investor_id,
        'tx_type', v_tx.type,
        'tx_amount', v_tx.amount
      )
    );
  END IF;
  
  -- Mark transaction as voided
  UPDATE transactions_v2
  SET 
    is_voided = true,
    void_reason = p_reason,
    voided_by = v_actor,
    voided_at = NOW()
  WHERE id = p_transaction_id;
  
  -- Recompute investor position from raw ledger
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);
  
  -- Recalculate AUM for the transaction's date
  IF v_tx.fund_id IS NOT NULL THEN
    v_aum_result := recalculate_fund_aum_for_date(
      v_tx.fund_id,
      v_tx.tx_date,
      'transaction'::aum_purpose,
      v_actor
    );
  END IF;
  
  -- Audit log for the void action
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'VOID',
    v_actor,
    jsonb_build_object('is_voided', false),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object(
      'transaction_type', v_tx.type, 
      'amount', v_tx.amount,
      'tx_date', v_tx.tx_date,
      'aum_update', COALESCE(v_aum_result, '{}'::jsonb),
      'yield_dependency_check', v_yield_warning IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_updated', v_aum_result IS NOT NULL,
    'aum_result', COALESCE(v_aum_result, '{}'::jsonb),
    'yield_dependency', COALESCE(v_yield_warning, jsonb_build_object('warning', NULL, 'count', 0))
  );
END;
$$;

-- 2. Add advisory lock to create_withdrawal_request to prevent race conditions
CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_type text DEFAULT 'full',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
  v_can_withdraw JSONB;
  v_fund_class TEXT;
BEGIN
  -- Advisory lock to prevent race conditions (double-spend protection)
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal_request:' || p_investor_id::text || ':' || p_fund_id::text));

  -- Check if withdrawal is allowed
  v_can_withdraw = public.can_withdraw(p_investor_id, p_fund_id, p_amount);
  
  IF NOT (v_can_withdraw->>'can_withdraw')::BOOLEAN THEN
    RAISE EXCEPTION 'Withdrawal not allowed: %', v_can_withdraw->>'reason';
  END IF;
  
  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  -- Create the request
  INSERT INTO public.withdrawal_requests (
    investor_id,
    fund_id,
    fund_class,
    requested_amount,
    withdrawal_type,
    notes,
    created_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_fund_class,
    p_amount,
    p_type,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(uuid, uuid, numeric, text, text) TO authenticated;