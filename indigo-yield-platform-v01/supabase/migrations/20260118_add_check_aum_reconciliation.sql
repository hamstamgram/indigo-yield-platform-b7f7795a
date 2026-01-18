-- ==============================================================================
-- AUM Reconciliation Check Function
-- Date: 2026-01-18
-- Description: Adds check_aum_reconciliation RPC function to verify AUM accuracy
-- ==============================================================================

-- Create AUM reconciliation check function
CREATE OR REPLACE FUNCTION public.check_aum_reconciliation(
  p_fund_id UUID,
  p_tolerance NUMERIC DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund_code TEXT;
  v_recorded_aum NUMERIC(28,10);
  v_calculated_aum NUMERIC(28,10);
  v_discrepancy NUMERIC(28,10);
  v_is_reconciled BOOLEAN;
BEGIN
  -- Get fund code from UUID
  SELECT code INTO v_fund_code
  FROM funds
  WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Fund not found',
      'fund_id', p_fund_id,
      'is_reconciled', false
    );
  END IF;

  -- Get recorded AUM from fund_daily_aum (uses fund code as TEXT)
  SELECT COALESCE(total_aum, 0) INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = v_fund_code
    AND aum_date = CURRENT_DATE
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_recorded_aum IS NULL OR v_recorded_aum = 0 THEN
    -- Try yesterday if today not available
    SELECT COALESCE(total_aum, 0) INTO v_recorded_aum
    FROM fund_daily_aum
    WHERE fund_id = v_fund_code
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  v_recorded_aum := COALESCE(v_recorded_aum, 0);

  -- Calculate AUM from positions (uses fund UUID)
  SELECT COALESCE(SUM(current_value), 0) INTO v_calculated_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id;

  v_discrepancy := ABS(v_recorded_aum - v_calculated_aum);
  v_is_reconciled := v_discrepancy <= p_tolerance;

  RETURN jsonb_build_object(
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy', v_discrepancy,
    'tolerance', p_tolerance,
    'is_reconciled', v_is_reconciled,
    'checked_at', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_aum_reconciliation TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.check_aum_reconciliation(UUID, NUMERIC) IS
'Checks if recorded AUM in fund_daily_aum matches the sum of investor positions. Returns JSON with reconciliation status, amounts, and discrepancy.';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260118_add_check_aum_reconciliation completed successfully';
  RAISE NOTICE 'Function check_aum_reconciliation(UUID, NUMERIC) created';
END $$;
