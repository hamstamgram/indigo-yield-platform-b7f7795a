-- AUM Reconciliation Check Function
-- Compares sum of investor positions vs recorded fund AUM

CREATE OR REPLACE FUNCTION check_aum_reconciliation(
  p_fund_id UUID,
  p_tolerance_pct NUMERIC DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_positions_sum NUMERIC;
  v_recorded_aum NUMERIC;
  v_discrepancy NUMERIC;
  v_discrepancy_pct NUMERIC;
  v_has_warning BOOLEAN;
  v_fund_asset TEXT;
  v_aum_date DATE;
BEGIN
  -- Get fund asset
  SELECT asset INTO v_fund_asset
  FROM funds
  WHERE id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Get sum of investor positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_positions_sum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;
  
  -- Get latest recorded AUM
  SELECT total_aum, aum_date
  INTO v_recorded_aum, v_aum_date
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;
  
  -- Handle no recorded AUM
  IF v_recorded_aum IS NULL THEN
    v_recorded_aum := 0;
  END IF;
  
  -- Calculate discrepancy
  v_discrepancy := v_positions_sum - v_recorded_aum;
  
  IF v_recorded_aum > 0 THEN
    v_discrepancy_pct := ABS(v_discrepancy) / v_recorded_aum;
  ELSE
    v_discrepancy_pct := CASE WHEN v_positions_sum > 0 THEN 1 ELSE 0 END;
  END IF;
  
  v_has_warning := v_discrepancy_pct > p_tolerance_pct;
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_asset', v_fund_asset,
    'positions_sum', v_positions_sum,
    'recorded_aum', v_recorded_aum,
    'aum_date', v_aum_date,
    'discrepancy', v_discrepancy,
    'discrepancy_pct', ROUND(v_discrepancy_pct * 100, 4),
    'tolerance_pct', p_tolerance_pct * 100,
    'has_warning', v_has_warning,
    'message', CASE 
      WHEN v_has_warning THEN 
        'AUM discrepancy exceeds tolerance: ' || ROUND(v_discrepancy_pct * 100, 2) || '%'
      ELSE 
        'AUM reconciled within tolerance'
    END
  );
END;
$$;