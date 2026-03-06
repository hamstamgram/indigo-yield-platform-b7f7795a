-- Fix column name mismatches in apply_deposit_with_crystallization
-- and apply_withdrawal_with_crystallization functions
-- 
-- BUGS FIXED:
-- 1. tx_type → type (correct column name)
-- 2. effective_date → value_date (correct column name)
-- 3. status → REMOVED (column doesn't exist)
-- 4. Added missing required columns: asset, fund_class, source, visibility_scope

-- Fix apply_deposit_with_crystallization
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
  v_fund record;
BEGIN
  -- Get fund details for asset and fund_class
  SELECT asset, fund_class INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_event_ts := (p_effective_date::timestamp AT TIME ZONE 'UTC') + interval '12 hours';
  
  -- First crystallize yield before the deposit
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit', NULL, v_event_ts, p_admin_id, p_purpose
  );
  
  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  
  -- Get current position
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  v_current_position := COALESCE(v_current_position, 0);
  v_new_position := v_current_position + p_amount;
  
  -- Insert deposit transaction with CORRECT column names
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, tx_date, value_date,
    asset, fund_class, purpose, notes, created_by, reference_id,
    source, visibility_scope, is_system_generated
  ) VALUES (
    p_investor_id, p_fund_id, 'DEPOSIT'::tx_type, p_amount, p_effective_date, p_effective_date,
    v_fund.asset, v_fund.fund_class, p_purpose, COALESCE(p_notes, 'Deposit with yield crystallization'), p_admin_id,
    'DEP:' || p_fund_id::text || ':' || p_effective_date::text || ':' || p_investor_id::text,
    'manual_admin'::tx_source, 'investor_visible'::visibility_scope, false
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

-- Fix apply_withdrawal_with_crystallization
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
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
  v_fund record;
BEGIN
  -- Get fund details for asset and fund_class
  SELECT asset, fund_class INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_event_ts := (p_effective_date::timestamp AT TIME ZONE 'UTC') + interval '12 hours';
  
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  IF v_current_position IS NULL OR v_current_position < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', COALESCE(v_current_position, 0), p_amount;
  END IF;
  
  v_new_position := v_current_position - p_amount;
  
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'withdrawal', NULL, v_event_ts, p_admin_id, p_purpose
  );
  
  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  
  -- Insert withdrawal transaction with CORRECT column names
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, tx_date, value_date,
    asset, fund_class, purpose, notes, created_by, reference_id,
    source, visibility_scope, is_system_generated
  ) VALUES (
    p_investor_id, p_fund_id, 'WITHDRAWAL'::tx_type, -ABS(p_amount), p_effective_date, p_effective_date,
    v_fund.asset, v_fund.fund_class, p_purpose, COALESCE(p_notes, 'Withdrawal with yield crystallization'), p_admin_id,
    'WDR:' || p_fund_id::text || ':' || p_effective_date::text || ':' || p_investor_id::text,
    'manual_admin'::tx_source, 'investor_visible'::visibility_scope, false
  ) RETURNING id INTO v_tx_id;
  
  UPDATE investor_positions SET
    current_value = v_new_position, shares = v_new_position,
    last_transaction_date = p_effective_date, updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_post_flow_aum := p_closing_aum - p_amount;
  
  UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum, trigger_reference = v_tx_id::text
  WHERE id = v_snapshot_id;
  
  RETURN jsonb_build_object(
    'success', true, 'transaction_id', v_tx_id, 'snapshot_id', v_snapshot_id,
    'crystallization', v_crystal_result, 'withdrawal_amount', p_amount,
    'previous_position', v_current_position, 'new_position', v_new_position,
    'closing_aum', p_closing_aum, 'post_flow_aum', v_post_flow_aum
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.apply_deposit_with_crystallization TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization TO authenticated;