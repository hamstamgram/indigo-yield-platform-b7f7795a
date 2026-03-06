-- Fix adjust_investor_position function: remove invalid created_at column reference
-- The investor_positions table does NOT have a created_at column

CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id UUID,
  p_fund_id UUID,
  p_delta NUMERIC,
  p_note TEXT DEFAULT NULL,
  p_tx_type TEXT DEFAULT 'ADJUSTMENT',
  p_tx_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
  v_tx_id UUID;
  v_fund_class TEXT;
  v_admin_id UUID;
BEGIN
  -- Get current user as admin
  v_admin_id := auth.uid();
  
  -- Get fund class
  SELECT fund_class INTO v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;
  
  IF v_fund_class IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Get current balance
  SELECT current_value INTO v_old_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance + p_delta;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance. Current: ' || v_old_balance || ', Delta: ' || p_delta
    );
  END IF;

  -- Create transaction record
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    tx_type,
    amount,
    balance_before,
    balance_after,
    tx_date,
    effective_date,
    source,
    visibility,
    notes,
    created_by
  ) VALUES (
    p_investor_id,
    p_fund_id,
    p_tx_type::tx_type,
    ABS(p_delta),
    v_old_balance,
    v_new_balance,
    p_tx_date,
    p_tx_date,
    'manual_admin'::tx_source,
    'investor_visible'::visibility_scope,
    p_note,
    v_admin_id
  )
  RETURNING id INTO v_tx_id;

  -- Upsert position - FIXED: removed created_at (column doesn't exist)
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    fund_class,
    updated_at,
    last_transaction_date
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class,
    NOW(),
    p_tx_date
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = investor_positions.cost_basis + (CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END),
    updated_at = NOW(),
    last_transaction_date = p_tx_date;

  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'transactionId', v_tx_id,
      'oldBalance', v_old_balance,
      'newBalance', v_new_balance
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;