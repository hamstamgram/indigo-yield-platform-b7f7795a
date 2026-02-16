
-- Fix 1: CRITICAL - Remove fees_account exclusion from preview_segmented_yield_distribution_v5 output loop
-- Fix 2: MEDIUM - Fix run_integrity_pack column name (variance -> drift)

-- First, let's fix the preview RPC by replacing the function
-- We need to get the current function definition and modify it
-- The key change: remove "AND t.investor_id != v_fees_account_id" from the final output loop

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_fund RECORD;
  v_fees_account_id uuid;
  v_period_start date;
  v_opening_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_total_gross numeric(28,10) := 0;
  v_total_net numeric(28,10) := 0;
  v_total_fees numeric(28,10) := 0;
  v_total_ib numeric(28,10) := 0;
  v_dust numeric(28,10) := 0;
  v_investor_count integer := 0;
  v_segment_count integer := 0;
  v_segments jsonb := '[]'::jsonb;
  v_allocations jsonb := '[]'::jsonb;
  v_crystal_dates date[];
  v_seg_start date;
  v_seg_end date;
  v_seg_days integer;
  v_total_days integer;
  v_seg_yield numeric(28,10);
  v_seg_opening numeric(28,10);
  v_seg_total_balance numeric(28,10);
  v_inv RECORD;
  v_fee_pct numeric(28,10);
  v_ib_pct numeric(28,10);
  v_ib_parent uuid;
  v_inv_gross numeric(28,10);
  v_inv_fee numeric(28,10);
  v_inv_net numeric(28,10);
  v_inv_ib numeric(28,10);
  v_inv_share numeric(28,10);
  v_crystal_count integer := 0;
  v_conservation_check boolean := true;
  v_result jsonb;
BEGIN
  -- Validate inputs
  IF p_fund_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund ID is required');
  END IF;
  
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be positive');
  END IF;

  -- Get fund info
  SELECT id, code, asset, name, perf_fee_bps
  INTO v_fund
  FROM funds
  WHERE id = p_fund_id AND status = 'active';
  
  IF v_fund.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found or inactive');
  END IF;

  -- Get fees account
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;

  -- Determine period start from last distribution or fund inception
  SELECT COALESCE(
    (SELECT MAX(yd.period_end) + 1
     FROM yield_distributions yd
     WHERE yd.fund_id = p_fund_id
       AND yd.is_voided = false
       AND yd.status IN ('applied', 'corrected')
       AND yd.purpose = p_purpose),
    (SELECT f.inception_date FROM funds f WHERE f.id = p_fund_id)
  ) INTO v_period_start;

  -- Calculate total days
  v_total_days := (p_period_end - v_period_start) + 1;
  IF v_total_days <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 
      format('Invalid period: %s to %s (%s days)', v_period_start, p_period_end, v_total_days));
  END IF;

  -- Get opening AUM (sum of ALL positions including fees_account and IB)
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND ip.current_value > 0;

  IF v_opening_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active positions found for this fund');
  END IF;

  -- Calculate gross yield
  v_gross_yield := p_recorded_aum - v_opening_aum;

  -- Get crystallization dates within the period
  SELECT ARRAY_AGG(DISTINCT event_date ORDER BY event_date)
  INTO v_crystal_dates
  FROM investor_yield_events iye
  WHERE iye.fund_id = p_fund_id
    AND iye.event_date > v_period_start
    AND iye.event_date <= p_period_end
    AND iye.is_voided = false
    AND iye.trigger_type IN ('crystallization', 'deposit_crystal', 'withdrawal_crystal');

  v_crystal_count := COALESCE(array_length(v_crystal_dates, 1), 0);

  -- Build segment boundaries
  -- If no crystals, single segment for entire period
  -- If crystals exist, split into segments around crystal dates
  
  -- Create temp table for per-investor running totals
  CREATE TEMP TABLE IF NOT EXISTS _preview_investor_totals (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    account_type account_type,
    total_gross numeric(28,10) DEFAULT 0,
    total_fee numeric(28,10) DEFAULT 0,
    total_net numeric(28,10) DEFAULT 0,
    total_ib numeric(28,10) DEFAULT 0,
    fee_pct numeric(28,10) DEFAULT 0,
    ib_parent_id uuid,
    ib_rate numeric(28,10) DEFAULT 0,
    segments jsonb DEFAULT '[]'::jsonb
  );
  TRUNCATE _preview_investor_totals;

  -- Process segments
  v_seg_start := v_period_start;
  
  FOR i IN 0..v_crystal_count LOOP
    IF i < v_crystal_count THEN
      v_seg_end := v_crystal_dates[i + 1];
    ELSE
      v_seg_end := p_period_end;
    END IF;
    
    v_seg_days := (v_seg_end - v_seg_start) + 1;
    IF v_seg_days <= 0 THEN
      v_seg_start := v_seg_end + 1;
      CONTINUE;
    END IF;

    v_segment_count := v_segment_count + 1;
    
    -- Calculate segment yield proportionally
    v_seg_yield := ROUND((v_gross_yield * v_seg_days::numeric / v_total_days::numeric)::numeric, 8);
    
    -- Get total balance for this segment (all active positions)
    SELECT COALESCE(SUM(ip.current_value), 0)
    INTO v_seg_total_balance
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND ip.current_value > 0;

    -- Skip segment if no yield or no balance
    IF v_seg_yield <= 0 OR v_seg_total_balance <= 0 THEN
      v_segments := v_segments || jsonb_build_object(
        'segment', v_segment_count,
        'start', v_seg_start,
        'end', v_seg_end,
        'days', v_seg_days,
        'yield', v_seg_yield,
        'skipped', true
      );
      v_seg_start := v_seg_end + 1;
      CONTINUE;
    END IF;

    v_segments := v_segments || jsonb_build_object(
      'segment', v_segment_count,
      'start', v_seg_start,
      'end', v_seg_end,
      'days', v_seg_days,
      'yield', ROUND(v_seg_yield, 8),
      'total_balance', ROUND(v_seg_total_balance, 8),
      'skipped', false
    );

    -- Allocate yield to each investor in this segment
    FOR v_inv IN
      SELECT ip.investor_id, 
             COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
             p.account_type,
             ip.current_value as balance,
             p.ib_parent_id,
             p.ib_percentage
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id
        AND ip.is_active = true
        AND ip.current_value > 0
    LOOP
      -- Calculate share
      v_inv_share := ROUND((v_inv.balance / v_seg_total_balance)::numeric, 10);
      v_inv_gross := ROUND((v_seg_yield * v_inv_share)::numeric, 8);
      
      -- Determine fee percentage (fees_account pays 0% fee)
      IF v_inv.account_type = 'fees_account' THEN
        v_fee_pct := 0;
      ELSE
        -- Use fee hierarchy: investor override > schedule > fund default
        SELECT COALESCE(
          (SELECT fee_pct FROM investor_fee_schedule 
           WHERE investor_id = v_inv.investor_id 
             AND (fund_id = p_fund_id OR fund_id IS NULL)
             AND effective_date <= p_period_end
             AND (end_date IS NULL OR end_date >= p_period_end)
           ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
          (SELECT p2.fee_pct FROM profiles p2 WHERE p2.id = v_inv.investor_id),
          COALESCE(v_fund.perf_fee_bps::numeric / 100.0, 20.0)
        ) INTO v_fee_pct;
      END IF;
      
      v_inv_fee := ROUND((v_inv_gross * v_fee_pct / 100.0)::numeric, 8);
      
      -- Determine IB commission
      v_ib_parent := v_inv.ib_parent_id;
      v_ib_pct := COALESCE(
        (SELECT ib_percentage FROM ib_commission_schedule
         WHERE investor_id = v_inv.investor_id
           AND (fund_id = p_fund_id OR fund_id IS NULL)
           AND effective_date <= p_period_end
           AND (end_date IS NULL OR end_date >= p_period_end)
         ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
        v_inv.ib_percentage,
        0
      );
      
      IF v_ib_parent IS NULL OR v_ib_pct <= 0 THEN
        v_inv_ib := 0;
        v_ib_pct := 0;
      ELSE
        v_inv_ib := ROUND((v_inv_gross * v_ib_pct / 100.0)::numeric, 8);
      END IF;
      
      v_inv_net := v_inv_gross - v_inv_fee - v_inv_ib;

      -- Accumulate running totals (include ALL accounts in totals)
      -- fees_account yield is internal compounding but still tracked
      IF v_inv.account_type != 'fees_account' THEN
        v_total_gross := v_total_gross + v_inv_gross;
        v_total_fees := v_total_fees + v_inv_fee;
        v_total_ib := v_total_ib + v_inv_ib;
        v_total_net := v_total_net + v_inv_net;
      END IF;

      -- Upsert into running totals
      INSERT INTO _preview_investor_totals (investor_id, investor_name, account_type, total_gross, total_fee, total_net, total_ib, fee_pct, ib_parent_id, ib_rate, segments)
      VALUES (v_inv.investor_id, v_inv.investor_name, v_inv.account_type, v_inv_gross, v_inv_fee, v_inv_net, v_inv_ib, v_fee_pct, v_ib_parent, v_ib_pct,
        jsonb_build_array(jsonb_build_object('seg', v_segment_count, 'gross', ROUND(v_inv_gross, 8), 'fee', ROUND(v_inv_fee, 8), 'net', ROUND(v_inv_net, 8), 'ib', ROUND(v_inv_ib, 8), 'share_pct', ROUND(v_inv_share * 100, 6)))
      )
      ON CONFLICT (investor_id) DO UPDATE SET
        total_gross = _preview_investor_totals.total_gross + v_inv_gross,
        total_fee = _preview_investor_totals.total_fee + v_inv_fee,
        total_net = _preview_investor_totals.total_net + v_inv_net,
        total_ib = _preview_investor_totals.total_ib + v_inv_ib,
        fee_pct = v_fee_pct,
        ib_parent_id = v_ib_parent,
        ib_rate = v_ib_pct,
        segments = _preview_investor_totals.segments || jsonb_build_array(jsonb_build_object('seg', v_segment_count, 'gross', ROUND(v_inv_gross, 8), 'fee', ROUND(v_inv_fee, 8), 'net', ROUND(v_inv_net, 8), 'ib', ROUND(v_inv_ib, 8), 'share_pct', ROUND(v_inv_share * 100, 6)));
    END LOOP;

    v_seg_start := v_seg_end + 1;
  END LOOP;

  -- Build allocations output from running totals
  -- FIXED: No longer excludes fees_account (was: AND t.investor_id != v_fees_account_id)
  SELECT jsonb_agg(
    jsonb_build_object(
      'investor_id', t.investor_id,
      'investor_name', t.investor_name,
      'account_type', t.account_type,
      'gross', ROUND(t.total_gross, 8),
      'fee', ROUND(t.total_fee, 8),
      'net', ROUND(t.total_net, 8),
      'ib', ROUND(t.total_ib, 8),
      'fee_pct', ROUND(t.fee_pct, 4),
      'ib_parent_id', t.ib_parent_id,
      'ib_rate', ROUND(t.ib_rate, 4),
      'segments', t.segments
    ) ORDER BY t.total_gross DESC
  )
  INTO v_allocations
  FROM _preview_investor_totals t
  WHERE t.total_gross > 0;

  -- Count investors (standard investors only for display)
  SELECT COUNT(*) INTO v_investor_count
  FROM _preview_investor_totals t
  WHERE t.total_gross > 0 AND t.account_type = 'investor';

  -- Calculate dust
  v_dust := v_gross_yield - (v_total_gross + (
    SELECT COALESCE(SUM(t.total_gross), 0) FROM _preview_investor_totals t WHERE t.account_type = 'fees_account'
  ));

  -- Conservation check
  v_conservation_check := ABS(v_total_gross - (v_total_net + v_total_fees + v_total_ib)) < 0.00000001;

  -- Clean up
  DROP TABLE IF EXISTS _preview_investor_totals;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'fund_id', v_fund.id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', p_period_end,
    'days_in_period', v_total_days,
    'opening_aum', ROUND(v_opening_aum, 8),
    'recorded_aum', ROUND(p_recorded_aum, 8),
    'gross_yield', ROUND(v_total_gross, 8),
    'net_yield', ROUND(v_total_net, 8),
    'total_fees', ROUND(v_total_fees, 8),
    'total_ib', ROUND(v_total_ib, 8),
    'dust_amount', ROUND(v_dust, 8),
    'investor_count', v_investor_count,
    'segment_count', v_segment_count,
    'segments', v_segments,
    'allocations', COALESCE(v_allocations, '[]'::jsonb),
    'crystal_count', v_crystal_count,
    'conservation_check', v_conservation_check,
    'features', jsonb_build_array('segmented_proportional'),
    'purpose', p_purpose
  );

  RETURN v_result;
END;
$function$;

-- Fix 2: MEDIUM - Fix run_integrity_pack column name
CREATE OR REPLACE FUNCTION public.run_integrity_pack(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_start_ts timestamptz := clock_timestamp();
  v_violations jsonb := '[]'::jsonb;
  v_run_id uuid;
  v_rec RECORD;
  v_status text := 'pass';
BEGIN
  -- Create run record
  INSERT INTO admin_integrity_runs (status, triggered_by, scope_fund_id, scope_investor_id, created_by)
  VALUES ('running', 'manual', p_scope_fund_id, p_scope_investor_id, auth.uid())
  RETURNING id INTO v_run_id;

  -- Check 1: Ledger reconciliation (position vs transaction sum drift)
  FOR v_rec IN
    SELECT * FROM v_ledger_reconciliation
    WHERE ABS(drift) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ledger_reconciliation',
      'severity', 'error',
      'investor_id', v_rec.investor_id,
      'fund_id', v_rec.fund_id,
      'drift', v_rec.drift
    );
    v_status := 'fail';
  END LOOP;

  -- Check 2: Fund AUM mismatch
  FOR v_rec IN
    SELECT * FROM fund_aum_mismatch
    WHERE ABS(discrepancy) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'fund_aum_mismatch',
      'severity', 'warning',
      'fund_id', v_rec.fund_id,
      'fund_name', v_rec.fund_name,
      'discrepancy', v_rec.discrepancy
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 3: Yield distribution conservation
  FOR v_rec IN
    SELECT * FROM yield_distribution_conservation_check
    WHERE ABS(COALESCE(conservation_gap, 0)) > 0.00000001
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'yield_conservation',
      'severity', 'error',
      'distribution_id', v_rec.distribution_id,
      'conservation_gap', v_rec.conservation_gap
    );
    v_status := 'fail';
  END LOOP;

  -- Check 4: Orphaned transactions
  FOR v_rec IN
    SELECT * FROM v_orphaned_transactions
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'orphaned_transactions',
      'severity', 'warning',
      'transaction_id', v_rec.id
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Update run record
  UPDATE admin_integrity_runs
  SET status = v_status,
      violations = v_violations,
      runtime_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'status', v_status,
    'violation_count', jsonb_array_length(v_violations),
    'violations', v_violations,
    'runtime_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  );
END;
$function$;
