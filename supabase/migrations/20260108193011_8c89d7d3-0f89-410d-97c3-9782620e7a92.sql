-- Fix apply_daily_yield_to_fund_v3: correct all column mismatches
-- 1. yield_distributions: is_voided -> voided_at IS NULL
-- 2. transactions_v2: tx_type -> type
-- 3. transactions_v2: effective_date -> tx_date, value_date
-- 4. transactions_v2: add required asset and source columns

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
  v_distribution_id UUID;
  v_inv RECORD;
  v_inv_net NUMERIC;
  v_fee_amount NUMERIC;
  v_ib_amount NUMERIC;
  v_ref_id TEXT;
  v_total_distributed NUMERIC := 0;
  v_investor_count INT := 0;
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
    AND purpose = p_purpose::aum_purpose
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_prev_aum IS NULL THEN
    v_prev_aum := 0;
  END IF;

  -- Calculate yield
  v_yield_amount := p_new_aum - v_prev_aum;
  v_yield_pct := CASE WHEN v_prev_aum > 0 THEN (v_yield_amount / v_prev_aum) * 100 ELSE 0 END;

  -- Check for existing distribution (use voided_at IS NULL, not is_voided)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date = p_yield_date
      AND purpose = p_purpose::aum_purpose
      AND voided_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution already exists for this date');
  END IF;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id, effective_date, gross_yield, yield_percentage,
    purpose, distribution_type, status, created_by,
    is_month_end, recorded_aum
  ) VALUES (
    p_fund_id, p_yield_date, v_yield_amount, v_yield_pct,
    p_purpose::aum_purpose, 'daily', 'applied', p_actor_id,
    (p_purpose = 'reporting'), p_new_aum
  )
  RETURNING id INTO v_distribution_id;

  -- Record AUM event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, NOW(), 'yield', v_distribution_id::TEXT,
    v_prev_aum, p_new_aum, p_purpose::aum_purpose, p_actor_id
  );

  -- Process each investor with position in this fund
  FOR v_inv IN
    SELECT
      ip.investor_id,
      ip.current_balance,
      COALESCE(ifs.fee_pct, 0.20) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_commission_pct, 0) as ib_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND ifs.fund_id = p_fund_id
      AND ifs.effective_date <= p_yield_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
    WHERE ip.fund_id = p_fund_id
      AND ip.current_balance > 0
  LOOP
    -- Calculate investor's share of yield
    v_inv_net := (v_inv.current_balance / v_prev_aum) * v_yield_amount;
    v_fee_amount := v_inv_net * v_inv.fee_pct;
    v_inv_net := v_inv_net - v_fee_amount;

    -- Generate reference ID
    v_ref_id := 'YLD-' || TO_CHAR(p_yield_date, 'YYYYMMDD') || '-' || SUBSTR(v_inv.investor_id::TEXT, 1, 8);

    -- Create transaction (use correct column names: type, tx_date, value_date, asset, source)
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, created_by, purpose, asset, source
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD'::tx_type, v_inv_net, p_yield_date, p_yield_date,
      v_ref_id, 'Daily yield distribution', p_actor_id, p_purpose::aum_purpose,
      v_fund.asset, 'yield_distribution'::tx_source
    );

    -- Create fee allocation
    INSERT INTO fee_allocations (
      distribution_id, investor_id, fund_id, fee_amount, fee_percentage,
      base_net_income, period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, v_inv.investor_id, p_fund_id, v_fee_amount, v_inv.fee_pct,
      v_inv_net + v_fee_amount, p_yield_date, p_yield_date, p_purpose::aum_purpose, p_actor_id
    );

    -- Handle IB commission if applicable
    IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_pct > 0 THEN
      v_ib_amount := v_fee_amount * v_inv.ib_pct;

      INSERT INTO ib_allocations (
        distribution_id, source_investor_id, ib_investor_id, fund_id,
        source_net_income, ib_percentage, ib_fee_amount, purpose, created_by,
        effective_date
      ) VALUES (
        v_distribution_id, v_inv.investor_id, v_inv.ib_parent_id, p_fund_id,
        v_inv_net + v_fee_amount, v_inv.ib_pct, v_ib_amount, p_purpose::aum_purpose, p_actor_id,
        p_yield_date
      );
    END IF;

    -- Update investor position
    UPDATE investor_positions
    SET current_balance = current_balance + v_inv_net,
        updated_at = NOW()
    WHERE investor_id = v_inv.investor_id
      AND fund_id = p_fund_id;

    v_total_distributed := v_total_distributed + v_inv_net;
    v_investor_count := v_investor_count + 1;
  END LOOP;

  -- Update fund daily AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, source, created_by
  ) VALUES (
    p_fund_id, p_yield_date, p_new_aum, p_purpose::aum_purpose, 'yield_distribution', p_actor_id
  )
  ON CONFLICT (fund_id, aum_date, purpose)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'yield_amount', v_yield_amount,
    'yield_pct', v_yield_pct,
    'investor_count', v_investor_count,
    'total_distributed', v_total_distributed
  );
END;
$$;