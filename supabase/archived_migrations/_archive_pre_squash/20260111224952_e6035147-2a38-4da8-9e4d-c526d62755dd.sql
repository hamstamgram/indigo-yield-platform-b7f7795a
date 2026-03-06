-- Fix get_void_transaction_impact function to use correct column references
-- The function was referencing v_tx.shares and v_tx.net_amount which don't exist in transactions_v2
-- Correct column is 'amount'

CREATE OR REPLACE FUNCTION public.get_void_transaction_impact(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_current_position RECORD;
  v_projected_value numeric;
  v_impact jsonb;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  -- Get the transaction with fund info
  SELECT t.*, f.code as fund_code, f.asset, f.name as fund_name,
         p.first_name, p.last_name, p.email
  INTO v_tx
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  LEFT JOIN profiles p ON p.id = t.investor_id
  WHERE t.id = p_transaction_id;
  
  IF v_tx IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;
  
  -- Check if already voided
  IF v_tx.is_voided THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction is already voided',
      'yield_dependency', jsonb_build_object('warning', NULL, 'count', 0)
    );
  END IF;
  
  -- Get current position
  SELECT * INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id 
    AND fund_id = v_tx.fund_id;
  
  -- Calculate projected value after voiding using 'amount' column
  -- Amount impact depends on transaction type
  IF v_current_position IS NOT NULL THEN
    v_projected_value := v_current_position.current_value - 
      CASE 
        WHEN v_tx.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT') THEN v_tx.amount
        WHEN v_tx.type IN ('WITHDRAWAL', 'FEE') THEN -ABS(v_tx.amount)
        ELSE v_tx.amount
      END;
  ELSE
    v_projected_value := -v_tx.amount;
  END IF;
  
  -- Check for dependent yields
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
      'message', format('Voiding may affect %s yield distribution(s) after %s',
                        array_length(v_dependent_yields, 1), v_tx.tx_date),
      'affected_yield_ids', to_jsonb(v_dependent_yields),
      'count', array_length(v_dependent_yields, 1)
    );
  ELSE
    v_yield_warning := jsonb_build_object('warning', NULL, 'count', 0);
  END IF;
  
  -- Build impact summary
  RETURN jsonb_build_object(
    'success', true,
    'transaction_type', v_tx.type,
    'transaction_amount', v_tx.amount,
    'transaction_date', v_tx.tx_date,
    'current_position', COALESCE(v_current_position.current_value, 0),
    'projected_position', v_projected_value,
    'position_change', COALESCE(v_current_position.current_value, 0) - v_projected_value,
    'would_go_negative', v_projected_value < 0,
    'aum_records_affected', 1,
    'is_system_generated', COALESCE(v_tx.is_system_generated, false),
    'yield_dependency', v_yield_warning,
    'investor_name', trim(coalesce(v_tx.first_name, '') || ' ' || coalesce(v_tx.last_name, '')),
    'fund_code', v_tx.fund_code
  );
END;
$$;