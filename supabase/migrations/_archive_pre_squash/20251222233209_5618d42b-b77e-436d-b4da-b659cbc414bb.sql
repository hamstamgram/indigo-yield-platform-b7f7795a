-- Fix account_type enum bug: change 'fees' to 'fees_account' in yield distribution functions

-- Fix preview_daily_yield_to_fund_v2
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
  v_old_aum NUMERIC;
  v_growth_rate NUMERIC;
  v_gross_yield NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_preview_rows JSONB := '[]'::jsonb;
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
  v_purpose_enum aum_purpose;
BEGIN
  -- Get INDIGO FEES account ID
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Cast purpose to enum
  v_purpose_enum := p_purpose::aum_purpose;

  -- Check if this is month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);

  -- Get previous AUM for the fund
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := p_new_aum;
    v_growth_rate := 0;
    v_gross_yield := 0;
  ELSE
    v_growth_rate := (p_new_aum - v_old_aum) / v_old_aum;
    v_gross_yield := p_new_aum - v_old_aum;
  END IF;

  -- Process ALL investors with positions in this fund
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name,
      p.company_name,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Calculate investor's share of growth
    v_share := rec.current_value / NULLIF(v_old_aum, 0);
    v_gross := v_gross_yield * COALESCE(v_share, 0);

    -- INDIGO FEES does NOT pay fees (it's the fee collector)
    IF rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get investor's fee percentage
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
      ORDER BY effective_date DESC
      LIMIT 1;

      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20;
      END IF;

      -- Calculate fee and net income
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;

    -- IB calculation
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;

    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0 
       AND rec.account_type != 'fees_account' THEN
      v_ib_amount := v_net * (v_ib_pct / 100.0);
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
    END IF;

    -- Add to preview
    v_preview_rows := v_preview_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', COALESCE(rec.company_name, CONCAT(rec.first_name, ' ', rec.last_name)),
      'current_value', rec.current_value,
      'share_pct', ROUND(COALESCE(v_share, 0) * 100, 4),
      'gross_yield', ROUND(v_gross, 2),
      'fee_pct', v_fee_pct,
      'fee_amount', ROUND(v_fee, 2),
      'net_yield', ROUND(v_net, 2),
      'ib_parent_id', v_ib_parent_id,
      'ib_pct', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount, 2),
      'is_fees_account', rec.account_type = 'fees_account'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'date', p_date,
    'purpose', p_purpose,
    'old_aum', v_old_aum,
    'new_aum', p_new_aum,
    'gross_yield', v_gross_yield,
    'growth_rate_pct', ROUND(v_growth_rate * 100, 4),
    'is_month_end', v_is_month_end,
    'investor_count', v_investor_count,
    'total_platform_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'investors', v_preview_rows
  );
END;
$function$;

-- Fix apply_daily_yield_to_fund_v2
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_distribution_id UUID;
  v_old_aum NUMERIC;
  v_new_aum NUMERIC;
  v_growth_rate NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ib_source TEXT;
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID;
  v_purpose_enum aum_purpose;
  v_fund RECORD;
BEGIN
  -- Get INDIGO FEES account ID
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  -- Cast purpose to enum
  v_purpose_enum := p_purpose::aum_purpose;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;

  -- Generate unique distribution ID for this run
  v_distribution_id := gen_random_uuid();

  -- Check if this is month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);

  -- Get previous AUM for the fund
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date < p_date
    AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;

  -- Calculate new AUM
  v_new_aum := COALESCE(v_old_aum, 0) + p_gross_amount;

  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := v_new_aum;
    v_growth_rate := 0;
  ELSE
    v_growth_rate := p_gross_amount / v_old_aum;
  END IF;

  -- Check for existing distribution to prevent duplicates
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date = p_date
      AND purpose = v_purpose_enum
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Yield already distributed for this fund, date, and purpose'
    );
  END IF;

  -- Process ALL investors with positions in this fund
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;

    -- Calculate investor's share of growth
    v_share := rec.current_value / NULLIF(v_old_aum, 0);
    v_gross := p_gross_amount * COALESCE(v_share, 0);

    -- INDIGO FEES does NOT pay fees
    IF rec.account_type = 'fees_account' THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;

      -- Record INTEREST transaction for INDIGO FEES
      IF v_net > 0 THEN
        INSERT INTO transactions_v2 (
          investor_id, fund_id, type, asset, fund_class, amount, tx_date, 
          reference_id, notes, created_by, purpose, distribution_id,
          source, is_system_generated, visibility_scope
        ) VALUES (
          rec.investor_id, p_fund_id, 'INTEREST', v_fund.asset, v_fund.fund_class, v_net, p_date,
          format('interest:%s:%s:%s:%s', v_distribution_id, p_fund_id, rec.investor_id, p_date),
          format('Yield on fee account holdings for %s', p_date),
          p_admin_id, v_purpose_enum, v_distribution_id,
          'yield_distribution', true, 'admin_only'
        )
        ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      END IF;
    ELSE
      -- Get investor's fee percentage
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
      ORDER BY effective_date DESC
      LIMIT 1;

      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20;
      END IF;

      -- Calculate fee and net income
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;

      -- Record INTEREST transaction for investor
      IF v_net > 0 THEN
        INSERT INTO transactions_v2 (
          investor_id, fund_id, type, asset, fund_class, amount, tx_date,
          reference_id, notes, created_by, purpose, distribution_id,
          source, is_system_generated, visibility_scope
        ) VALUES (
          rec.investor_id, p_fund_id, 'INTEREST', v_fund.asset, v_fund.fund_class, v_net, p_date,
          format('interest:%s:%s:%s:%s', v_distribution_id, p_fund_id, rec.investor_id, p_date),
          format('Net yield after %s%% fee for %s', v_fee_pct, p_date),
          p_admin_id, v_purpose_enum, v_distribution_id,
          'yield_distribution', true, 'investor_visible'
        )
        ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      END IF;

      -- Record fee allocation
      IF v_is_month_end AND v_fee > 0 THEN
        INSERT INTO fee_allocations (
          distribution_id, fund_id, investor_id, fees_account_id,
          period_start, period_end, purpose, base_net_income,
          fee_percentage, fee_amount, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, rec.investor_id, v_indigo_fees_id,
          date_trunc('month', p_date)::date, p_date, v_purpose_enum,
          v_gross, v_fee_pct, v_fee, p_admin_id
        )
        ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING;
      END IF;
    END IF;

    -- IB allocation - ONLY for reporting purpose and month end
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);

    IF v_purpose_enum = 'reporting' AND v_is_month_end 
       AND v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0
       AND rec.account_type != 'fees_account' THEN

      v_ib_amount := v_net * (v_ib_pct / 100.0);

      -- Determine source
      IF v_total_fees >= v_ib_amount THEN
        v_ib_source := 'from_platform_fees';
        v_total_fees := v_total_fees - v_ib_amount;
      ELSE
        v_ib_source := 'from_investor_yield';
        v_net := v_net - v_ib_amount;
      END IF;

      v_total_ib_fees := v_total_ib_fees + v_ib_amount;

      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        period_start, period_end, purpose, source_net_income,
        ib_percentage, ib_fee_amount, source, effective_date, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_ib_parent_id,
        date_trunc('month', p_date)::date, p_date, v_purpose_enum,
        v_net + v_ib_amount, v_ib_pct, v_ib_amount, v_ib_source, p_date, p_admin_id
      )
      ON CONFLICT (distribution_id, fund_id, source_investor_id, ib_investor_id) 
      WHERE distribution_id IS NOT NULL DO NOTHING;

      -- Credit IB parent
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, purpose, distribution_id,
        source, is_system_generated, visibility_scope
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_fund.asset, v_fund.fund_class, v_ib_amount, p_date,
        format('ib_credit:%s:%s:%s:%s', v_distribution_id, p_fund_id, rec.investor_id, p_date),
        format('IB fee from investor: %s%% of net income', v_ib_pct),
        p_admin_id, v_purpose_enum, v_distribution_id,
        'ib_allocation', true, 'admin_only'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Update IB parent's position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount, updated_at = NOW()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;

      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class)
        VALUES (v_ib_parent_id, p_fund_id, v_ib_amount, 0, 0, v_fund.fund_class);
      END IF;
    END IF;

    -- Update investor position with net yield
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = NOW()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
  END LOOP;

  -- Credit remaining platform fees to INDIGO FEES account
  IF v_total_fees > 0 THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, purpose, distribution_id,
      source, is_system_generated, visibility_scope
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_fund.fund_class, v_total_fees, p_date,
      format('fee_credit:%s:%s:%s', v_distribution_id, p_fund_id, p_date),
      format('Platform fees for %s distribution on %s', p_purpose, p_date),
      p_admin_id, v_purpose_enum, v_distribution_id,
      'fee_allocation', true, 'admin_only'
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE investor_positions
    SET current_value = current_value + v_total_fees, updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;

    IF NOT FOUND THEN
      INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class)
      VALUES (v_indigo_fees_id, p_fund_id, v_total_fees, 0, 0, v_fund.fund_class);
    END IF;
  END IF;

  -- Record fund AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by
  ) VALUES (
    p_fund_id, p_date, v_new_aum, v_purpose_enum, v_is_month_end, 'yield_distribution', p_admin_id
  );

  -- Record yield distribution
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum,
    gross_yield, distribution_type, status, created_by
  ) VALUES (
    v_distribution_id, p_fund_id, p_date, v_purpose_enum, v_is_month_end, v_new_aum,
    p_gross_amount, 'original', 'applied', p_admin_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investors_processed', v_investor_count,
    'total_platform_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'growth_rate', v_growth_rate,
    'is_month_end', v_is_month_end,
    'old_aum', v_old_aum,
    'new_aum', v_new_aum
  );
END;
$function$;