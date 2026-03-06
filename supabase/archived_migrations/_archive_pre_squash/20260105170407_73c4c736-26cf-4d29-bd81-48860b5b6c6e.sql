-- Fix: Remove erroneous line that selects asset (string) into numeric variable
-- This caused "invalid input syntax for type numeric: BTC" error

CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_snapshot_id uuid;
  v_event_ts timestamptz;
  v_post_flow_aum numeric(28,10);
  v_current_position numeric(28,10);
  v_new_position numeric(28,10);
BEGIN
  -- Build event timestamp from effective date
  v_event_ts := (p_effective_date::timestamp AT TIME ZONE 'UTC') + interval '12 hours';
  
  -- First crystallize yield before the deposit
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit', NULL, v_event_ts, p_admin_id, p_purpose
  );
  
  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  
  -- Get current position (correctly from investor_positions table)
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  v_current_position := COALESCE(v_current_position, 0);
  v_new_position := v_current_position + p_amount;
  
  -- Insert deposit transaction
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_type, amount, effective_date, tx_date,
    purpose, notes, status, created_by, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, 'DEPOSIT', p_amount, p_effective_date, p_effective_date,
    p_purpose, COALESCE(p_notes, 'Deposit with yield crystallization'), 'completed', p_admin_id,
    'DEP:' || p_fund_id::text || ':' || p_effective_date::text || ':' || p_investor_id::text
  ) RETURNING id INTO v_tx_id;
  
  -- Update investor position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, last_transaction_date)
  VALUES (p_investor_id, p_fund_id, v_new_position, v_new_position, v_new_position, p_effective_date)
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_position,
    cost_basis = investor_positions.cost_basis + p_amount,
    shares = v_new_position,
    last_transaction_date = p_effective_date;
  
  -- Calculate and store post_flow_aum
  v_post_flow_aum := p_closing_aum + p_amount;
  
  UPDATE fund_aum_events 
  SET post_flow_aum = v_post_flow_aum
  WHERE id = v_snapshot_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'snapshot_id', v_snapshot_id,
    'crystal_result', v_crystal_result,
    'previous_position', v_current_position, 
    'new_position', v_new_position,
    'closing_aum', p_closing_aum, 
    'post_flow_aum', v_post_flow_aum
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.apply_deposit_with_crystallization TO authenticated;