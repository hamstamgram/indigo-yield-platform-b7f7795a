-- ============================================================================
-- Fix: Correct position_change sign in get_void_transaction_impact
-- ============================================================================
-- Issue: position_change shows +6000 when voiding a deposit, should be -6000
-- Root Cause: Formula was (current - projected) instead of (projected - current)
-- Impact: Void preview shows opposite sign for position change
-- ============================================================================
-- Sign Convention for Void Operations:
--   DEPOSIT void:     position_change = -deposit_amount (position decreases)
--   WITHDRAWAL void:  position_change = +withdrawal_amount (position increases)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_void_transaction_impact(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_current_position RECORD;
  v_projected_value numeric;
  v_position_change numeric;
  v_impact jsonb;
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

  -- Get current position
  SELECT * INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id
    AND fund_id = v_tx.fund_id;

  -- Calculate projected value and change after voiding
  -- Void reverses the transaction effect:
  --   DEPOSIT (+10):    void subtracts 10 from position
  --   WITHDRAWAL (-5):  void adds back 5 to position (stored as negative, so -(-5) = +5)
  --   YIELD (+0.5):     void subtracts 0.5 from position
  --   FEE (-0.15):      void adds back 0.15 to position
  --
  -- For DEPOSIT/YIELD/IB_CREDIT: stored positive, void subtracts
  -- For WITHDRAWAL/FEE: stored negative, void adds back (subtracts negative = adds)
  --
  -- Simplified: projected = current - stored_amount (works for all types)
  -- Change = projected - current = -stored_amount

  IF v_current_position IS NOT NULL THEN
    -- Void always reverses the transaction: subtract the stored amount
    -- DEPOSIT (+10): projected = current - 10, change = -10
    -- WITHDRAWAL (-5): projected = current - (-5) = current + 5, change = +5
    v_projected_value := v_current_position.current_value - v_tx.amount;
    v_position_change := -v_tx.amount;
  ELSE
    -- No existing position, transaction would have created it
    v_projected_value := -v_tx.amount;
    v_position_change := -v_tx.amount;
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
  -- Return flat structure matching frontend VoidImpact interface
  RETURN jsonb_build_object(
    'success', true,
    'transaction_type', v_tx.type,
    'transaction_amount', v_tx.amount,
    'transaction_date', v_tx.tx_date,
    'current_position', COALESCE(v_current_position.current_value, 0),
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
Returns:
  - current_position: Position value before void
  - projected_position: Position value after void
  - position_change: Change in position (negative for voided deposits, positive for voided withdrawals)
Uses advisory lock: hashtext(''void:'' || transaction_id)';
