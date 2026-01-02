-- ============================================================================
-- FIX: Correct column names in apply_daily_yield_to_fund_v2
-- Drop with correct signature and recreate
-- ============================================================================

DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid, boolean);

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_purpose aum_purpose DEFAULT 'transaction',
  p_admin_id uuid DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS TABLE(
  investors_updated integer,
  total_yield_amount numeric,
  new_fund_aum numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investors_updated integer := 0;
  v_total_yield numeric := 0;
  v_new_aum numeric := 0;
  v_position record;
  v_yield_amount numeric;
  v_asset text;
  v_total_aum numeric;
  v_yield_pct numeric;
BEGIN
  -- Get fund asset and total AUM
  SELECT f.asset INTO v_asset FROM funds f WHERE f.id = p_fund_id;
  
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get total AUM to calculate percentage
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0;
  
  IF v_total_aum <= 0 THEN
    RETURN QUERY SELECT 0::integer, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Calculate yield percentage
  v_yield_pct := p_gross_amount / v_total_aum;

  -- Process each investor position
  FOR v_position IN 
    SELECT investor_id, current_value, shares
    FROM investor_positions 
    WHERE fund_id = p_fund_id AND current_value > 0
  LOOP
    -- Calculate yield for this investor proportionally
    v_yield_amount := v_position.current_value * v_yield_pct;
    
    -- Skip if yield is negligible
    IF ABS(v_yield_amount) < 0.000001 THEN
      CONTINUE;
    END IF;

    -- Create yield transaction (FIXED: removed status column)
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, 
      notes, created_by, asset
    ) VALUES (
      v_position.investor_id, p_fund_id, 'YIELD'::tx_type, v_yield_amount, p_date,
      'Daily yield distribution', p_admin_id, v_asset
    );

    -- Update position
    UPDATE investor_positions
    SET 
      current_value = current_value + v_yield_amount,
      shares = shares + v_yield_amount,
      cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_yield_amount,
      updated_at = NOW()
    WHERE investor_id = v_position.investor_id AND fund_id = p_fund_id;

    v_total_yield := v_total_yield + v_yield_amount;
    v_investors_updated := v_investors_updated + 1;
  END LOOP;

  -- Calculate new AUM
  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions WHERE fund_id = p_fund_id;

  -- Recalculate fund AUM
  PERFORM recalculate_fund_aum_for_date(
    p_fund_id,
    p_date,
    p_purpose,
    p_admin_id
  );

  RETURN QUERY SELECT v_investors_updated, v_total_yield, v_new_aum;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2 TO authenticated;