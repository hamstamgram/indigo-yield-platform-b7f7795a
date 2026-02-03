-- Fix apply_daily_yield_to_fund_v3 to use investor-specific fee rates
-- Drop all existing versions first

DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, text, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose, date, date);

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'reporting',
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_previous_aum numeric;
  v_new_aum numeric;
  v_gross_yield numeric;
  v_distribution_id uuid;
  v_pos RECORD;
  v_investor_share numeric;
  v_investor_gross numeric;
  v_fee_amount numeric;
  v_net_yield numeric;
  v_ib_amount numeric;
  v_total_distributed numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor_count integer := 0;
  v_reference_id text;
  v_actual_period_start date;
  v_actual_period_end date;
  v_aum_id uuid;
  v_existing_id uuid;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Get fund details
  SELECT id, code, asset INTO v_fund
  FROM public.funds WHERE id = p_fund_id;
  
  IF v_fund.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get previous AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_previous_aum
  FROM public.investor_positions WHERE fund_id = p_fund_id;

  IF v_previous_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No positions in fund');
  END IF;

  -- Calculate gross yield from percentage
  v_gross_yield := v_previous_aum * (p_gross_yield_pct / 100);
  v_new_aum := v_previous_aum + v_gross_yield;

  -- Determine period
  v_actual_period_end := COALESCE(p_period_end, p_yield_date);
  v_actual_period_start := COALESCE(p_period_start, date_trunc('month', p_yield_date)::date);

  -- Create distribution record
  v_reference_id := 'YIELD-' || v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);
  
  INSERT INTO public.yield_distributions (
    fund_id, effective_date, gross_yield, yield_percentage, 
    previous_aum, new_aum, purpose, reference_id, status,
    period_start, period_end, created_by
  ) VALUES (
    p_fund_id, p_yield_date, v_gross_yield, p_gross_yield_pct,
    v_previous_aum, v_new_aum, p_purpose, v_reference_id, 'applied',
    v_actual_period_start, v_actual_period_end, p_admin_id
  ) RETURNING id INTO v_distribution_id;

  -- Process each investor with their SPECIFIC fee rate
  FOR v_pos IN
    SELECT 
      ip.investor_id, 
      ip.current_value, 
      p.ib_parent_id, 
      p.ib_percentage,
      CASE 
        WHEN ip.investor_id = v_indigo_fees_id THEN 0
        ELSE COALESCE(
          (SELECT ifs.fee_pct FROM investor_fee_schedule ifs 
           WHERE ifs.investor_id = ip.investor_id 
             AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
             AND ifs.effective_date <= p_yield_date
             AND (ifs.end_date IS NULL OR ifs.end_date >= p_yield_date)
           ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
           LIMIT 1),
          COALESCE(p.fee_pct, 20)
        )
      END as fee_pct
    FROM public.investor_positions ip
    JOIN public.profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate investor's share of yield
    v_investor_share := v_pos.current_value / v_previous_aum;
    v_investor_gross := v_gross_yield * v_investor_share;
    
    -- Use investor-specific fee rate (already in percentage, e.g., 20 = 20%)
    v_fee_amount := v_investor_gross * (v_pos.fee_pct / 100);
    v_net_yield := v_investor_gross - v_fee_amount;

    -- Calculate IB commission if applicable
    v_ib_amount := 0;
    IF v_pos.ib_parent_id IS NOT NULL AND v_pos.ib_percentage > 0 THEN
      v_ib_amount := v_fee_amount * (v_pos.ib_percentage / 100);
    END IF;

    -- Create fee allocation with correct fee percentage
    IF v_fee_amount > 0 THEN
      INSERT INTO public.fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        base_net_income, fee_percentage, fee_amount,
        period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_pos.investor_id, v_indigo_fees_id,
        v_investor_gross, v_pos.fee_pct, v_fee_amount,
        v_actual_period_start, v_actual_period_end, p_purpose, p_admin_id
      );
      v_total_fees := v_total_fees + v_fee_amount;
    END IF;

    -- Create IB allocation if applicable
    IF v_ib_amount > 0 THEN
      INSERT INTO public.ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        source_net_income, ib_percentage, ib_fee_amount,
        effective_date, period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_pos.investor_id, v_pos.ib_parent_id,
        v_fee_amount, v_pos.ib_percentage, v_ib_amount,
        p_yield_date, v_actual_period_start, v_actual_period_end, p_purpose, p_admin_id
      );
      v_total_ib := v_total_ib + v_ib_amount;
    END IF;

    -- Update investor position
    UPDATE public.investor_positions
    SET current_value = current_value + v_net_yield,
        updated_at = now()
    WHERE investor_id = v_pos.investor_id AND fund_id = p_fund_id;

    v_total_distributed := v_total_distributed + v_net_yield;
    v_investor_count := v_investor_count + 1;
  END LOOP;

  -- Credit INDIGO FEES account with platform fees (total fees minus IB commissions)
  UPDATE public.investor_positions
  SET current_value = current_value + (v_total_fees - v_total_ib),
      updated_at = now()
  WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;

  -- Record new AUM using check-then-insert pattern (fix for partial index)
  SELECT id INTO v_existing_id
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE fund_daily_aum
    SET total_aum = v_new_aum, source = 'yield_distribution', updated_at = now()
    WHERE id = v_existing_id
    RETURNING id INTO v_aum_id;
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided)
    VALUES (p_fund_id, p_yield_date, v_new_aum, p_purpose, 'yield_distribution', false)
    RETURNING id INTO v_aum_id;
  END IF;

  -- Update distribution with totals
  UPDATE public.yield_distributions
  SET net_yield = v_total_distributed,
      total_fees = v_total_fees,
      total_ib_fees = v_total_ib,
      investor_count = v_investor_count,
      aum_record_id = v_aum_id
  WHERE id = v_distribution_id;

  -- Audit log
  INSERT INTO public.audit_log (action, entity, entity_id, meta, actor_user)
  VALUES ('YIELD_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund.code,
      'yield_date', p_yield_date,
      'gross_yield', v_gross_yield,
      'yield_pct', p_gross_yield_pct,
      'net_distributed', v_total_distributed,
      'total_fees', v_total_fees,
      'total_ib', v_total_ib,
      'investor_count', v_investor_count,
      'purpose', p_purpose
    ), p_admin_id);

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_code', v_fund.code,
    'yield_date', p_yield_date,
    'previous_aum', v_previous_aum,
    'new_aum', v_new_aum,
    'gross_yield', v_gross_yield,
    'yield_percentage', p_gross_yield_pct,
    'net_distributed', v_total_distributed,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib,
    'platform_fees', v_total_fees - v_total_ib,
    'investor_count', v_investor_count,
    'reference_id', v_reference_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3 TO authenticated;