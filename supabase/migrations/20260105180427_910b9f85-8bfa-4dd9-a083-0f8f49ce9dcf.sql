
-- ============================================================
-- Comprehensive Database Function Cleanup
-- Fixes broken functions, drops deprecated ones, consolidates overloads
-- ============================================================

-- ============================================================
-- PHASE 1: Drop deprecated/obsolete functions
-- ============================================================

-- Drop month closure functions (feature removed)
DROP FUNCTION IF EXISTS public.close_fund_reporting_month(uuid, date);
DROP FUNCTION IF EXISTS public.get_month_closure_status(uuid, date);
DROP FUNCTION IF EXISTS public.reopen_fund_reporting_month(uuid, date);

-- Drop deprecated v2/legacy functions
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid, boolean);
DROP FUNCTION IF EXISTS public.complete_withdrawal_legacy(uuid, text, text);
DROP FUNCTION IF EXISTS public.distribute_yield_v2(uuid, text, numeric, uuid);

-- Drop the 6-param version of internal_route_to_fees (keep 7-param version with transfer_id)
DROP FUNCTION IF EXISTS public.internal_route_to_fees(uuid, uuid, numeric, date, text, uuid);

-- ============================================================
-- PHASE 2: Fix get_position_reconciliation (full_name -> first_name/last_name)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_position_reconciliation(
  p_as_of_date date DEFAULT CURRENT_DATE, 
  p_fund_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  out_investor_id uuid, 
  out_fund_id uuid, 
  out_investor_name text, 
  out_fund_name text, 
  out_position_balance numeric, 
  out_ledger_balance numeric, 
  out_difference numeric, 
  out_is_matched boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ip.investor_id AS out_investor_id,
        ip.fund_id AS out_fund_id,
        TRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')) AS out_investor_name,
        f.name AS out_fund_name,
        ip.current_value AS out_position_balance,
        COALESCE(ledger.total, 0) AS out_ledger_balance,
        (ip.current_value - COALESCE(ledger.total, 0)) AS out_difference,
        (ABS(ip.current_value - COALESCE(ledger.total, 0)) < 0.01) AS out_is_matched
    FROM public.investor_positions ip
    JOIN public.profiles pr ON pr.id = ip.investor_id
    JOIN public.funds f ON f.id = ip.fund_id
    LEFT JOIN (
        SELECT 
            t.investor_id,
            t.fund_id,
            SUM(t.amount) AS total
        FROM public.transactions_v2 t
        WHERE t.tx_date <= p_as_of_date
          AND COALESCE(t.is_voided, false) = false
        GROUP BY t.investor_id, t.fund_id
    ) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
    WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id);
END;
$function$;

-- ============================================================
-- PHASE 3: Fix get_reporting_eligible_investors 
-- (full_name, display_name, role -> first_name/last_name, account_type)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_reporting_eligible_investors(p_period_id uuid)
RETURNS TABLE(
  investor_id uuid, 
  investor_name text, 
  email text, 
  eligibility_reason text, 
  is_eligible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_period_start date;
    v_period_end date;
    v_period_year integer;
    v_period_month integer;
BEGIN
    -- Get period dates using CORRECT column names (year, month, period_end_date)
    SELECT 
        sp.year,
        sp.month,
        make_date(sp.year, sp.month, 1),  -- Calculate period start from year/month
        sp.period_end_date
    INTO v_period_year, v_period_month, v_period_start, v_period_end
    FROM statement_periods sp
    WHERE sp.id = p_period_id;
    
    IF v_period_start IS NULL THEN
        RAISE EXCEPTION 'Period not found: %', p_period_id;
    END IF;
    
    RETURN QUERY
    WITH investor_data AS (
        SELECT 
            p.id as inv_id,
            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as inv_name,
            p.email as inv_email,
            p.status as inv_status,
            p.account_type as inv_account_type,
            EXISTS (
                SELECT 1 FROM investor_positions ip
                WHERE ip.investor_id = p.id
                AND ip.current_value > 0
            ) as has_positions,
            EXISTS (
                SELECT 1 FROM investor_fund_performance ifp
                WHERE ifp.investor_id = p.id
                AND ifp.period_id = p_period_id
                AND (ifp.purpose IS NULL OR ifp.purpose = 'reporting')
            ) as has_performance_data,
            EXISTS (
                SELECT 1 FROM generated_statements gs
                WHERE gs.investor_id = p.id
                AND gs.period_id = p_period_id
            ) as already_generated
        FROM profiles p
        WHERE p.account_type = 'investor' OR p.account_type IS NULL
    )
    SELECT 
        id.inv_id,
        id.inv_name,
        id.inv_email,
        CASE 
            WHEN id.already_generated THEN 'Statement already generated'
            WHEN NOT id.has_positions THEN 'No active positions'
            WHEN NOT id.has_performance_data THEN 'No performance data for period'
            WHEN id.inv_status = 'inactive' THEN 'Account inactive'
            ELSE 'Eligible for statement'
        END as reason,
        (id.has_positions AND id.has_performance_data AND NOT id.already_generated AND COALESCE(id.inv_status, 'active') != 'inactive') as eligible
    FROM investor_data id
    ORDER BY id.inv_name;
END;
$function$;

-- ============================================================
-- PHASE 4: Fix apply_yield_correction_v2 (remove month closure check)
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(
  p_fund_id uuid, 
  p_period_start date, 
  p_period_end date, 
  p_purpose text, 
  p_new_aum numeric, 
  p_reason text, 
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_is_month_closed BOOLEAN := false;  -- Always false since feature removed
  v_is_super_admin BOOLEAN;
  v_preview JSONB;
  v_summary JSONB;
  v_investor_rows JSONB;
  v_tx_diffs JSONB;
  v_original_dist_id UUID;
  v_correction_dist_id UUID := gen_random_uuid();
  v_correction_run_id UUID := gen_random_uuid();
  v_old_aum NUMERIC;
  v_delta_aum NUMERIC;
  v_admin_id UUID := auth.uid();
  v_fund RECORD;
  v_inv RECORD;
  v_ref_prefix TEXT;
  v_input_hash TEXT;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fee_credit_delta NUMERIC := 0;
BEGIN
  -- Admin check
  IF NOT public.check_is_admin(auth.uid()) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); 
  END IF;
  
  SELECT public.is_super_admin() INTO v_is_super_admin;
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Month closure feature removed - always allow corrections
  -- v_is_month_closed is always false
  
  -- Validate confirmation (simplified since no month closure)
  IF p_confirmation != 'APPLY CORRECTION' AND p_confirmation != 'APPLY CLOSED MONTH CORRECTION' THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation'); 
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters'); 
  END IF;
  
  -- Get preview with time-weighted calculations
  v_preview := public.preview_yield_correction_v2(p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum);
  
  IF NOT (v_preview->>'success')::boolean THEN 
    RETURN v_preview; 
  END IF;
  
  v_summary := v_preview->'summary';
  v_investor_rows := v_preview->'investor_rows';
  v_tx_diffs := v_preview->'tx_diffs';
  v_original_dist_id := (v_summary->>'original_distribution_id')::uuid;
  v_old_aum := (v_summary->>'old_aum')::numeric;
  v_delta_aum := (v_summary->>'delta_aum')::numeric;
  v_input_hash := v_summary->>'input_hash';
  
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  
  -- IDEMPOTENCY CHECK: Try to insert correction_run, will fail if duplicate
  BEGIN
    INSERT INTO correction_runs (
      id, fund_id, period_id, period_start, period_end, purpose, input_hash,
      old_aum, new_aum, delta_aum, original_distribution_id, correction_distribution_id,
      status, investors_affected, total_fee_delta, total_ib_delta, reason, preview_json,
      created_by, applied_at, applied_by
    ) VALUES (
      v_correction_run_id, p_fund_id, 
      (SELECT id FROM statement_periods WHERE period_end_date >= p_period_end ORDER BY period_end_date ASC LIMIT 1),
      p_period_start, p_period_end, v_purpose_enum, v_input_hash,
      v_old_aum, p_new_aum, v_delta_aum, v_original_dist_id, v_correction_dist_id,
      'applied', (v_summary->>'investors_affected')::integer,
      (v_summary->>'total_fee_delta')::numeric, (v_summary->>'total_ib_delta')::numeric,
      p_reason, v_preview, v_admin_id, now(), v_admin_id
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'This exact correction has already been applied (idempotency check)');
  END;
  
  -- Create distribution records
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, gross_yield, 
    distribution_type, status, created_by, reason, summary_json
  )
  SELECT 
    COALESCE(v_original_dist_id, gen_random_uuid()), p_fund_id, p_period_end, v_purpose_enum,
    COALESCE((SELECT is_month_end FROM fund_daily_aum WHERE id = v_original_dist_id), true),
    v_old_aum, (v_summary->>'old_gross_yield')::numeric, 'original', 'applied',
    v_admin_id, 'Original distribution (backfilled for correction tracking)', NULL
  ON CONFLICT DO NOTHING;
  
  IF v_original_dist_id IS NULL THEN
    SELECT id INTO v_original_dist_id 
    FROM yield_distributions 
    WHERE fund_id = p_fund_id 
      AND effective_date = p_period_end 
      AND purpose = v_purpose_enum 
      AND distribution_type = 'original';
  END IF;
  
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum, 
    gross_yield, distribution_type, parent_distribution_id, status, created_by, 
    reason, summary_json
  ) VALUES (
    v_correction_dist_id, p_fund_id, p_period_end, v_purpose_enum, true,
    p_new_aum, v_old_aum, (v_summary->>'new_gross_yield')::numeric, 'correction',
    v_original_dist_id, 'applied', v_admin_id, p_reason, v_preview
  );
  
  -- Insert yield_corrections record
  INSERT INTO yield_corrections (
    id, original_distribution_id, correction_distribution_id, status,
    old_aum, new_aum, delta_aum, old_gross_yield, new_gross_yield, delta_gross_yield,
    investors_affected, total_fee_delta, total_ib_delta, preview_json,
    applied_at, applied_by, reason, created_by
  ) VALUES (
    v_correction_run_id, v_original_dist_id, v_correction_dist_id, 'applied',
    v_old_aum, p_new_aum, v_delta_aum,
    (v_summary->>'old_gross_yield')::numeric,
    (v_summary->>'new_gross_yield')::numeric,
    (v_summary->>'delta_gross_yield')::numeric,
    (v_summary->>'investors_affected')::integer,
    (v_summary->>'total_fee_delta')::numeric,
    (v_summary->>'total_ib_delta')::numeric,
    v_preview, now(), v_admin_id, p_reason, v_admin_id
  );
  
  -- Reference prefix for deterministic transaction IDs
  v_ref_prefix := format('corr:%s:', v_correction_run_id);
  
  -- Process investor transactions
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_investor_rows) LOOP
    -- INTEREST delta
    IF ABS((v_inv.value->>'delta_net')::numeric) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'INTEREST', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_net')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':INTEREST',
        format('Yield correction (time-weighted): %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      UPDATE investor_positions 
      SET current_value = current_value + (v_inv.value->>'delta_net')::numeric, 
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'investor_id')::uuid 
        AND fund_id = p_fund_id;
    END IF;
    
    -- FEE delta
    IF ABS((v_inv.value->>'delta_fee')::numeric) > 0.00000001 
       AND (v_inv.value->>'investor_id')::uuid != v_indigo_fees_id THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'FEE', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_fee')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':FEE',
        format('Fee correction: %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      v_total_fee_credit_delta := v_total_fee_credit_delta + 
        (v_inv.value->>'delta_fee')::numeric - 
        COALESCE((v_inv.value->>'delta_ib')::numeric, 0);
    END IF;
    
    -- IB_CREDIT delta
    IF (v_inv.value->>'ib_parent_id') IS NOT NULL 
       AND ABS(COALESCE((v_inv.value->>'delta_ib')::numeric, 0)) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'ib_parent_id')::uuid, p_fund_id,
        'IB_CREDIT', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_ib')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':IB_CREDIT',
        format('IB correction from %s: %s', v_inv.value->>'investor_name', p_reason),
        v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'admin_only', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      UPDATE investor_positions 
      SET current_value = current_value + (v_inv.value->>'delta_ib')::numeric, 
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'ib_parent_id')::uuid 
        AND fund_id = p_fund_id;
    END IF;
  END LOOP;
  
  -- FEE_CREDIT for INDIGO FEES
  IF ABS(v_total_fee_credit_delta) > 0.00000001 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, created_at, purpose, distribution_id,
      correction_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(), v_indigo_fees_id, p_fund_id,
      'FEE_CREDIT', v_fund.asset, v_fund.fund_class, v_total_fee_credit_delta,
      p_period_end, v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT',
      format('Platform fee correction: %s', p_reason), v_admin_id, now(),
      v_purpose_enum, v_correction_dist_id, v_correction_run_id,
      'admin_only', true, 'yield_correction_v2'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    
    UPDATE investor_positions 
    SET current_value = current_value + v_total_fee_credit_delta, 
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id 
      AND fund_id = p_fund_id;
  END IF;
  
  -- Update fund_daily_aum
  UPDATE fund_daily_aum 
  SET total_aum = p_new_aum, 
      source = format('corrected_v2:%s', v_correction_run_id),
      updated_at = now(), 
      updated_by = v_admin_id
  WHERE fund_id = p_fund_id 
    AND aum_date = p_period_end 
    AND purpose = v_purpose_enum;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'YIELD_CORRECTION_V2_APPLIED', 'correction_runs', v_correction_run_id::text,
    v_admin_id, jsonb_build_object('old_aum', v_old_aum),
    jsonb_build_object('new_aum', p_new_aum, 'delta', v_delta_aum),
    jsonb_build_object(
      'fund_id', p_fund_id, 'period_start', p_period_start, 'period_end', p_period_end,
      'purpose', p_purpose, 'reason', p_reason, 'is_month_closed', v_is_month_closed,
      'investors_affected', (v_summary->>'investors_affected')::integer,
      'time_weighted', true
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_run_id,
    'distribution_id', v_correction_dist_id,
    'original_distribution_id', v_original_dist_id,
    'delta_aum', v_delta_aum,
    'investors_affected', (v_summary->>'investors_affected')::integer,
    'total_fee_delta', (v_summary->>'total_fee_delta')::numeric,
    'total_ib_delta', (v_summary->>'total_ib_delta')::numeric,
    'is_month_closed', v_is_month_closed,
    'input_hash', v_input_hash,
    'reconciliation', v_preview->'reconciliation',
    'message', format('Correction applied successfully with time-weighted ownership. %s investors updated.', 
      (v_summary->>'investors_affected')::integer)
  );
END;
$function$;

-- ============================================================
-- PHASE 5: Fix preview_yield_correction_v2 (remove month closure check)
-- ============================================================

CREATE OR REPLACE FUNCTION public.preview_yield_correction_v2(
  p_fund_id uuid, 
  p_period_start date, 
  p_period_end date, 
  p_purpose text, 
  p_new_aum numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_fund RECORD;
  v_old_aum NUMERIC;
  v_previous_aum NUMERIC;
  v_old_gross_yield NUMERIC;
  v_new_gross_yield NUMERIC;
  v_delta_aum NUMERIC;
  v_delta_gross NUMERIC;
  v_total_avg_capital NUMERIC := 0;
  v_investors_affected INTEGER := 0;
  v_total_fee_delta NUMERIC := 0;
  v_total_ib_delta NUMERIC := 0;
  v_total_net_delta NUMERIC := 0;
  v_total_gross_yield_check NUMERIC := 0;
  v_total_fees_check NUMERIC := 0;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_rows JSONB := '[]'::jsonb;
  v_tx_diffs JSONB := '[]'::jsonb;
  v_report_impacts JSONB := '[]'::jsonb;
  v_reconciliation JSONB;
  v_is_month_closed BOOLEAN := false;  -- Always false since feature removed
  v_original_distribution_id UUID;
  v_input_hash TEXT;
  v_period_id UUID;
  rec RECORD;
  v_share NUMERIC;
  v_old_gross NUMERIC;
  v_new_gross NUMERIC;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
  v_old_net NUMERIC;
  v_new_net NUMERIC;
  v_delta_fee NUMERIC;
  v_delta_net NUMERIC;
  v_old_ib NUMERIC;
  v_new_ib NUMERIC;
  v_delta_ib NUMERIC;
BEGIN
  -- Admin check
  IF NOT public.check_is_admin(auth.uid()) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); 
  END IF;
  
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); 
  END IF;
  
  -- Get original AUM for period end
  SELECT id, total_aum INTO v_original_distribution_id, v_old_aum 
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date = p_period_end 
    AND purpose = v_purpose_enum 
  LIMIT 1;
  
  IF v_old_aum IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No yield record found for period end date'); 
  END IF;
  
  -- Get previous AUM (before period start)
  SELECT total_aum INTO v_previous_aum 
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date < p_period_start 
    AND purpose = v_purpose_enum 
  ORDER BY aum_date DESC LIMIT 1;
  
  IF v_previous_aum IS NULL THEN v_previous_aum := v_old_aum; END IF;
  
  -- Calculate deltas
  v_delta_aum := p_new_aum - v_old_aum;
  v_old_gross_yield := v_old_aum - v_previous_aum;
  v_new_gross_yield := p_new_aum - v_previous_aum;
  v_delta_gross := v_new_gross_yield - v_old_gross_yield;
  
  -- Month closure check removed - v_is_month_closed is always false
  
  -- Get period ID
  SELECT id INTO v_period_id 
  FROM statement_periods 
  WHERE period_end_date >= p_period_end 
  ORDER BY period_end_date ASC LIMIT 1;
  
  -- Compute input hash for idempotency
  v_input_hash := public.compute_correction_input_hash(
    p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum
  );
  
  -- Check if already applied
  IF EXISTS (
    SELECT 1 FROM correction_runs 
    WHERE fund_id = p_fund_id 
      AND period_start = p_period_start 
      AND period_end = p_period_end 
      AND purpose = v_purpose_enum 
      AND input_hash = v_input_hash 
      AND status = 'applied'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This exact correction has already been applied');
  END IF;
  
  -- STEP 1: Rebuild period balances using time-weighted method
  -- First calculate total avg capital
  SELECT COALESCE(SUM(avg_capital), 0) INTO v_total_avg_capital
  FROM public.rebuild_investor_period_balances(p_fund_id, p_period_start, p_period_end, v_purpose_enum);
  
  IF v_total_avg_capital <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 
      'summary', jsonb_build_object(
        'fund_id', p_fund_id, 'fund_name', v_fund.name, 'fund_asset', v_fund.asset,
        'period_start', p_period_start, 'period_end', p_period_end, 'purpose', p_purpose,
        'old_aum', v_old_aum, 'new_aum', p_new_aum, 'delta_aum', v_delta_aum,
        'old_gross_yield', v_old_gross_yield, 'new_gross_yield', v_new_gross_yield,
        'delta_gross_yield', v_delta_gross, 'investors_affected', 0,
        'total_fee_delta', 0, 'total_ib_delta', 0, 'total_net_delta', 0,
        'is_month_closed', v_is_month_closed, 'input_hash', v_input_hash
      ), 
      'investor_rows', '[]'::jsonb, 'tx_diffs', '[]'::jsonb, 
      'report_impacts', '[]'::jsonb, 'reconciliation', jsonb_build_object(
        'sum_gross_yield', 0, 'fund_gross_yield', v_new_gross_yield,
        'sum_fees', 0, 'sum_ib', 0, 'sum_net_yield', 0,
        'conservation_check', true
      )
    );
  END IF;
  
  -- STEP 2: Calculate per-investor impact using time-weighted shares
  FOR rec IN 
    SELECT * FROM public.rebuild_investor_period_balances(
      p_fund_id, p_period_start, p_period_end, v_purpose_enum
    )
  LOOP
    v_investors_affected := v_investors_affected + 1;
    
    -- Time-weighted share based on avg_capital
    v_share := rec.avg_capital / v_total_avg_capital;
    
    -- Gross yield allocation based on time-weighted share
    v_old_gross := v_old_gross_yield * v_share;
    v_new_gross := v_new_gross_yield * v_share;
    
    -- Apply investor-specific fee schedule
    IF rec.investor_id = v_indigo_fees_id THEN
      v_old_fee := 0;
      v_new_fee := 0;
    ELSE
      v_old_fee := GREATEST(0, v_old_gross * (rec.fee_pct / 100.0));
      v_new_fee := GREATEST(0, v_new_gross * (rec.fee_pct / 100.0));
    END IF;
    
    v_old_net := v_old_gross - v_old_fee;
    v_new_net := v_new_gross - v_new_fee;
    v_delta_fee := v_new_fee - v_old_fee;
    v_delta_net := v_new_net - v_old_net;
    
    v_total_fee_delta := v_total_fee_delta + v_delta_fee;
    v_total_net_delta := v_total_net_delta + v_delta_net;
    
    -- IB calculation
    IF rec.ib_parent_id IS NOT NULL AND rec.ib_percentage > 0 AND rec.investor_id != v_indigo_fees_id THEN
      v_old_ib := v_old_fee * (rec.ib_percentage / 100.0);
      v_new_ib := v_new_fee * (rec.ib_percentage / 100.0);
      v_delta_ib := v_new_ib - v_old_ib;
      v_total_ib_delta := v_total_ib_delta + v_delta_ib;
    ELSE
      v_old_ib := 0;
      v_new_ib := 0;
      v_delta_ib := 0;
    END IF;
    
    -- Track for reconciliation
    v_total_gross_yield_check := v_total_gross_yield_check + v_new_gross;
    v_total_fees_check := v_total_fees_check + v_new_fee;
    
    -- Build investor row with full details
    v_investor_rows := v_investor_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', rec.investor_name,
      'email', rec.email,
      'beginning_balance', ROUND(rec.beginning_balance::numeric, 8),
      'additions', ROUND(rec.additions::numeric, 8),
      'redemptions', ROUND(rec.redemptions::numeric, 8),
      'avg_capital', ROUND(rec.avg_capital::numeric, 8),
      'position_value', ROUND(rec.ending_balance::numeric, 8),
      'share_pct', ROUND((v_share * 100)::numeric, 4),
      'old_gross', ROUND(v_old_gross::numeric, 8),
      'new_gross', ROUND(v_new_gross::numeric, 8),
      'delta_gross', ROUND((v_new_gross - v_old_gross)::numeric, 8),
      'fee_pct', rec.fee_pct,
      'old_fee', ROUND(v_old_fee::numeric, 8),
      'new_fee', ROUND(v_new_fee::numeric, 8),
      'delta_fee', ROUND(v_delta_fee::numeric, 8),
      'old_net', ROUND(v_old_net::numeric, 8),
      'new_net', ROUND(v_new_net::numeric, 8),
      'delta_net', ROUND(v_delta_net::numeric, 8),
      'ib_parent_id', rec.ib_parent_id,
      'ib_pct', rec.ib_percentage,
      'old_ib', ROUND(v_old_ib::numeric, 8),
      'new_ib', ROUND(v_new_ib::numeric, 8),
      'delta_ib', ROUND(v_delta_ib::numeric, 8),
      'ib_source', CASE WHEN rec.ib_parent_id IS NOT NULL THEN 'from_platform_fees' ELSE NULL END
    );
    
    -- Build transaction diffs
    IF ABS(v_delta_net) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'INTEREST',
        'investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_net::numeric, 8),
        'new_amount', ROUND(v_new_net::numeric, 8),
        'delta_amount', ROUND(v_delta_net::numeric, 8),
        'visibility_scope', 'investor_visible'
      );
    END IF;
    
    IF ABS(v_delta_fee) > 0.00000001 AND rec.investor_id != v_indigo_fees_id THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'FEE',
        'investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_fee::numeric, 8),
        'new_amount', ROUND(v_new_fee::numeric, 8),
        'delta_amount', ROUND(v_delta_fee::numeric, 8),
        'visibility_scope', 'investor_visible'
      );
    END IF;
    
    IF ABS(v_delta_ib) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'IB_CREDIT',
        'investor_id', rec.ib_parent_id,
        'source_investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_ib::numeric, 8),
        'new_amount', ROUND(v_new_ib::numeric, 8),
        'delta_amount', ROUND(v_delta_ib::numeric, 8),
        'visibility_scope', 'admin_only'
      );
    END IF;
  END LOOP;
  
  -- FEE_CREDIT for INDIGO FEES
  IF ABS(v_total_fee_delta - v_total_ib_delta) > 0.00000001 THEN
    v_tx_diffs := v_tx_diffs || jsonb_build_object(
      'tx_type', 'FEE_CREDIT',
      'investor_id', v_indigo_fees_id,
      'investor_name', 'INDIGO FEES',
      'old_amount', 0,
      'new_amount', 0,
      'delta_amount', ROUND((v_total_fee_delta - v_total_ib_delta)::numeric, 8),
      'visibility_scope', 'admin_only'
    );
  END IF;
  
  -- Report impacts
  IF v_period_id IS NOT NULL THEN
    v_report_impacts := v_report_impacts || jsonb_build_object(
      'period_id', v_period_id,
      'investors_affected', v_investors_affected,
      'needs_regeneration', true,
      'tables_affected', ARRAY['investor_fund_performance', 'generated_statements']
    );
  END IF;
  
  -- Build reconciliation check
  v_reconciliation := jsonb_build_object(
    'sum_gross_yield', ROUND(v_total_gross_yield_check::numeric, 8),
    'fund_gross_yield', ROUND(v_new_gross_yield::numeric, 8),
    'gross_yield_match', ABS(v_total_gross_yield_check - v_new_gross_yield) < 0.00000001,
    'sum_fees', ROUND(v_total_fees_check::numeric, 8),
    'sum_ib', ROUND(v_total_ib_delta::numeric, 8),
    'platform_fees', ROUND((v_total_fees_check - v_total_ib_delta)::numeric, 8),
    'sum_net_yield', ROUND((v_total_gross_yield_check - v_total_fees_check)::numeric, 8),
    'conservation_check', ABS(
      v_total_gross_yield_check - 
      (v_total_gross_yield_check - v_total_fees_check) - 
      v_total_fees_check
    ) < 0.00000001
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_name', v_fund.name,
      'fund_asset', v_fund.asset,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'purpose', p_purpose,
      'old_aum', v_old_aum,
      'new_aum', p_new_aum,
      'delta_aum', v_delta_aum,
      'old_gross_yield', v_old_gross_yield,
      'new_gross_yield', v_new_gross_yield,
      'delta_gross_yield', v_delta_gross,
      'investors_affected', v_investors_affected,
      'total_fee_delta', ROUND(v_total_fee_delta::numeric, 8),
      'total_ib_delta', ROUND(v_total_ib_delta::numeric, 8),
      'total_net_delta', ROUND(v_total_net_delta::numeric, 8),
      'is_month_closed', v_is_month_closed,
      'original_distribution_id', v_original_distribution_id,
      'input_hash', v_input_hash
    ),
    'investor_rows', v_investor_rows,
    'tx_diffs', v_tx_diffs,
    'report_impacts', v_report_impacts,
    'reconciliation', v_reconciliation
  );
END;
$function$;

-- ============================================================
-- PHASE 6: Fix reset_all_data_keep_profiles (remove month closure table ref)
-- ============================================================

CREATE OR REPLACE FUNCTION public.reset_all_data_keep_profiles(p_admin_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_result JSONB;
  v_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Verify confirmation code
  IF p_confirmation_code != 'FULL RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Expected: FULL RESET';
  END IF;
  
  -- Verify admin status
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Log the reset initiation
  INSERT INTO position_reset_log (
    id, reset_batch_id, admin_user_id, status, confirmation_code, initiated_at
  ) VALUES (
    gen_random_uuid(), v_batch_id, p_admin_id, 'in_progress', p_confirmation_code, now()
  );

  -- Delete in correct order respecting foreign keys

  -- 1. Delete withdrawal audit logs (child of withdrawal_requests)
  DELETE FROM withdrawal_audit_logs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_audit_logs', v_count);

  -- 2. Delete withdrawal requests
  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  -- 3. Delete IB allocations (references yield_distributions)
  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  -- 4. Delete fee allocations (references yield_distributions)
  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  -- 5. Delete yield distributions
  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  -- 6. Delete statement email delivery (references statements)
  DELETE FROM statement_email_delivery;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_count);

  -- 7. Delete generated statements (references statement_periods)
  DELETE FROM generated_statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_statements', v_count);

  -- 8. Delete statements
  DELETE FROM statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statements', v_count);

  -- 9. Delete investor period snapshots (references statement_periods)
  DELETE FROM investor_period_snapshot;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_period_snapshot', v_count);

  -- 10. Delete fund period snapshots (references statement_periods)
  DELETE FROM fund_period_snapshot;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_period_snapshot', v_count);

  -- 11. Delete statement periods (now safe)
  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  -- 12. Delete investor fund performance
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  -- 13. Delete fund daily AUM
  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  -- 14. Delete daily NAV
  DELETE FROM daily_nav;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('daily_nav', v_count);

  -- 15. Delete transactions
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- 16. Delete investor positions
  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  -- 17. Clear generated reports
  DELETE FROM generated_reports;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_reports', v_count);

  -- REMOVED: fund_reporting_month_closures (table dropped)

  -- Update log with completion
  UPDATE position_reset_log
  SET 
    status = 'completed',
    completed_at = now(),
    affected_counts = v_counts
  WHERE reset_batch_id = v_batch_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'deleted_counts', v_counts,
    'message', 'Full data reset completed. All transactional data cleared. Investor profiles preserved.'
  );

  RETURN v_result;
END;
$function$;
