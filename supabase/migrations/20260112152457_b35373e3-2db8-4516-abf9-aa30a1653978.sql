-- Fix apply_daily_yield_to_fund_v3 - use 'notes' instead of 'description'
-- Also need to check fee_allocations schema

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid, 
  p_yield_date date, 
  p_gross_yield_pct numeric, 
  p_created_by uuid DEFAULT NULL::uuid, 
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric;
  v_fund record;
  v_gross_yield_amount numeric;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_period_id uuid;
  v_investor_count int := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor record;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_net_yield numeric;
  v_investor_gross numeric;
  v_fees_account_id uuid;
  v_dust numeric;
  v_dust_receiver_id uuid;
  v_allocated_sum numeric;
  v_reference_id text;
  v_summary jsonb;
  v_distributions_arr jsonb := '[]'::jsonb;
  v_fund_asset text;
BEGIN
  -- ===== ADVISORY LOCK: Prevent concurrent yield distributions =====
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  -- Temporal lock check
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id 
      AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE 
      AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal violation: AUM for ' || p_yield_date || ' was recorded today.', 'code', 'TEMPORAL_LOCK');
  END IF;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); 
  END IF;
  v_fund_asset := v_fund.asset;

  -- Get AUM for the date
  SELECT total_aum INTO v_fund_aum 
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date = p_yield_date 
    AND purpose = p_purpose 
    AND is_voided = false 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for date ' || p_yield_date); 
  END IF;

  -- Get fees account
  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INDIGO Fees account not found. Please create a fees_account first.');
  END IF;

  -- Calculate gross yield
  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);

  -- Create fund yield snapshot
  INSERT INTO fund_yield_snapshots (
    fund_id, snapshot_date, period_start, period_end, 
    opening_aum, closing_aum, gross_yield_pct, gross_yield_amount, 
    days_in_period, trigger_type, trigger_reference, created_by
  )
  VALUES (
    p_fund_id, p_yield_date, p_yield_date, p_yield_date, 
    v_fund_aum, v_fund_aum + v_gross_yield_amount, p_gross_yield_pct, v_gross_yield_amount, 
    1, 'manual', 'Daily yield application', p_created_by
  ) 
  RETURNING id INTO v_snapshot_id;

  -- Get period ID
  SELECT id INTO v_period_id 
  FROM statement_periods sp 
  WHERE p_yield_date BETWEEN make_date(sp.year, sp.month, 1) AND sp.period_end_date 
  LIMIT 1;

  -- Generate reference ID
  v_reference_id := 'YIELD-' || v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD');

  -- Process each investor
  FOR v_investor IN 
    SELECT 
      ip.investor_id, 
      ip.current_value as balance, 
      CASE WHEN v_fund_aum > 0 THEN (ip.current_value / v_fund_aum) * 100 ELSE 0 END as ownership_pct, 
      p.ib_percentage, 
      p.ib_parent_id,
      COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor_name,
      p.fee_pct as profile_fee_pct
    FROM investor_positions ip 
    JOIN profiles p ON p.id = ip.investor_id 
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 
    ORDER BY ip.current_value DESC, ip.investor_id ASC
  LOOP
    -- Set dust receiver to first (largest) investor
    IF v_dust_receiver_id IS NULL THEN 
      v_dust_receiver_id := v_investor.investor_id; 
    END IF;
    
    -- Get fee percentage (from schedule, profile, or global default)
    SELECT COALESCE(
      (SELECT fee_pct FROM investor_fee_schedule 
       WHERE investor_id = v_investor.investor_id 
         AND (fund_id = p_fund_id OR fund_id IS NULL) 
         AND effective_date <= p_yield_date 
         AND (end_date IS NULL OR end_date >= p_yield_date) 
       ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
      v_investor.profile_fee_pct,
      (SELECT value FROM global_fee_settings WHERE setting_key = 'default_fee_pct'),
      20
    ) INTO v_fee_pct;
    
    -- Calculate amounts
    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);
    v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_amount := v_investor_gross * (v_ib_pct / 100);
    v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;

    -- Create YIELD transaction for investor (use 'notes' instead of 'description')
    INSERT INTO transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, purpose, is_system_generated
    ) VALUES (
      p_fund_id, v_investor.investor_id, 'YIELD', v_net_yield, p_yield_date, v_fund_asset,
      v_reference_id || '-' || v_investor.investor_id, 
      'Net yield for ' || to_char(p_yield_date, 'Mon DD, YYYY'),
      p_created_by, p_purpose, true
    );

    -- Create FEE transaction (credit to fees account)
    IF v_fee_amount > 0 THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated
      ) VALUES (
        p_fund_id, v_fees_account_id, 'FEE', v_fee_amount, p_yield_date, v_fund_asset,
        'FEE-' || v_reference_id || '-' || v_investor.investor_id, 
        'Platform fee from ' || v_investor.investor_name,
        p_created_by, p_purpose, true
      );
    END IF;

    -- Create IB_CREDIT transaction if applicable
    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, purpose, is_system_generated
      ) VALUES (
        p_fund_id, v_investor.ib_parent_id, 'IB_CREDIT', v_ib_amount, p_yield_date, v_fund_asset,
        'IB-' || v_reference_id || '-' || v_investor.investor_id, 
        'IB commission from ' || v_investor.investor_name,
        p_created_by, p_purpose, true
      );
    END IF;

    -- Update investor position
    UPDATE investor_positions 
    SET current_value = current_value + v_net_yield,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
        last_yield_crystallization_date = p_yield_date,
        updated_at = now()
    WHERE fund_id = p_fund_id AND investor_id = v_investor.investor_id;

    -- Track totals
    v_investor_count := v_investor_count + 1;
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;

    -- Add to distributions array for summary
    v_distributions_arr := v_distributions_arr || jsonb_build_object(
      'investor_id', v_investor.investor_id,
      'investor_name', v_investor.investor_name,
      'gross_yield', v_investor_gross,
      'fee_pct', v_fee_pct,
      'fee_amount', v_fee_amount,
      'ib_pct', v_ib_pct,
      'ib_amount', v_ib_amount,
      'net_yield', v_net_yield
    );
  END LOOP;

  -- Check if any investors were processed
  IF v_investor_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active investor positions found in fund');
  END IF;

  -- Calculate dust (rounding difference)
  v_allocated_sum := v_total_net + v_total_fees + v_total_ib;
  v_dust := v_gross_yield_amount - v_allocated_sum;

  -- Apply dust to largest investor if significant
  IF ABS(v_dust) > 0.000001 AND v_dust_receiver_id IS NOT NULL THEN
    UPDATE investor_positions 
    SET current_value = current_value + v_dust,
        updated_at = now()
    WHERE fund_id = p_fund_id AND investor_id = v_dust_receiver_id;
    
    v_total_net := v_total_net + v_dust;
  END IF;

  -- Build summary
  v_summary := jsonb_build_object(
    'investor_count', v_investor_count,
    'distributions', v_distributions_arr
  );

  -- Create the yield_distribution record (matching actual schema)
  INSERT INTO yield_distributions (
    fund_id, effective_date, purpose, is_month_end,
    opening_aum, closing_aum, gross_yield, net_yield,
    total_fees, total_ib, yield_percentage, investor_count,
    period_start, period_end, reference_id, dust_amount, dust_receiver_id,
    status, created_by, summary_json
  ) VALUES (
    p_fund_id, p_yield_date, p_purpose, false,
    v_fund_aum, v_fund_aum + v_gross_yield_amount, v_gross_yield_amount, v_total_net,
    v_total_fees, v_total_ib, p_gross_yield_pct, v_investor_count,
    p_yield_date, p_yield_date, v_reference_id, v_dust, v_dust_receiver_id,
    'applied', p_created_by, v_summary
  ) RETURNING id INTO v_distribution_id;

  -- Create fee_allocations records
  FOR v_investor IN 
    SELECT 
      ip.investor_id,
      ip.current_value as balance
    FROM investor_positions ip 
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Get the investor's fee percentage again for the allocation record
    SELECT COALESCE(
      (SELECT fee_pct FROM investor_fee_schedule 
       WHERE investor_id = v_investor.investor_id 
         AND (fund_id = p_fund_id OR fund_id IS NULL) 
         AND effective_date <= p_yield_date 
         AND (end_date IS NULL OR end_date >= p_yield_date) 
       ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
      (SELECT fee_pct FROM profiles WHERE id = v_investor.investor_id),
      (SELECT value FROM global_fee_settings WHERE setting_key = 'default_fee_pct'),
      20
    ) INTO v_fee_pct;
    
    v_investor_gross := v_gross_yield_amount * (v_investor.balance / v_fund_aum);
    v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    
    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      base_net_income, fee_percentage, fee_amount,
      period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
      v_investor_gross, v_fee_pct, v_fee_amount,
      p_yield_date, p_yield_date, p_purpose, p_created_by
    );
  END LOOP;

  -- Update fund AUM with new closing value
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, source, purpose, created_by
  ) VALUES (
    p_fund_id, p_yield_date, v_fund_aum + v_gross_yield_amount, 
    'YIELD_DISTRIBUTION', p_purpose, p_created_by
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = EXCLUDED.source,
    updated_at = now(),
    updated_by = p_created_by;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'snapshot_id', v_snapshot_id,
    'fund_id', p_fund_id,
    'yield_date', p_yield_date,
    'opening_aum', v_fund_aum,
    'closing_aum', v_fund_aum + v_gross_yield_amount,
    'gross_yield', v_gross_yield_amount,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'investor_count', v_investor_count,
    'dust', v_dust
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$function$;