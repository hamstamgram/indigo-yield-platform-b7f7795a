-- Fix all invalid column and enum references across database functions

-- ============================================================================
-- FIX 1: adjust_investor_position (8-param version) - remove created_at
-- ============================================================================
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text,
  p_admin_id uuid,
  p_tx_type text,
  p_tx_date date,
  p_reference_id text DEFAULT NULL
)
RETURNS TABLE (
  out_success boolean,
  out_message text,
  out_transaction_id uuid,
  out_old_balance numeric,
  out_new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_transaction_id uuid;
  v_fund_class text;
  v_fund_asset text;
BEGIN
  -- Get fund details
  SELECT fund_class, asset INTO v_fund_class, v_fund_asset
  FROM public.funds
  WHERE id = p_fund_id;

  IF v_fund_class IS NULL THEN
    RETURN QUERY SELECT false, 'Fund not found'::text, NULL::uuid, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  -- Get current balance
  SELECT COALESCE(current_value, 0) INTO v_old_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_old_balance IS NULL THEN
    v_old_balance := 0;
  END IF;

  v_new_balance := v_old_balance + p_delta;

  -- Prevent negative balance for withdrawals
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT false, 'Insufficient balance'::text, NULL::uuid, v_old_balance, v_new_balance;
    RETURN;
  END IF;

  -- Create transaction record
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, fund_class, asset, tx_date, value_date,
    type, amount, balance_before, balance_after,
    notes, created_by, source, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, v_fund_class, v_fund_asset, p_tx_date, p_tx_date,
    p_tx_type::tx_type, ABS(p_delta), v_old_balance, v_new_balance,
    p_note, p_admin_id, 'manual_admin'::tx_source, p_reference_id
  )
  RETURNING id INTO v_transaction_id;

  -- Upsert position - FIXED: removed created_at, using valid columns only
  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class,
    updated_at, last_transaction_date
  ) VALUES (
    p_investor_id, p_fund_id, v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class,
    NOW(), p_tx_date
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = CASE 
      WHEN p_delta > 0 THEN investor_positions.cost_basis + p_delta 
      ELSE investor_positions.cost_basis 
    END,
    updated_at = NOW(),
    last_transaction_date = p_tx_date;

  RETURN QUERY SELECT true, 'Position adjusted successfully'::text, v_transaction_id, v_old_balance, v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;

-- ============================================================================
-- FIX 2: apply_daily_yield_to_fund_v3 - fix invalid enum values
-- ============================================================================
-- Update tx_source from 'yield_distribution_v3' to 'yield_distribution'
-- Update tx_type from 'IB_COMMISSION' to 'IB_CREDIT'

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_distribution_id uuid;
  v_fund_class text;
  v_fund_asset text;
  v_mgmt_fee_bps integer;
  v_perf_fee_bps integer;
  v_total_aum numeric := 0;
  v_investor_count integer := 0;
  v_total_gross_yield numeric := 0;
  v_total_net_yield numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_pos record;
  v_gross_yield numeric;
  v_fee_amount numeric;
  v_net_yield numeric;
  v_ib_investor_id uuid;
  v_ib_percentage numeric;
  v_ib_amount numeric;
  v_investor_net_after_ib numeric;
  v_tx_id uuid;
  v_actual_period_start date;
  v_actual_period_end date;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Set period dates
  v_actual_period_start := COALESCE(p_period_start, p_yield_date);
  v_actual_period_end := COALESCE(p_period_end, p_yield_date);

  -- Get fund details
  SELECT fund_class, asset, mgmt_fee_bps, perf_fee_bps
  INTO v_fund_class, v_fund_asset, v_mgmt_fee_bps, v_perf_fee_bps
  FROM public.funds
  WHERE id = p_fund_id;

  IF v_fund_class IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Create distribution record
  INSERT INTO public.yield_distributions (
    fund_id, distribution_date, gross_yield_pct, purpose,
    period_start, period_end, created_by, status
  ) VALUES (
    p_fund_id, p_yield_date, p_gross_yield_pct, p_purpose,
    v_actual_period_start, v_actual_period_end, p_admin_id, 'completed'
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor position
  FOR v_pos IN
    SELECT ip.investor_id, ip.current_value, p.introducing_broker_id, p.ib_fee_percentage
    FROM public.investor_positions ip
    JOIN public.profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;
    v_total_aum := v_total_aum + v_pos.current_value;

    -- Calculate gross yield
    v_gross_yield := v_pos.current_value * (p_gross_yield_pct / 100);
    v_total_gross_yield := v_total_gross_yield + v_gross_yield;

    -- Calculate fee (using perf_fee_bps on yield)
    v_fee_amount := v_gross_yield * (COALESCE(v_perf_fee_bps, 0) / 10000.0);
    v_total_fees := v_total_fees + v_fee_amount;

    v_net_yield := v_gross_yield - v_fee_amount;
    v_total_net_yield := v_total_net_yield + v_net_yield;

    -- Create fee allocation record
    INSERT INTO public.fee_allocations (
      distribution_id, fund_id, investor_id, purpose,
      period_start, period_end, base_net_income, fee_percentage, fee_amount,
      fees_account_id, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, v_pos.investor_id, p_purpose,
      v_actual_period_start, v_actual_period_end, v_gross_yield,
      COALESCE(v_perf_fee_bps, 0) / 100.0, v_fee_amount,
      v_fees_account_id, p_admin_id
    );

    -- Handle IB allocation if applicable
    v_ib_investor_id := v_pos.introducing_broker_id;
    v_ib_percentage := COALESCE(v_pos.ib_fee_percentage, 0);
    
    IF v_ib_investor_id IS NOT NULL AND v_ib_percentage > 0 THEN
      v_ib_amount := v_net_yield * (v_ib_percentage / 100);
      v_total_ib := v_total_ib + v_ib_amount;
      v_investor_net_after_ib := v_net_yield - v_ib_amount;

      -- Create IB allocation record
      INSERT INTO public.ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        source_net_income, ib_percentage, ib_fee_amount, effective_date,
        purpose, period_start, period_end, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_pos.investor_id, v_ib_investor_id,
        v_net_yield, v_ib_percentage, v_ib_amount, p_yield_date,
        p_purpose, v_actual_period_start, v_actual_period_end, p_admin_id
      );

      -- Create IB credit transaction - FIXED: use 'IB_CREDIT' not 'IB_COMMISSION'
      INSERT INTO public.transactions_v2 (
        investor_id, fund_id, fund_class, asset, tx_date, value_date,
        type, amount, notes, created_by, source, distribution_id, purpose
      ) VALUES (
        v_ib_investor_id, p_fund_id, v_fund_class, v_fund_asset, p_yield_date, p_yield_date,
        'IB_CREDIT'::tx_type, v_ib_amount,
        'IB commission from yield distribution',
        p_admin_id, 'yield_distribution'::tx_source, v_distribution_id, p_purpose
      );

      -- Update IB position
      UPDATE public.investor_positions
      SET current_value = current_value + v_ib_amount,
          cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_ib_amount,
          updated_at = NOW()
      WHERE investor_id = v_ib_investor_id AND fund_id = p_fund_id;
    ELSE
      v_investor_net_after_ib := v_net_yield;
    END IF;

    -- Create yield transaction for investor - FIXED: use 'yield_distribution' not 'yield_distribution_v3'
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, fund_class, asset, tx_date, value_date,
      type, amount, balance_before, balance_after,
      notes, created_by, source, distribution_id, purpose
    ) VALUES (
      v_pos.investor_id, p_fund_id, v_fund_class, v_fund_asset, p_yield_date, p_yield_date,
      'YIELD'::tx_type, v_investor_net_after_ib, v_pos.current_value, v_pos.current_value + v_investor_net_after_ib,
      'Net yield after fees and IB',
      p_admin_id, 'yield_distribution'::tx_source, v_distribution_id, p_purpose
    )
    RETURNING id INTO v_tx_id;

    -- Update investor position
    UPDATE public.investor_positions
    SET current_value = current_value + v_investor_net_after_ib,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_investor_net_after_ib,
        last_yield_crystallization_date = p_yield_date,
        updated_at = NOW()
    WHERE investor_id = v_pos.investor_id AND fund_id = p_fund_id;
  END LOOP;

  -- Update distribution with totals
  UPDATE public.yield_distributions
  SET total_aum = v_total_aum,
      investor_count = v_investor_count,
      total_gross_yield = v_total_gross_yield,
      total_fees = v_total_fees,
      total_ib = v_total_ib,
      total_net_yield = v_total_net_yield
  WHERE id = v_distribution_id;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investor_count', v_investor_count,
    'total_aum', v_total_aum,
    'total_gross_yield', v_total_gross_yield,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'total_net_yield', v_total_net_yield
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose, date, date) TO authenticated;

-- ============================================================================
-- FIX 3: apply_yield_correction_v2 - fix invalid tx_source enum
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(
  p_fund_id uuid,
  p_correction_date date,
  p_correction_pct numeric,
  p_reason text,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correction_id uuid;
  v_fund_class text;
  v_fund_asset text;
  v_total_correction numeric := 0;
  v_investor_count integer := 0;
  v_pos record;
  v_correction_amount numeric;
  v_actual_period_start date;
  v_actual_period_end date;
BEGIN
  v_actual_period_start := COALESCE(p_period_start, p_correction_date);
  v_actual_period_end := COALESCE(p_period_end, p_correction_date);

  -- Get fund details
  SELECT fund_class, asset INTO v_fund_class, v_fund_asset
  FROM public.funds WHERE id = p_fund_id;

  IF v_fund_class IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Create correction run record
  INSERT INTO public.correction_runs (
    fund_id, period_start, period_end, purpose,
    reason, status, input_hash, created_by,
    old_aum, new_aum, delta_aum
  ) VALUES (
    p_fund_id, v_actual_period_start, v_actual_period_end, p_purpose,
    p_reason, 'applied', md5(p_correction_pct::text || p_correction_date::text), p_admin_id,
    0, 0, 0
  )
  RETURNING id INTO v_correction_id;

  -- Process each investor
  FOR v_pos IN
    SELECT investor_id, current_value
    FROM public.investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;
    v_correction_amount := v_pos.current_value * (p_correction_pct / 100);
    v_total_correction := v_total_correction + v_correction_amount;

    -- Create correction transaction - FIXED: use 'yield_correction' not 'yield_correction_v2'
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, fund_class, asset, tx_date, value_date,
      type, amount, balance_before, balance_after,
      notes, created_by, source, correction_id, purpose
    ) VALUES (
      v_pos.investor_id, p_fund_id, v_fund_class, v_fund_asset, p_correction_date, p_correction_date,
      'ADJUSTMENT'::tx_type, v_correction_amount, v_pos.current_value, v_pos.current_value + v_correction_amount,
      'Yield correction: ' || p_reason,
      p_admin_id, 'yield_correction'::tx_source, v_correction_id, p_purpose
    );

    -- Update position
    UPDATE public.investor_positions
    SET current_value = current_value + v_correction_amount,
        updated_at = NOW()
    WHERE investor_id = v_pos.investor_id AND fund_id = p_fund_id;
  END LOOP;

  -- Update correction run with totals
  UPDATE public.correction_runs
  SET investors_affected = v_investor_count,
      delta_aum = v_total_correction,
      status = 'completed'
  WHERE id = v_correction_id;

  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_id,
    'investor_count', v_investor_count,
    'total_correction', v_total_correction
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_yield_correction_v2(uuid, date, numeric, text, uuid, aum_purpose, date, date) TO authenticated;