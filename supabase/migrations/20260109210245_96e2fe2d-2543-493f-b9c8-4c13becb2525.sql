-- Fix apply_daily_yield_to_fund_v3 function to use correct statement_periods columns
-- The function was incorrectly referencing period_start and period_end which don't exist
-- Actual columns are: year, month, period_end_date

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_aum numeric;
  v_gross_yield_amount numeric;
  v_snapshot_id uuid;
  v_period_id uuid;
  v_distributions_created int := 0;
  v_total_distributed numeric := 0;
  v_investor record;
  v_distribution_id uuid;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_net_yield numeric;
  v_result jsonb;
BEGIN
  -- Get fund AUM for the yield date
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_yield_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No AUM found for fund on specified date'
    );
  END IF;

  -- Calculate gross yield amount
  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);

  -- Create fund yield snapshot
  INSERT INTO fund_yield_snapshots (
    fund_id,
    snapshot_date,
    period_start,
    period_end,
    opening_aum,
    closing_aum,
    gross_yield_pct,
    gross_yield_amount,
    days_in_period,
    trigger_type,
    trigger_reference,
    created_by
  ) VALUES (
    p_fund_id,
    p_yield_date,
    p_yield_date,
    p_yield_date,
    v_fund_aum,
    v_fund_aum + v_gross_yield_amount,
    p_gross_yield_pct,
    v_gross_yield_amount,
    1,
    'manual',
    'Daily yield application',
    p_created_by
  )
  RETURNING id INTO v_snapshot_id;

  -- Find the statement period for this date using correct columns
  SELECT id INTO v_period_id
  FROM statement_periods sp
  WHERE p_yield_date BETWEEN 
    make_date(sp.year, sp.month, 1) 
    AND sp.period_end_date
  LIMIT 1;

  -- Distribute yield to each investor with a position in this fund
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      ip.current_value as balance,
      CASE WHEN v_fund_aum > 0 
        THEN (ip.current_value / v_fund_aum) * 100 
        ELSE 0 
      END as ownership_pct
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    -- Get investor's fee percentage
    SELECT COALESCE(
      (SELECT fee_pct FROM investor_fee_schedule 
       WHERE investor_id = v_investor.investor_id 
         AND (fund_id = p_fund_id OR fund_id IS NULL)
         AND effective_date <= p_yield_date
         AND (end_date IS NULL OR end_date >= p_yield_date)
       ORDER BY fund_id NULLS LAST, effective_date DESC
       LIMIT 1),
      (SELECT value FROM global_fee_settings WHERE setting_key = 'default_fee_pct'),
      20
    ) INTO v_fee_pct;

    -- Calculate investor's share of yield
    v_net_yield := v_gross_yield_amount * (v_investor.ownership_pct / 100);
    v_fee_amount := v_net_yield * (v_fee_pct / 100);
    v_net_yield := v_net_yield - v_fee_amount;

    -- Create yield distribution record
    INSERT INTO yield_distributions (
      fund_id,
      investor_id,
      period_id,
      period_start,
      period_end,
      gross_yield_amount,
      fee_percentage,
      fee_amount,
      net_yield_amount,
      investor_balance_at_distribution,
      ownership_percentage,
      purpose,
      status,
      created_by
    ) VALUES (
      p_fund_id,
      v_investor.investor_id,
      v_period_id,
      p_yield_date,
      p_yield_date,
      v_gross_yield_amount * (v_investor.ownership_pct / 100),
      v_fee_pct,
      v_fee_amount,
      v_net_yield,
      v_investor.balance,
      v_investor.ownership_pct,
      p_purpose,
      'applied',
      p_created_by
    )
    RETURNING id INTO v_distribution_id;

    -- Update investor position
    UPDATE investor_positions
    SET 
      current_value = current_value + v_net_yield,
      cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
      last_yield_crystallization_date = p_yield_date,
      updated_at = now()
    WHERE investor_id = v_investor.investor_id
      AND fund_id = p_fund_id;

    v_distributions_created := v_distributions_created + 1;
    v_total_distributed := v_total_distributed + v_net_yield;
  END LOOP;

  -- Update fund AUM with new value
  UPDATE fund_daily_aum
  SET 
    total_aum = total_aum + v_gross_yield_amount,
    updated_at = now(),
    updated_by = p_created_by
  WHERE fund_id = p_fund_id
    AND aum_date = p_yield_date
    AND purpose = p_purpose
    AND is_voided = false;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_aum', v_fund_aum,
    'gross_yield_amount', v_gross_yield_amount,
    'distributions_created', v_distributions_created,
    'total_distributed', v_total_distributed
  );
END;
$$;