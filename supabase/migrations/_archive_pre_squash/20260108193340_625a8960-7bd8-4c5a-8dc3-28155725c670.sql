-- Fix column mismatches in apply_daily_yield_to_fund_v3
-- Problem: current_balance should be current_value, ib_commission_pct should be ib_percentage

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id UUID,
  p_yield_date DATE,
  p_new_aum NUMERIC,
  p_actor_id UUID,
  p_purpose TEXT DEFAULT 'reporting'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_prev_aum NUMERIC;
  v_yield_amount NUMERIC;
  v_yield_pct NUMERIC;
  v_inv RECORD;
  v_inv_net NUMERIC;
  v_inv_fee NUMERIC;
  v_inv_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ref_id TEXT;
  v_dist_id UUID;
  v_total_distributed NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_total_ib NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_result JSONB;
  v_is_month_end BOOLEAN;
  v_period_id UUID;
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get previous AUM
  SELECT total_aum INTO v_prev_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_yield_date
    AND is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_prev_aum IS NULL OR v_prev_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No previous AUM found');
  END IF;

  -- Calculate yield
  v_yield_amount := p_new_aum - v_prev_aum;
  v_yield_pct := (v_yield_amount / v_prev_aum) * 100;

  -- Check for duplicate distribution
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date = p_yield_date
      AND purpose = p_purpose::aum_purpose
      AND voided_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution already exists for this date');
  END IF;

  -- Check if month end
  v_is_month_end := (p_yield_date = (date_trunc('month', p_yield_date) + interval '1 month - 1 day')::date);

  -- Get statement period if exists
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE p_yield_date BETWEEN period_start AND period_end
  LIMIT 1;

  -- Process each investor with a position
  FOR v_inv IN
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.allocation_pct,
      COALESCE(ifs.fee_pct, p.fee_pct, 0) as fee_pct,
      COALESCE(p.ib_percentage, 0) as ib_pct,
      p.ib_parent_id
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    -- Calculate investor's share of yield
    v_inv_gross := (v_inv.current_value / v_prev_aum) * v_yield_amount;
    v_fee_pct := v_inv.fee_pct;
    v_inv_fee := v_inv_gross * (v_fee_pct / 100);
    v_inv_net := v_inv_gross - v_inv_fee;

    -- Calculate IB commission if applicable
    v_ib_amount := 0;
    IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_pct > 0 THEN
      v_ib_amount := v_inv_net * (v_inv.ib_pct / 100);
    END IF;

    -- Generate reference ID
    v_ref_id := 'YLD-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || substr(v_inv.investor_id::text, 1, 8);

    -- Create yield distribution record
    INSERT INTO yield_distributions (
      fund_id, investor_id, effective_date, gross_yield, fee_amount, 
      net_yield, fee_percentage, purpose, is_month_end, recorded_aum,
      distribution_type, status, created_by, reference_id
    ) VALUES (
      p_fund_id, v_inv.investor_id, p_yield_date, v_inv_gross, v_inv_fee,
      v_inv_net, v_fee_pct, p_purpose::aum_purpose, v_is_month_end, v_inv.current_value,
      'daily', 'applied', p_actor_id, v_ref_id
    ) RETURNING id INTO v_dist_id;

    -- Create transaction for the yield
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, created_by, purpose, asset, source
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD'::tx_type, v_inv_net, p_yield_date, p_yield_date,
      v_ref_id, 'Daily yield distribution', p_actor_id, p_purpose::aum_purpose,
      v_fund.asset, 'yield_distribution'::tx_source
    );

    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_inv_net,
        updated_at = now()
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;

    -- Track totals
    v_total_distributed := v_total_distributed + v_inv_net;
    v_total_fees := v_total_fees + v_inv_fee;
    v_total_ib := v_total_ib + v_ib_amount;
    v_investor_count := v_investor_count + 1;
  END LOOP;

  -- Record new AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, source, created_by, purpose, is_month_end
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, 'yield_distribution', p_actor_id, p_purpose::aum_purpose, v_is_month_end
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'yield_date', p_yield_date,
    'previous_aum', v_prev_aum,
    'new_aum', p_new_aum,
    'yield_amount', v_yield_amount,
    'yield_percentage', v_yield_pct,
    'total_distributed', v_total_distributed,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib,
    'investor_count', v_investor_count,
    'is_month_end', v_is_month_end,
    'purpose', p_purpose
  );

  RETURN v_result;
END;
$$;