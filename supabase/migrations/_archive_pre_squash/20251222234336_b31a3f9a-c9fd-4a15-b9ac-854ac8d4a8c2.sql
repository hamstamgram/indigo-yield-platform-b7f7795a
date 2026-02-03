-- =====================================================
-- FIX: Drop ALL duplicate yield function overloads
-- and recreate ONLY the correct versions
-- =====================================================

-- Step 1: Drop ALL existing overloads of preview_daily_yield_to_fund_v2
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(text, date, numeric, text);
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(text, date, numeric);

-- Step 2: Drop ALL existing overloads of apply_daily_yield_to_fund_v2
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(text, date, numeric, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(text, date, numeric);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, uuid);

-- =====================================================
-- Step 3: Create the CORRECT preview function
-- =====================================================
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_old_aum NUMERIC;
  v_growth_rate NUMERIC;
  v_gross_yield NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_investor_rows JSONB := '[]'::jsonb;
  v_fund RECORD;
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_investor_name TEXT;
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_position_value NUMERIC;
BEGIN
  -- Convert purpose string to enum
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

  -- Check if month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);

  -- Get previous AUM
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;

  -- Calculate total current positions for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_position_value
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := GREATEST(v_total_position_value, p_new_aum);
  END IF;

  IF v_old_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No previous AUM found and no positions exist');
  END IF;

  v_growth_rate := (p_new_aum - v_old_aum) / v_old_aum;
  v_gross_yield := p_new_aum - v_old_aum;

  -- Process each investor with positions
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name,
      p.ib_parent_id,
      p.ib_percentage,
      p.account_type
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    v_investor_count := v_investor_count + 1;
    v_investor_name := CONCAT(COALESCE(rec.first_name, ''), ' ', COALESCE(rec.last_name, ''));

    -- Calculate share of growth
    v_share := rec.current_value / v_old_aum;
    v_gross := v_gross_yield * v_share;

    -- INDIGO FEES account pays no fees
    IF rec.investor_id = v_indigo_fees_id OR rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
      v_ib_parent_id := NULL;
      v_ib_pct := 0;
      v_ib_amount := 0;
    ELSE
      -- Get investor's fee percentage from schedule
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
        AND effective_date <= p_date
      ORDER BY effective_date DESC, fund_id NULLS LAST
      LIMIT 1;

      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20; -- Default 20%
      END IF;

      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;

      -- IB allocation
      v_ib_parent_id := rec.ib_parent_id;
      v_ib_pct := COALESCE(rec.ib_percentage, 0);

      IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 THEN
        v_ib_amount := v_net * (v_ib_pct / 100.0);
        v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      ELSE
        v_ib_amount := 0;
      END IF;
    END IF;

    -- Add to results
    v_investor_rows := v_investor_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', TRIM(v_investor_name),
      'beginning_balance', rec.current_value,
      'share_pct', ROUND(v_share * 100, 4),
      'gross_yield', ROUND(v_gross, 6),
      'fee_pct', v_fee_pct,
      'fee_amount', ROUND(v_fee, 6),
      'net_yield', ROUND(v_net, 6),
      'ib_parent_id', v_ib_parent_id,
      'ib_pct', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount, 6),
      'ending_balance', ROUND(rec.current_value + v_net - v_ib_amount, 6),
      'is_fees_account', (rec.investor_id = v_indigo_fees_id OR rec.account_type = 'fees_account')
    );
  END LOOP;

  -- Return preview
  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_code', v_fund.code,
    'effective_date', p_date,
    'purpose', p_purpose,
    'is_month_end', v_is_month_end,
    'old_aum', v_old_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'growth_rate_pct', ROUND(v_growth_rate * 100, 4),
    'total_platform_fees', ROUND(v_total_fees, 6),
    'total_ib_fees', ROUND(v_total_ib_fees, 6),
    'net_to_indigo', ROUND(v_total_fees - v_total_ib_fees, 6),
    'investor_count', v_investor_count,
    'investors', v_investor_rows
  );
END;
$function$;

-- =====================================================
-- Step 4: Create the CORRECT apply function
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_distribution_id UUID;
  v_old_aum NUMERIC;
  v_growth_rate NUMERIC;
  v_gross_yield NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_fund RECORD;
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_position_value NUMERIC;
  v_ref_prefix TEXT;
  v_admin_id UUID;
  v_existing_dist_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Convert purpose string to enum
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose: ' || p_purpose);
  END;

  -- Check for existing distribution (idempotency)
  SELECT id INTO v_existing_dist_id
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date = p_date
    AND purpose = v_purpose_enum
    AND distribution_type = 'original'
    AND status = 'applied';

  IF v_existing_dist_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Yield already distributed for this fund, date, and purpose',
      'existing_distribution_id', v_existing_dist_id
    );
  END IF;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  v_distribution_id := gen_random_uuid();
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  v_ref_prefix := format('yield:%s:%s:%s:', v_distribution_id, p_fund_id, p_date);

  -- Get previous AUM
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;

  -- Calculate total current positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_position_value
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := GREATEST(v_total_position_value, p_new_aum);
  END IF;

  IF v_old_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No previous AUM and no positions');
  END IF;

  v_growth_rate := (p_new_aum - v_old_aum) / v_old_aum;
  v_gross_yield := p_new_aum - v_old_aum;

  -- Process each investor
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.ib_parent_id,
      p.ib_percentage,
      p.account_type
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;

    v_share := rec.current_value / v_old_aum;
    v_gross := v_gross_yield * v_share;

    -- INDIGO FEES pays no fees
    IF rec.investor_id = v_indigo_fees_id OR rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
      v_ib_parent_id := NULL;
      v_ib_pct := 0;
      v_ib_amount := 0;
    ELSE
      -- Get fee percentage
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
        AND effective_date <= p_date
      ORDER BY effective_date DESC, fund_id NULLS LAST
      LIMIT 1;

      IF v_fee_pct IS NULL THEN v_fee_pct := 20; END IF;

      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;

      v_ib_parent_id := rec.ib_parent_id;
      v_ib_pct := COALESCE(rec.ib_percentage, 0);

      IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 THEN
        v_ib_amount := v_net * (v_ib_pct / 100.0);
        v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      ELSE
        v_ib_amount := 0;
      END IF;
    END IF;

    -- Create INTEREST transaction for investor
    IF v_net <> 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        visibility_scope, is_system_generated, source
      ) VALUES (
        rec.investor_id, p_fund_id, 'INTEREST', v_fund.asset, v_fund.fund_class,
        v_net, p_date,
        v_ref_prefix || rec.investor_id || ':INTEREST',
        format('Net yield after %s%% fee', v_fee_pct),
        v_admin_id, v_purpose_enum, v_distribution_id,
        'investor_visible', true, 'yield_distribution'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + v_net, updated_at = NOW()
      WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
    END IF;

    -- Create FEE transaction (debit from investor perspective shown as negative)
    IF v_fee > 0 AND rec.investor_id != v_indigo_fees_id THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        visibility_scope, is_system_generated, source
      ) VALUES (
        rec.investor_id, p_fund_id, 'FEE', v_fund.asset, v_fund.fund_class,
        -v_fee, p_date,
        v_ref_prefix || rec.investor_id || ':FEE',
        format('Platform fee %s%%', v_fee_pct),
        v_admin_id, v_purpose_enum, v_distribution_id,
        'investor_visible', true, 'fee_allocation'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Record fee allocation
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income,
        fee_percentage, fee_amount, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_indigo_fees_id,
        date_trunc('month', p_date)::date, p_date, v_purpose_enum,
        v_gross, v_fee_pct, v_fee, v_admin_id
      )
      ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING;
    END IF;

    -- IB allocation
    IF v_ib_parent_id IS NOT NULL AND v_ib_amount > 0 THEN
      -- Credit IB parent
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        visibility_scope, is_system_generated, source
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_fund.asset, v_fund.fund_class,
        v_ib_amount, p_date,
        v_ref_prefix || rec.investor_id || ':IB_CREDIT',
        format('IB commission %s%% from investor', v_ib_pct),
        v_admin_id, v_purpose_enum, v_distribution_id,
        'admin_only', true, 'ib_allocation'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update IB parent position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount, updated_at = NOW()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;

      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, shares, cost_basis)
        VALUES (v_ib_parent_id, p_fund_id, v_fund.fund_class, v_ib_amount, 0, 0);
      END IF;

      -- Record IB allocation - use correct constraint columns
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        period_start, period_end, purpose, source_net_income,
        ib_percentage, ib_fee_amount, effective_date, source, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_ib_parent_id,
        date_trunc('month', p_date)::date, p_date, v_purpose_enum,
        v_net + v_ib_amount, v_ib_pct, v_ib_amount, p_date, 'from_platform_fees', v_admin_id
      )
      ON CONFLICT (source_investor_id, fund_id, effective_date, ib_investor_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Credit platform fees to INDIGO FEES
  IF v_total_fees - v_total_ib_fees > 0 THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, purpose, distribution_id,
      visibility_scope, is_system_generated, source
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_fund.fund_class,
      v_total_fees - v_total_ib_fees, p_date,
      v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT',
      format('Platform fees for %s', p_date),
      v_admin_id, v_purpose_enum, v_distribution_id,
      'admin_only', true, 'fee_allocation'
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE investor_positions
    SET current_value = current_value + (v_total_fees - v_total_ib_fees), updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;

    IF NOT FOUND THEN
      INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, shares, cost_basis)
      VALUES (v_indigo_fees_id, p_fund_id, v_fund.fund_class, v_total_fees - v_total_ib_fees, 0, 0);
    END IF;
  END IF;

  -- Record fund AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by
  ) VALUES (
    p_fund_id, p_date, p_new_aum, v_purpose_enum, v_is_month_end, 'yield_distribution', v_admin_id
  )
  ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    updated_at = NOW(),
    updated_by = v_admin_id;

  -- Record yield distribution
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end,
    recorded_aum, previous_aum, gross_yield,
    distribution_type, status, created_by
  ) VALUES (
    v_distribution_id, p_fund_id, p_date, v_purpose_enum, v_is_month_end,
    p_new_aum, v_old_aum, v_gross_yield,
    'original', 'applied', v_admin_id
  );

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'YIELD_DISTRIBUTION_APPLIED', 'yield_distributions', v_distribution_id::text,
    v_admin_id, jsonb_build_object(
      'fund_id', p_fund_id, 'date', p_date, 'purpose', p_purpose,
      'new_aum', p_new_aum, 'old_aum', v_old_aum, 'gross_yield', v_gross_yield,
      'investors', v_investor_count, 'total_fees', v_total_fees, 'total_ib', v_total_ib_fees
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'effective_date', p_date,
    'purpose', p_purpose,
    'old_aum', v_old_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'growth_rate_pct', ROUND(v_growth_rate * 100, 4),
    'investors_processed', v_investor_count,
    'total_platform_fees', ROUND(v_total_fees, 6),
    'total_ib_fees', ROUND(v_total_ib_fees, 6),
    'net_to_indigo', ROUND(v_total_fees - v_total_ib_fees, 6),
    'is_month_end', v_is_month_end
  );
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text) TO authenticated;