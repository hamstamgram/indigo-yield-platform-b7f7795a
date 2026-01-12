-- Quick fix: Add recorded_aum to the INSERT
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
  v_fund_aum numeric; v_fund record; v_gross_yield_amount numeric; v_snapshot_id uuid;
  v_distribution_id uuid; v_period_id uuid; v_investor_count int := 0;
  v_total_net numeric := 0; v_total_fees numeric := 0; v_total_ib numeric := 0;
  v_investor record; v_fee_pct numeric; v_fee_amount numeric; v_ib_pct numeric;
  v_ib_amount numeric; v_net_yield numeric; v_investor_gross numeric;
  v_fees_account_id uuid; v_dust numeric; v_dust_receiver_id uuid;
  v_allocated_sum numeric; v_reference_id text; v_summary jsonb;
  v_distributions_arr jsonb := '[]'::jsonb; v_fund_asset text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('yield:' || p_fund_id::text), hashtext(p_yield_date::text));

  IF EXISTS (SELECT 1 FROM fund_daily_aum WHERE fund_id = p_fund_id AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Temporal lock active', 'code', 'TEMPORAL_LOCK');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  v_fund_asset := v_fund.asset;

  SELECT total_aum INTO v_fund_aum FROM fund_daily_aum 
  WHERE fund_id = p_fund_id AND aum_date = p_yield_date AND purpose = p_purpose AND is_voided = false 
  ORDER BY created_at DESC LIMIT 1;
  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found'); 
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fees account not found');
  END IF;

  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);
  v_reference_id := 'YIELD-' || v_fund.code || '-' || to_char(p_yield_date, 'YYYYMMDD');

  INSERT INTO fund_yield_snapshots (fund_id, snapshot_date, period_start, period_end, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount, days_in_period, trigger_type, created_by)
  VALUES (p_fund_id, p_yield_date, p_yield_date, p_yield_date, v_fund_aum, v_fund_aum + v_gross_yield_amount, p_gross_yield_pct, v_gross_yield_amount, 1, 'manual', p_created_by)
  RETURNING id INTO v_snapshot_id;

  FOR v_investor IN 
    SELECT ip.investor_id, ip.current_value as balance, 
           CASE WHEN v_fund_aum > 0 THEN (ip.current_value / v_fund_aum) * 100 ELSE 0 END as ownership_pct, 
           p.ib_percentage, p.ib_parent_id, COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'') as investor_name, p.fee_pct as profile_fee_pct
    FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id 
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 ORDER BY ip.current_value DESC
  LOOP
    IF v_dust_receiver_id IS NULL THEN v_dust_receiver_id := v_investor.investor_id; END IF;
    
    v_fee_pct := COALESCE(v_investor.profile_fee_pct, 20);
    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);
    v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_amount := v_investor_gross * (v_ib_pct / 100);
    v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;

    INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, reference_id, notes, created_by, purpose, is_system_generated)
    VALUES (p_fund_id, v_investor.investor_id, 'YIELD', v_net_yield, p_yield_date, v_fund_asset, v_reference_id || '-' || v_investor.investor_id, 'Net yield', p_created_by, p_purpose, true);

    IF v_fee_amount > 0 THEN
      INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, reference_id, notes, created_by, purpose, is_system_generated)
      VALUES (p_fund_id, v_fees_account_id, 'FEE', v_fee_amount, p_yield_date, v_fund_asset, 'FEE-' || v_reference_id || '-' || v_investor.investor_id, 'Platform fee', p_created_by, p_purpose, true);
    END IF;

    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, reference_id, notes, created_by, purpose, is_system_generated)
      VALUES (p_fund_id, v_investor.ib_parent_id, 'IB_CREDIT', v_ib_amount, p_yield_date, v_fund_asset, 'IB-' || v_reference_id, 'IB commission', p_created_by, p_purpose, true);
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net_yield, cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield, last_yield_crystallization_date = p_yield_date, updated_at = now()
    WHERE fund_id = p_fund_id AND investor_id = v_investor.investor_id;

    v_investor_count := v_investor_count + 1;
    v_total_net := v_total_net + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
    v_total_ib := v_total_ib + v_ib_amount;
  END LOOP;

  IF v_investor_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No investors'); END IF;

  v_dust := v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib);

  -- Insert with recorded_aum and previous_aum
  INSERT INTO yield_distributions (fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum, opening_aum, closing_aum, gross_yield, net_yield, total_fees, total_ib, yield_percentage, investor_count, period_start, period_end, reference_id, dust_amount, dust_receiver_id, status, created_by)
  VALUES (p_fund_id, p_yield_date, p_purpose, false, v_fund_aum + v_gross_yield_amount, v_fund_aum, v_fund_aum, v_fund_aum + v_gross_yield_amount, v_gross_yield_amount, v_total_net, v_total_fees, v_total_ib, p_gross_yield_pct, v_investor_count, p_yield_date, p_yield_date, v_reference_id, v_dust, v_dust_receiver_id, 'applied', p_created_by)
  RETURNING id INTO v_distribution_id;

  INSERT INTO fee_allocations (distribution_id, fund_id, investor_id, fees_account_id, base_net_income, fee_percentage, fee_amount, period_start, period_end, purpose, created_by)
  SELECT v_distribution_id, p_fund_id, ip.investor_id, v_fees_account_id, v_gross_yield_amount * (ip.current_value / v_fund_aum), COALESCE(p.fee_pct, 20), v_gross_yield_amount * (ip.current_value / v_fund_aum) * (COALESCE(p.fee_pct, 20) / 100), p_yield_date, p_yield_date, p_purpose, p_created_by
  FROM investor_positions ip JOIN profiles p ON p.id = ip.investor_id WHERE ip.fund_id = p_fund_id AND ip.current_value > 0;

  RETURN jsonb_build_object('success', true, 'distribution_id', v_distribution_id, 'gross_yield', v_gross_yield_amount, 'net_yield', v_total_net, 'total_fees', v_total_fees, 'investor_count', v_investor_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$function$;