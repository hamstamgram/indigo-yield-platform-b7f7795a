-- ============================================================================
-- FIX: Remove invalid created_at references from functions
-- Must drop first due to return type change
-- ============================================================================

-- Drop the existing function first (return type is different)
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

-- Phase 1: Recreate adjust_investor_position function
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL
)
RETURNS TABLE(
  transaction_id uuid,
  old_balance numeric,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_class text;
  v_asset text;
BEGIN
  -- Get fund details
  SELECT fund_class, asset INTO v_fund_class, v_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_class IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get current balance
  SELECT COALESCE(current_value, 0) INTO v_old_balance
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance + p_delta;
  
  -- Prevent negative balances
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_old_balance, p_delta;
  END IF;

  -- Create transaction record
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_type, amount, 
    asset, note, created_by, tx_date, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_type, p_delta,
    v_asset, p_note, p_admin_id, p_tx_date, p_reference_id
  )
  RETURNING id INTO v_tx_id;

  -- Update or insert position (NO created_at, includes shares)
  INSERT INTO investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class,
    shares, updated_at, last_transaction_date
  ) VALUES (
    p_investor_id, p_fund_id, v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class, v_new_balance, NOW(), p_tx_date
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    shares = v_new_balance,
    cost_basis = CASE 
      WHEN p_delta > 0 THEN investor_positions.cost_basis + p_delta 
      ELSE investor_positions.cost_basis 
    END,
    updated_at = NOW(),
    last_transaction_date = p_tx_date;

  -- Recalculate fund AUM for the transaction date
  PERFORM recalculate_fund_aum_for_date(
    p_fund_id, 
    p_tx_date, 
    'transaction'::aum_purpose, 
    p_admin_id
  );

  RETURN QUERY SELECT v_tx_id, v_old_balance, v_new_balance;
END;
$$;

-- Phase 2: Fix crystallize_yield_before_flow function
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_investor_id uuid,
  p_fund_id uuid,
  p_flow_date date,
  p_flow_amount numeric,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_opening_balance numeric;
  v_yield_pct numeric;
  v_yield_amount numeric;
  v_result jsonb;
BEGIN
  v_period_end := p_flow_date - INTERVAL '1 day';
  
  -- FIX: Get period start from earliest transaction or fund inception (NOT created_at)
  SELECT COALESCE(
    (SELECT MIN(tx_date) FROM transactions_v2 
     WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false),
    (SELECT inception_date FROM funds WHERE id = p_fund_id),
    CURRENT_DATE
  )
  INTO v_period_start;
  
  -- If period start is after period end, no yield to crystallize
  IF v_period_start > v_period_end THEN
    RETURN jsonb_build_object(
      'crystallized', false,
      'reason', 'No yield period before flow date'
    );
  END IF;
  
  -- Get opening balance (balance before this flow)
  SELECT COALESCE(current_value, 0) INTO v_opening_balance
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_opening_balance := COALESCE(v_opening_balance, 0);
  
  -- If no opening balance, nothing to crystallize
  IF v_opening_balance <= 0 THEN
    RETURN jsonb_build_object(
      'crystallized', false,
      'reason', 'No opening balance to crystallize'
    );
  END IF;
  
  -- Get yield percentage for the fund for this period
  SELECT COALESCE(
    (SELECT gross_yield_pct FROM fund_yield_snapshots 
     WHERE fund_id = p_fund_id 
       AND period_start <= v_period_end 
       AND period_end >= v_period_start
       AND is_voided = false
     ORDER BY period_end DESC
     LIMIT 1),
    0
  ) INTO v_yield_pct;
  
  -- Calculate yield amount
  v_yield_amount := v_opening_balance * (v_yield_pct / 100);
  
  -- Update investor position with crystallized yield
  UPDATE investor_positions
  SET 
    cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_yield_amount,
    last_yield_crystallization_date = p_flow_date,
    updated_at = NOW()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_result := jsonb_build_object(
    'crystallized', true,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_balance', v_opening_balance,
    'yield_pct', v_yield_pct,
    'yield_amount', v_yield_amount
  );
  
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, uuid, date, numeric, uuid) TO authenticated;