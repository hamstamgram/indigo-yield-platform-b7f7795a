-- =====================================================
-- Enhance get_void_transaction_impact with Yield Dependency Check
-- =====================================================
-- This allows the UI to show yield recalculation warnings BEFORE void confirmation

CREATE OR REPLACE FUNCTION get_void_transaction_impact(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_current_position RECORD;
  v_new_shares numeric;
  v_new_value numeric;
  v_new_cost_basis numeric;
  v_impact jsonb;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  -- Get the transaction
  SELECT t.*, f.code as fund_code, f.asset, f.name as fund_name,
         p.first_name, p.last_name, p.email
  INTO v_tx
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  LEFT JOIN profiles p ON p.id = t.investor_id
  WHERE t.id = p_transaction_id;
  
  IF v_tx IS NULL THEN
    RETURN jsonb_build_object(
      'can_void', false,
      'reason', 'Transaction not found',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RETURN jsonb_build_object(
      'can_void', false,
      'reason', 'Transaction is already voided',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;
  
  -- Get current position
  SELECT * INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id;
  
  -- Calculate impact (reversing the transaction)
  IF v_current_position IS NOT NULL THEN
    v_new_shares := v_current_position.shares - v_tx.shares;
    v_new_value := v_current_position.current_value - v_tx.net_amount;
    v_new_cost_basis := v_current_position.cost_basis - 
      CASE WHEN v_tx.type IN ('DEPOSIT', 'TRANSFER_IN') THEN v_tx.net_amount ELSE 0 END;
  ELSE
    v_new_shares := -v_tx.shares;
    v_new_value := -v_tx.net_amount;
    v_new_cost_basis := 0;
  END IF;
  
  -- CHECK FOR DEPENDENT YIELDS (the critical addition)
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
      'message', format('Voiding this transaction may affect %s yield distribution(s) calculated after %s. These yields may need to be recalculated.',
                        array_length(v_dependent_yields, 1), v_tx.tx_date),
      'affected_yield_ids', to_jsonb(v_dependent_yields),
      'count', array_length(v_dependent_yields, 1)
    );
  ELSE
    v_yield_warning := jsonb_build_object('warning', NULL, 'count', 0);
  END IF;
  
  -- Build impact summary
  v_impact := jsonb_build_object(
    'can_void', true,
    'transaction', jsonb_build_object(
      'id', v_tx.id,
      'type', v_tx.type,
      'tx_date', v_tx.tx_date,
      'net_amount', v_tx.net_amount,
      'shares', v_tx.shares,
      'fund_code', v_tx.fund_code,
      'fund_name', v_tx.fund_name,
      'asset', v_tx.asset,
      'investor_name', trim(coalesce(v_tx.first_name, '') || ' ' || coalesce(v_tx.last_name, '')),
      'investor_email', v_tx.email
    ),
    'position_impact', jsonb_build_object(
      'current_shares', coalesce(v_current_position.shares, 0),
      'new_shares', v_new_shares,
      'shares_change', -v_tx.shares,
      'current_value', coalesce(v_current_position.current_value, 0),
      'new_value', v_new_value,
      'value_change', -v_tx.net_amount,
      'would_go_negative', v_new_shares < 0 OR v_new_value < 0
    ),
    'yield_dependency', v_yield_warning,
    'warnings', CASE 
      WHEN v_new_shares < 0 OR v_new_value < 0 THEN 
        ARRAY['Position would become negative - proceed with caution']
      ELSE 
        ARRAY[]::text[]
    END
  );
  
  RETURN v_impact;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_void_transaction_impact(uuid) TO authenticated;