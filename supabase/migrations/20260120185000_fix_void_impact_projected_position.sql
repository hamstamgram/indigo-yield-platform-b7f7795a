-- ============================================================================
-- Fix: Correct projected_position calculation in get_void_transaction_impact
-- ============================================================================
-- Issue: projected_position shows wrong value (e.g., -5 instead of 100)
-- Root Cause: The calculation was using a conditional that could fail
-- Fix: Use explicit current_value variable for reliable calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_void_transaction_impact(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_current_value numeric;
  v_projected_value numeric;
  v_position_change numeric;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  -- Acquire advisory lock to ensure consistent read with void_transaction
  PERFORM pg_advisory_xact_lock(hashtext('void:' || p_transaction_id::text));

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

  -- Get current position value directly into a scalar variable
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM investor_positions ip
  WHERE ip.investor_id = v_tx.investor_id
    AND ip.fund_id = v_tx.fund_id;

  -- If no position found, default to 0
  IF v_current_value IS NULL THEN
    v_current_value := 0;
  END IF;

  -- Calculate projected value and change after voiding
  -- Void reverses the transaction effect:
  --   DEPOSIT (+100):   void subtracts 100 from position -> projected = current - 100
  --   WITHDRAWAL (-50): void adds back 50 to position -> projected = current - (-50) = current + 50
  --   YIELD (+10):      void subtracts 10 from position -> projected = current - 10
  --   FEE (-5):         void adds back 5 to position -> projected = current - (-5) = current + 5
  --
  -- Formula: projected = current - stored_amount (works for all types because amounts are signed)
  -- Change = -stored_amount (negative for deposits, positive for withdrawals)

  v_projected_value := v_current_value - v_tx.amount;
  v_position_change := -v_tx.amount;

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
    'current_position', v_current_value,
    'projected_position', v_projected_value,
    'position_change', v_position_change,
    'would_go_negative', v_projected_value < 0,
    'aum_records_affected', 1,
    'is_system_generated', COALESCE(v_tx.is_system_generated, false),
    'yield_dependency', v_yield_warning,
    'investor_name', trim(coalesce(v_tx.first_name, '') || ' ' || coalesce(v_tx.last_name, '')),
    'fund_code', v_tx.fund_code
  );
END;
$$;

COMMENT ON FUNCTION public.get_void_transaction_impact(uuid) IS
'Preview function for void_transaction impact analysis.
Fixed: Uses scalar variable for current_value to ensure reliable calculation.
Returns:
  - current_position: Position value before void
  - projected_position: Position value after void (current - transaction_amount)
  - position_change: Change in position (negative for voided deposits, positive for voided withdrawals)
Uses advisory lock: hashtext(''void:'' || transaction_id)';
