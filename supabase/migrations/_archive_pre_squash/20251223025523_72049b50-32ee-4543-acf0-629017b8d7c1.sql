-- Fix preview_daily_yield_to_fund_v2 and apply_daily_yield_to_fund_v2 functions
-- Corrects all column references to match actual schema

DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, text);

-- Recreate preview function with correct column references
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_yield numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund RECORD;
  v_current_aum numeric;
  v_investor RECORD;
  v_investor_rows jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_net numeric := 0;
  v_investor_count integer := 0;
  v_purpose_enum aum_purpose;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Validate purpose
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: ' || p_purpose);
  END;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current AUM from investor positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_current_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for fund');
  END IF;

  -- Loop through each investor with a position
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') as investor_name,
      ip.current_value,
      CASE 
        WHEN v_current_aum > 0 THEN ip.current_value / v_current_aum 
        ELSE 0 
      END as allocation_pct,
      p.account_type,
      COALESCE(
        (SELECT fee_pct FROM investor_fee_schedule ifs 
         WHERE ifs.investor_id = ip.investor_id 
           AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
           AND ifs.effective_date <= p_date
           AND (ifs.end_date IS NULL OR ifs.end_date >= p_date)
         ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
         LIMIT 1),
        COALESCE(p.fee_percentage * 100, 20)
      ) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND (p.status IS NULL OR p.status = 'active')
    ORDER BY ip.current_value DESC
  LOOP
    DECLARE
      v_gross numeric;
      v_fee numeric;
      v_ib numeric;
      v_net numeric;
      v_ib_parent_name text;
    BEGIN
      -- Calculate pro-rata gross yield
      v_gross := p_gross_yield * v_investor.allocation_pct;
      
      -- Calculate fee (skip for INDIGO FEES account)
      IF v_investor.investor_id = v_indigo_fees_id THEN
        v_fee := 0;
      ELSE
        v_fee := v_gross * (v_investor.fee_pct / 100);
      END IF;
      
      -- Calculate IB commission on fee
      IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_percentage > 0 THEN
        v_ib := v_fee * (v_investor.ib_percentage / 100);
        SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
        FROM profiles WHERE id = v_investor.ib_parent_id;
      ELSE
        v_ib := 0;
        v_ib_parent_name := NULL;
      END IF;
      
      -- Net to investor
      v_net := v_gross - v_fee;
      
      -- Accumulate totals
      v_total_gross := v_total_gross + v_gross;
      v_total_fees := v_total_fees + v_fee;
      v_total_ib := v_total_ib + v_ib;
      v_total_net := v_total_net + v_net;
      v_investor_count := v_investor_count + 1;
      
      -- Add to results
      v_investor_rows := v_investor_rows || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'current_value', v_investor.current_value,
        'allocation_pct', v_investor.allocation_pct,
        'fee_pct', v_investor.fee_pct,
        'gross_yield', v_gross,
        'fee_amount', v_fee,
        'ib_amount', v_ib,
        'net_yield', v_net,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_percentage', v_investor.ib_percentage
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_asset', v_fund.asset,
    'effective_date', p_date,
    'purpose', p_purpose,
    'current_aum', v_current_aum,
    'gross_yield', p_gross_yield,
    'total_gross', v_total_gross,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'total_net', v_total_net,
    'investor_count', v_investor_count,
    'investors', v_investor_rows
  );
END;
$function$;

-- Recreate apply function with correct column references
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_yield numeric,
  p_purpose text DEFAULT 'reporting',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_preview jsonb;
  v_fund RECORD;
  v_investor jsonb;
  v_distribution_id uuid;
  v_period_id uuid;
  v_purpose_enum aum_purpose;
  v_admin_id uuid := auth.uid();
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_platform_fees numeric := 0;
  v_tx_id uuid;
BEGIN
  -- Check admin
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Validate purpose
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: ' || p_purpose);
  END;

  -- Get preview data
  v_preview := public.preview_daily_yield_to_fund_v2(p_fund_id, p_date, p_gross_yield, p_purpose);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;

  -- Get or create statement period
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE year = EXTRACT(YEAR FROM p_date)::integer
    AND month = EXTRACT(MONTH FROM p_date)::integer
  LIMIT 1;

  IF v_period_id IS NULL THEN
    INSERT INTO statement_periods (year, month, period_end_date, status, period_name)
    VALUES (
      EXTRACT(YEAR FROM p_date)::integer,
      EXTRACT(MONTH FROM p_date)::integer,
      (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
      'open',
      to_char(p_date, 'YYYY-MM')
    )
    RETURNING id INTO v_period_id;
  END IF;

  -- Create distribution record
  v_distribution_id := gen_random_uuid();
  
  INSERT INTO yield_distributions (
    id,
    fund_id,
    effective_date,
    purpose,
    is_month_end,
    recorded_aum,
    gross_yield,
    distribution_type,
    status,
    created_by,
    reason,
    summary_json
  ) VALUES (
    v_distribution_id,
    p_fund_id,
    p_date,
    v_purpose_enum,
    (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date),
    (v_preview->>'current_aum')::numeric,
    p_gross_yield,
    'original',
    'applied',
    v_admin_id,
    p_notes,
    v_preview
  );

  -- Process each investor
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'investors')
  LOOP
    -- Credit net yield to investor
    IF (v_investor->>'net_yield')::numeric > 0 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'investor_id')::uuid,
        p_fund_id,
        'INTEREST',
        v_fund.asset,
        v_fund.fund_class,
        (v_investor->>'net_yield')::numeric,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':INTEREST',
        'Yield distribution',
        v_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + (v_investor->>'net_yield')::numeric,
          updated_at = now()
      WHERE investor_id = (v_investor->>'investor_id')::uuid
        AND fund_id = p_fund_id;
    END IF;

    -- Record fee deduction (if any and not INDIGO FEES account)
    IF (v_investor->>'fee_amount')::numeric > 0 
       AND (v_investor->>'investor_id')::uuid != v_indigo_fees_id THEN
      
      -- Track platform fees (fee minus IB commission)
      v_total_platform_fees := v_total_platform_fees + 
        (v_investor->>'fee_amount')::numeric - COALESCE((v_investor->>'ib_amount')::numeric, 0);

      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'investor_id')::uuid,
        p_fund_id,
        'FEE',
        v_fund.asset,
        v_fund.fund_class,
        (v_investor->>'fee_amount')::numeric,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':FEE',
        'Performance fee',
        v_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    END IF;

    -- Credit IB commission
    IF (v_investor->>'ib_amount')::numeric > 0 AND (v_investor->>'ib_parent_id') IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class,
        amount, tx_date, reference_id, notes, created_by,
        purpose, distribution_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_investor->>'ib_parent_id')::uuid,
        p_fund_id,
        'IB_CREDIT',
        v_fund.asset,
        v_fund.fund_class,
        (v_investor->>'ib_amount')::numeric,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':IB_CREDIT',
        'IB commission from ' || (v_investor->>'investor_name'),
        v_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'admin_only',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update IB parent position
      UPDATE investor_positions
      SET current_value = current_value + (v_investor->>'ib_amount')::numeric,
          updated_at = now()
      WHERE investor_id = (v_investor->>'ib_parent_id')::uuid
        AND fund_id = p_fund_id;

      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        source_net_income, ib_percentage, ib_fee_amount, effective_date,
        purpose, created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        (v_investor->>'ib_parent_id')::uuid,
        (v_investor->>'net_yield')::numeric,
        (v_investor->>'ib_percentage')::numeric,
        (v_investor->>'ib_amount')::numeric,
        p_date,
        v_purpose_enum,
        v_admin_id
      );
    END IF;
  END LOOP;

  -- Credit platform fees to INDIGO FEES account
  IF v_total_platform_fees > 0 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class,
      amount, tx_date, reference_id, notes, created_by,
      purpose, distribution_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(),
      v_indigo_fees_id,
      p_fund_id,
      'FEE_CREDIT',
      v_fund.asset,
      v_fund.fund_class,
      v_total_platform_fees,
      p_date,
      'yield:' || v_distribution_id || ':INDIGO_FEES:FEE_CREDIT',
      'Platform fee collection',
      v_admin_id,
      v_purpose_enum,
      v_distribution_id,
      'admin_only',
      true,
      'yield_distribution'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    -- Update INDIGO FEES position
    UPDATE investor_positions
    SET current_value = current_value + v_total_platform_fees,
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id
      AND fund_id = p_fund_id;
  END IF;

  -- Record daily AUM
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (
    p_fund_id,
    p_date,
    (v_preview->>'current_aum')::numeric + p_gross_yield,
    v_purpose_enum,
    'yield_distribution:' || v_distribution_id,
    v_admin_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = EXCLUDED.source,
    updated_at = now(),
    updated_by = v_admin_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    v_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'effective_date', p_date,
      'gross_yield', p_gross_yield,
      'total_fees', (v_preview->>'total_fees')::numeric,
      'total_ib', (v_preview->>'total_ib')::numeric,
      'investor_count', (v_preview->>'investor_count')::integer
    ),
    jsonb_build_object('purpose', p_purpose, 'notes', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'effective_date', p_date,
    'gross_yield', p_gross_yield,
    'total_fees', (v_preview->>'total_fees')::numeric,
    'total_ib', (v_preview->>'total_ib')::numeric,
    'total_net', (v_preview->>'total_net')::numeric,
    'investor_count', (v_preview->>'investor_count')::integer,
    'message', 'Yield distribution applied successfully'
  );
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, text) TO authenticated;