-- Fix company_name column bug in yield distribution functions
-- The profiles table uses first_name/last_name, not company_name

-- Drop and recreate preview_daily_yield_to_fund_v2 with correct column references
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_aum NUMERIC;
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
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID;
  v_ib_parent_name TEXT;
BEGIN
  -- Get INDIGO FEES account ID
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

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
    AND purpose = p_purpose
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := p_new_aum;
  END IF;

  v_gross_yield := p_new_aum - v_old_aum;

  -- Process each investor with positions in this fund
  FOR rec IN
    SELECT
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage,
      ifs.fee_pct as custom_fee_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
      AND ifs.effective_date <= p_date
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ifs.effective_date DESC NULLS LAST
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Calculate share of growth
    v_share := rec.current_value / NULLIF(v_old_aum, 0);
    v_gross := v_gross_yield * COALESCE(v_share, 0);

    -- INDIGO FEES account doesn't pay fees
    IF rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get fee percentage
      v_fee_pct := COALESCE(rec.custom_fee_pct, 20);
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;

    -- IB calculation
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;
    v_ib_parent_name := NULL;

    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 AND rec.account_type != 'fees_account' THEN
      v_ib_amount := v_net * (v_ib_pct / 100.0);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;

      -- Get IB parent name using first_name and last_name
      SELECT CONCAT(first_name, ' ', last_name) INTO v_ib_parent_name
      FROM profiles WHERE id = v_ib_parent_id;
    END IF;

    -- Add to result array
    v_investor_rows := v_investor_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', CONCAT(rec.first_name, ' ', rec.last_name),
      'current_balance', rec.current_value,
      'ownership_pct', COALESCE(v_share * 100, 0),
      'gross_yield', v_gross,
      'fee_pct', v_fee_pct,
      'fee_amount', v_fee,
      'net_yield', v_net,
      'ib_parent_id', v_ib_parent_id,
      'ib_parent_name', v_ib_parent_name,
      'ib_pct', v_ib_pct,
      'ib_amount', v_ib_amount,
      'is_fees_account', rec.account_type = 'fees_account'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_asset', v_fund.asset,
    'effective_date', p_date,
    'purpose', p_purpose,
    'is_month_end', v_is_month_end,
    'old_aum', v_old_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'net_yield', v_gross_yield - v_total_fees,
    'investor_count', v_investor_count,
    'investors', v_investor_rows
  );
END;
$$;

-- Drop and recreate apply_daily_yield_to_fund_v2 with correct column references
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_new_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_distribution_id UUID;
  v_old_aum NUMERIC;
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
  v_indigo_fees_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Generate distribution ID
  v_distribution_id := gen_random_uuid();

  -- Get INDIGO FEES account ID
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);

  -- Check for existing distribution (idempotency)
  SELECT COUNT(*) INTO v_existing_count
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_date
    AND purpose = p_purpose;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Yield already distributed for this fund, date, and purpose'
    );
  END IF;

  -- Get previous AUM
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = p_purpose
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := p_new_aum;
  END IF;

  v_gross_yield := p_new_aum - v_old_aum;

  -- Process each investor
  FOR rec IN
    SELECT
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage,
      ifs.fee_pct as custom_fee_pct
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
      AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
      AND ifs.effective_date <= p_date
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ifs.effective_date DESC NULLS LAST
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Calculate share of growth
    v_share := rec.current_value / NULLIF(v_old_aum, 0);
    v_gross := v_gross_yield * COALESCE(v_share, 0);

    -- INDIGO FEES account doesn't pay fees
    IF rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      v_fee_pct := COALESCE(rec.custom_fee_pct, 20);
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;

    -- Record INTEREST transaction
    IF v_net != 0 THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        visibility_scope, is_system_generated, source
      ) VALUES (
        rec.investor_id, p_fund_id, 'INTEREST', v_fund.asset, v_fund.fund_class,
        v_net, p_date,
        format('yield:%s:%s:%s', v_distribution_id, rec.investor_id, p_date),
        format('Net yield after %s%% fee', v_fee_pct),
        p_created_by, p_purpose, v_distribution_id,
        'investor_visible', true, 'yield_distribution'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    END IF;

    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = NOW()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    -- IB allocation
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);

    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 AND rec.account_type != 'fees_account' THEN
      v_ib_amount := v_net * (v_ib_pct / 100.0);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;

      -- Record IB credit transaction
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        visibility_scope, is_system_generated, source
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_fund.asset, v_fund.fund_class,
        v_ib_amount, p_date,
        format('ib:%s:%s:%s', v_distribution_id, rec.investor_id, p_date),
        format('IB commission from %s %s', rec.first_name, rec.last_name),
        p_created_by, p_purpose, v_distribution_id,
        'admin_only', true, 'ib_allocation'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update IB parent position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount, updated_at = NOW()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;

      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        period_start, period_end, purpose, source_net_income,
        ib_percentage, ib_fee_amount, effective_date, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_ib_parent_id,
        date_trunc('month', p_date)::date, p_date, p_purpose,
        v_net, v_ib_pct, v_ib_amount, p_date, p_created_by
      )
      ON CONFLICT (distribution_id, fund_id, source_investor_id, ib_investor_id)
      WHERE distribution_id IS NOT NULL DO NOTHING;
    END IF;
  END LOOP;

  -- Credit platform fees to INDIGO FEES account
  IF v_total_fees > 0 AND v_indigo_fees_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, purpose, distribution_id,
      visibility_scope, is_system_generated, source
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_fund.fund_class,
      v_total_fees, p_date,
      format('fees:%s:%s', v_distribution_id, p_date),
      'Platform fee collection',
      p_created_by, p_purpose, v_distribution_id,
      'admin_only', true, 'fee_allocation'
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE investor_positions
    SET current_value = current_value + v_total_fees, updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
  END IF;

  -- Record fund AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by
  ) VALUES (
    p_fund_id, p_date, p_new_aum, p_purpose, v_is_month_end, 'yield_distribution', p_created_by
  );

  -- Record yield distribution
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum,
    gross_yield, distribution_type, status, created_by
  ) VALUES (
    v_distribution_id, p_fund_id, p_date, p_purpose, v_is_month_end, p_new_aum,
    v_gross_yield, 'original', 'applied', p_created_by
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
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'investor_count', v_investor_count,
    'is_month_end', v_is_month_end
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose, uuid) TO authenticated;