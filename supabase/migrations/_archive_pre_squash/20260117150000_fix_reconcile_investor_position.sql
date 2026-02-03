-- ============================================================================
-- FIX: reconcile_investor_position - current_balance should be current_value
-- ============================================================================
-- The previous migration incorrectly used "current_balance" which doesn't exist
-- in investor_positions table. The correct column is "current_value".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_fund_id uuid,
  p_investor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calculated_position numeric;
  v_stored_position numeric;
  v_deposits numeric;
  v_withdrawals numeric;
  v_yield numeric;
  v_diff numeric;
BEGIN
  -- SECURITY: Reconciliation is admin-only
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reconcile positions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Calculate position from transactions
  -- Using valid enum value 'DEPOSIT' (not FIRST_INVESTMENT or TOP_UP)
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN abs(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN t.type = 'YIELD' THEN t.amount ELSE 0 END), 0)
  INTO v_deposits, v_withdrawals, v_yield
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.investor_id = p_investor_id
    AND t.is_voided = false;

  v_calculated_position := v_deposits - v_withdrawals + v_yield;

  -- Get stored position (FIX: use current_value, not current_balance)
  SELECT current_value INTO v_stored_position
  FROM investor_positions
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id;

  v_diff := COALESCE(v_calculated_position, 0) - COALESCE(v_stored_position, 0);

  -- Update if different (FIX: use current_value, not current_balance)
  IF ABS(v_diff) > 0.01 THEN
    UPDATE investor_positions
    SET current_value = v_calculated_position,
        updated_at = now()
    WHERE fund_id = p_fund_id
      AND investor_id = p_investor_id;
  END IF;

  RETURN jsonb_build_object(
    'fund_id', p_fund_id,
    'investor_id', p_investor_id,
    'calculated_position', v_calculated_position,
    'stored_position', v_stored_position,
    'difference', v_diff,
    'deposits', v_deposits,
    'withdrawals', v_withdrawals,
    'yield', v_yield,
    'updated', ABS(v_diff) > 0.01
  );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(uuid, uuid) TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Fixed reconcile_investor_position: changed current_balance to current_value';
END $$;
