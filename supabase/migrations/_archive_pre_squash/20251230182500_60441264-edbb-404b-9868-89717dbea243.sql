-- ============================================================================
-- FIX: Drop duplicate apply_daily_yield_to_fund_v2 overloads and create single canonical version
-- Also add missing foreign key constraints
-- ============================================================================

-- Drop ALL existing versions of apply_daily_yield_to_fund_v2
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, numeric, date, aum_purpose);

-- Create single canonical function matching TypeScript expectations
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'reporting'::text
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
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_platform_fees numeric := 0;
  v_net_yield numeric;
  v_fee_amount numeric;
  v_ib_amount numeric;
  v_conservation_check numeric;
BEGIN
  -- Check admin
  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Validate purpose
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: ' || p_purpose);
  END;

  -- Get preview data (ensures apply uses same calculation as preview)
  v_preview := public.preview_daily_yield_to_fund_v2(p_fund_id, p_date, p_gross_amount, p_purpose);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  -- Conservation check: gross should equal net + fees
  v_conservation_check := ABS(
    p_gross_amount - 
    ((v_preview->>'total_net')::numeric + (v_preview->>'total_fees')::numeric)
  );
  IF v_conservation_check > 0.01 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Conservation check failed: gross (%.8f) != net (%.8f) + fees (%.8f), diff: %.8f',
        p_gross_amount, (v_preview->>'total_net')::numeric, (v_preview->>'total_fees')::numeric, v_conservation_check)
    );
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
    net_yield,
    total_fees,
    total_ib,  -- CORRECT column name (not total_ib_fees)
    distribution_type,
    status,
    created_by,
    summary_json
  ) VALUES (
    v_distribution_id,
    p_fund_id,
    p_date,
    v_purpose_enum,
    (p_date = (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date),
    (v_preview->>'current_aum')::numeric,
    p_gross_amount,
    (v_preview->>'total_net')::numeric,
    (v_preview->>'total_fees')::numeric,
    (v_preview->>'total_ib')::numeric,  -- CORRECT column name
    'original',
    'applied',
    p_admin_id,
    v_preview
  );

  -- Process each investor
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'investors')
  LOOP
    v_net_yield := (v_investor->>'net_yield')::numeric;
    v_fee_amount := (v_investor->>'fee_amount')::numeric;
    v_ib_amount := COALESCE((v_investor->>'ib_amount')::numeric, 0);
    
    -- Credit net yield to investor
    IF v_net_yield > 0 THEN
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
        v_net_yield,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':INTEREST',
        'Yield distribution',
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update position: BOTH current_value AND shares
      UPDATE investor_positions
      SET current_value = current_value + v_net_yield,
          shares = shares + v_net_yield,
          updated_at = now()
      WHERE investor_id = (v_investor->>'investor_id')::uuid
        AND fund_id = p_fund_id;
    END IF;

    -- Record fee deduction
    IF v_fee_amount > 0 THEN
      -- Track platform fees (fee minus IB commission)
      v_total_platform_fees := v_total_platform_fees + (v_fee_amount - v_ib_amount);

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
        v_fee_amount,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':FEE',
        'Performance fee',
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'investor_visible',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Record fee allocation
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        base_net_income, fee_percentage, fee_amount,
        period_start, period_end, purpose, created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        v_indigo_fees_id,
        (v_investor->>'gross_yield')::numeric,
        (v_investor->>'fee_pct')::numeric,
        v_fee_amount,
        date_trunc('month', p_date)::date,
        (date_trunc('month', p_date) + interval '1 month' - interval '1 day')::date,
        v_purpose_enum,
        p_admin_id
      );
    END IF;

    -- Credit IB commission
    IF v_ib_amount > 0 AND (v_investor->>'ib_parent_id') IS NOT NULL THEN
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
        v_ib_amount,
        p_date,
        'yield:' || v_distribution_id || ':' || (v_investor->>'investor_id') || ':IB_CREDIT',
        'IB commission from ' || (v_investor->>'investor_name'),
        p_admin_id,
        v_purpose_enum,
        v_distribution_id,
        'admin_only',
        true,
        'yield_distribution'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update IB parent position: BOTH current_value AND shares
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount,
          shares = shares + v_ib_amount,
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
        v_ib_amount,
        p_date,
        v_purpose_enum,
        p_admin_id
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
      p_admin_id,
      v_purpose_enum,
      v_distribution_id,
      'admin_only',
      true,
      'yield_distribution'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    -- Update INDIGO FEES position: BOTH current_value AND shares
    UPDATE investor_positions
    SET current_value = current_value + v_total_platform_fees,
        shares = shares + v_total_platform_fees,
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id
      AND fund_id = p_fund_id;
  END IF;

  -- Record daily AUM
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (
    p_fund_id,
    p_date,
    (v_preview->>'current_aum')::numeric + p_gross_amount,
    v_purpose_enum,
    'yield_distribution:' || v_distribution_id,
    p_admin_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = EXCLUDED.source,
    updated_at = now(),
    updated_by = p_admin_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'effective_date', p_date,
      'gross_yield', p_gross_amount,
      'total_fees', (v_preview->>'total_fees')::numeric,
      'total_ib', (v_preview->>'total_ib')::numeric,
      'platform_fees', v_total_platform_fees,
      'investor_count', (v_preview->>'investor_count')::integer
    ),
    jsonb_build_object('purpose', p_purpose)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'effective_date', p_date,
    'gross_yield', p_gross_amount,
    'total_fees', (v_preview->>'total_fees')::numeric,
    'total_ib', (v_preview->>'total_ib')::numeric,
    'platform_fees', v_total_platform_fees,
    'total_net', (v_preview->>'total_net')::numeric,
    'investor_count', (v_preview->>'investor_count')::integer,
    'investors_updated', (v_preview->>'investor_count')::integer,
    'message', 'Yield distribution applied successfully'
  );
END;
$function$;

-- ============================================================================
-- Add missing foreign key constraints (with IF NOT EXISTS pattern)
-- ============================================================================

-- investor_positions foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_investor'
  ) THEN
    ALTER TABLE investor_positions 
    ADD CONSTRAINT fk_investor_positions_investor 
    FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_fund'
  ) THEN
    ALTER TABLE investor_positions 
    ADD CONSTRAINT fk_investor_positions_fund 
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- transactions_v2 foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_investor'
  ) THEN
    ALTER TABLE transactions_v2 
    ADD CONSTRAINT fk_transactions_v2_investor 
    FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund'
  ) THEN
    ALTER TABLE transactions_v2 
    ADD CONSTRAINT fk_transactions_v2_fund 
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;