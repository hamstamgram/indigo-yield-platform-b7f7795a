-- FIX: Update recompute_investor_position to properly calculate cost_basis
-- It was only setting cost_basis on INSERT, not UPDATE, causing stale values

CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_credits NUMERIC(28,10) := 0;
  v_total_debits NUMERIC(28,10) := 0;
  v_net_balance NUMERIC(28,10) := 0;
  v_cost_basis NUMERIC(28,10) := 0;
  v_old_value NUMERIC(28,10) := 0;
  v_position_exists BOOLEAN := FALSE;
BEGIN
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  IF p_investor_id IS NULL OR p_fund_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'investor_id and fund_id are required');
  END IF;
  
  SELECT current_value, TRUE INTO v_old_value, v_position_exists
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  v_old_value := COALESCE(v_old_value, 0);
  
  -- Calculate credits (money in)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM transactions_v2 WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false
    AND type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT');
  
  -- Calculate debits (money out)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debits
  FROM transactions_v2 WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false
    AND type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL');
  
  v_net_balance := v_total_credits - v_total_debits;
  
  -- Calculate cost_basis = deposits - withdrawals (excludes yield/fees)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN ABS(amount) ELSE 0 END), 0)
  INTO v_cost_basis
  FROM transactions_v2 
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id AND is_voided = false;
  
  IF v_position_exists THEN
    UPDATE investor_positions 
    SET current_value = v_net_balance, 
        shares = v_net_balance, 
        cost_basis = v_cost_basis,  -- FIX: Now updates cost_basis
        is_active = (v_net_balance > 0), 
        updated_at = NOW()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
    
    RETURN jsonb_build_object(
      'success', true, 
      'investor_id', p_investor_id, 
      'fund_id', p_fund_id,
      'old_value', v_old_value, 
      'new_value', v_net_balance, 
      'cost_basis', v_cost_basis,
      'variance', v_old_value - v_net_balance, 
      'operation', 'update'
    );
  ELSE
    IF v_net_balance > 0 THEN
      INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis, is_active, created_at, updated_at)
      VALUES (p_investor_id, p_fund_id, v_net_balance, v_net_balance, v_cost_basis, true, NOW(), NOW());
      RETURN jsonb_build_object('success', true, 'old_value', 0, 'new_value', v_net_balance, 'cost_basis', v_cost_basis, 'operation', 'insert');
    END IF;
    RETURN jsonb_build_object('success', true, 'operation', 'no_change');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION recompute_investor_position IS 
'Recomputes investor position from ledger. Now properly calculates cost_basis = deposits - withdrawals on both INSERT and UPDATE.';

-- Also update fix_doubled_cost_basis to be callable by service_role (for data correction)
DROP FUNCTION IF EXISTS fix_doubled_cost_basis();

CREATE OR REPLACE FUNCTION fix_doubled_cost_basis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count integer := 0;
  v_positions_fixed jsonb := '[]'::jsonb;
  v_position record;
BEGIN
  -- Set canonical RPC flag to bypass the trigger guard
  PERFORM set_canonical_rpc();

  -- Find and fix all doubled cost_basis positions
  FOR v_position IN 
    SELECT 
      ip.investor_id,
      ip.fund_id,
      ip.cost_basis as old_cost_basis,
      f.name as fund_name,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0) as expected_cost_basis
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.cost_basis, f.name, p.first_name, p.last_name, p.email
    HAVING (COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)) > 0
       AND ABS(ip.cost_basis / (
            COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' AND NOT t.is_voided THEN t.amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' AND NOT t.is_voided THEN ABS(t.amount) ELSE 0 END), 0)
           ) - 2) < 0.15
  LOOP
    -- Update the position
    UPDATE investor_positions
    SET cost_basis = v_position.expected_cost_basis,
        updated_at = now()
    WHERE investor_id = v_position.investor_id
      AND fund_id = v_position.fund_id;

    -- Log to audit
    INSERT INTO audit_log (action, entity, entity_id, meta, old_values, new_values)
    VALUES (
      'cost_basis_correction',
      'investor_positions',
      v_position.investor_id || '_' || v_position.fund_id,
      jsonb_build_object(
        'correction_reason', 'cost_basis_doubling_bug_fix',
        'ratio_before_fix', v_position.old_cost_basis / v_position.expected_cost_basis,
        'fund_name', v_position.fund_name,
        'investor_name', v_position.investor_name
      ),
      jsonb_build_object('cost_basis', v_position.old_cost_basis),
      jsonb_build_object('cost_basis', v_position.expected_cost_basis)
    );

    v_positions_fixed := v_positions_fixed || jsonb_build_object(
      'investor_name', v_position.investor_name,
      'fund_name', v_position.fund_name,
      'old_cost_basis', v_position.old_cost_basis,
      'new_cost_basis', v_position.expected_cost_basis
    );
    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'positions_fixed', v_positions_fixed
  );
END;
$$;

-- Grant to service_role so it can be run from the dashboard
GRANT EXECUTE ON FUNCTION fix_doubled_cost_basis() TO service_role;

-- Run the fix immediately
SELECT fix_doubled_cost_basis();