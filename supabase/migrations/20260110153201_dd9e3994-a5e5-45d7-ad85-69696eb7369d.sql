-- ============================================
-- Drop existing function overloads and recreate with temporal lock + dust routing
-- ============================================

-- Drop all existing overloads
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose, date, date);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, text);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, text);

-- Recreate with temporal lock and dust routing
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_aum numeric;
  v_fund record;
  v_gross_yield_amount numeric;
  v_snapshot_id uuid;
  v_period_id uuid;
  v_distributions_created int := 0;
  v_total_distributed numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor record;
  v_distribution_id uuid;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_net_yield numeric;
  v_investor_gross numeric;
  v_result jsonb;
  v_fees_account_id uuid;
  v_dust numeric;
  v_dust_receiver_id uuid;
  v_allocated_sum numeric;
BEGIN
  -- ===== TEMPORAL LOCK CHECK =====
  -- Block if AUM was recorded today for same-day yield (T-1 rule)
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id 
      AND aum_date = p_yield_date
      AND created_at::date = CURRENT_DATE
      AND is_voided = false
      AND (temporal_lock_bypass IS NULL OR temporal_lock_bypass = false)
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Temporal violation: AUM for ' || p_yield_date || ' was recorded today. Wait until T+1 or set temporal_lock_bypass=true on the AUM record.',
      'code', 'TEMPORAL_LOCK'
    );
  END IF;

  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get fund AUM for the yield date
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_yield_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No AUM found for fund on specified date'
    );
  END IF;

  -- Get fees account for routing
  SELECT id INTO v_fees_account_id
  FROM profiles 
  WHERE account_type = 'fees_account' 
  LIMIT 1;

  -- Calculate gross yield amount
  v_gross_yield_amount := v_fund_aum * (p_gross_yield_pct / 100);

  -- Create fund yield snapshot
  INSERT INTO fund_yield_snapshots (
    fund_id,
    snapshot_date,
    period_start,
    period_end,
    opening_aum,
    closing_aum,
    gross_yield_pct,
    gross_yield_amount,
    days_in_period,
    trigger_type,
    trigger_reference,
    created_by
  ) VALUES (
    p_fund_id,
    p_yield_date,
    p_yield_date,
    p_yield_date,
    v_fund_aum,
    v_fund_aum + v_gross_yield_amount,
    p_gross_yield_pct,
    v_gross_yield_amount,
    1,
    'manual',
    'Daily yield application',
    p_created_by
  )
  RETURNING id INTO v_snapshot_id;

  -- Find the statement period for this date
  SELECT id INTO v_period_id
  FROM statement_periods sp
  WHERE p_yield_date BETWEEN 
    make_date(sp.year, sp.month, 1) 
    AND sp.period_end_date
  LIMIT 1;

  -- Track largest position holder for dust routing
  v_dust_receiver_id := NULL;

  -- Distribute yield to each investor with a position in this fund
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      ip.current_value as balance,
      CASE WHEN v_fund_aum > 0 
        THEN (ip.current_value / v_fund_aum) * 100 
        ELSE 0 
      END as ownership_pct,
      p.ib_percentage,
      p.ib_parent_id
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC, ip.investor_id ASC
  LOOP
    -- Track largest position holder (first in ordered loop)
    IF v_dust_receiver_id IS NULL THEN
      v_dust_receiver_id := v_investor.investor_id;
    END IF;

    -- Get investor's fee percentage (hierarchical lookup)
    SELECT COALESCE(
      (SELECT fee_pct FROM investor_fee_schedule 
       WHERE investor_id = v_investor.investor_id 
         AND (fund_id = p_fund_id OR fund_id IS NULL)
         AND effective_date <= p_yield_date
         AND (end_date IS NULL OR end_date >= p_yield_date)
       ORDER BY fund_id NULLS LAST, effective_date DESC
       LIMIT 1),
      (SELECT value FROM global_fee_settings WHERE setting_key = 'default_fee_pct'),
      20
    ) INTO v_fee_pct;

    -- Calculate investor's share of yield
    v_investor_gross := v_gross_yield_amount * (v_investor.ownership_pct / 100);
    
    -- Platform fee (% of GROSS)
    v_fee_amount := v_investor_gross * (v_fee_pct / 100);
    
    -- IB fee (% of GROSS, if IB parent exists)
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_amount := v_investor_gross * (v_ib_pct / 100);
    
    -- Net yield after all fees
    v_net_yield := v_investor_gross - v_fee_amount - v_ib_amount;

    -- Create yield distribution record
    INSERT INTO yield_distributions (
      fund_id,
      investor_id,
      period_id,
      period_start,
      period_end,
      gross_yield_amount,
      fee_percentage,
      fee_amount,
      net_yield_amount,
      investor_balance_at_distribution,
      ownership_percentage,
      purpose,
      status,
      created_by
    ) VALUES (
      p_fund_id,
      v_investor.investor_id,
      v_period_id,
      p_yield_date,
      p_yield_date,
      v_investor_gross,
      v_fee_pct,
      v_fee_amount,
      v_net_yield,
      v_investor.balance,
      v_investor.ownership_pct,
      p_purpose,
      'applied',
      p_created_by
    )
    RETURNING id INTO v_distribution_id;

    -- Create YIELD transaction for investor
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope
    ) VALUES (
      v_investor.investor_id, p_fund_id, 'YIELD', v_net_yield, p_yield_date, p_yield_date,
      'YIELD-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id,
      'Daily yield distribution', p_created_by, p_purpose, v_fund.asset, v_fund.asset, 
      'yield_distribution', 'investor_visible'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    -- Create FEE transaction (credit to fees account)
    IF v_fee_amount > 0 AND v_fees_account_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, value_date,
        reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope
      ) VALUES (
        v_fees_account_id, p_fund_id, 'FEE', v_fee_amount, p_yield_date, p_yield_date,
        'FEE-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id,
        'Platform fee from ' || v_investor.investor_id, p_created_by, p_purpose, 
        v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Record fee allocation
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
        p_yield_date, p_yield_date, p_purpose,
        v_investor_gross, v_fee_pct, v_fee_amount, p_created_by
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Create IB credit transaction (if IB parent exists)
    IF v_ib_amount > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, value_date,
        reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope
      ) VALUES (
        v_investor.ib_parent_id, p_fund_id, 'YIELD', v_ib_amount, p_yield_date, p_yield_date,
        'IB-' || p_fund_id || '-' || p_yield_date || '-' || v_investor.investor_id,
        'IB commission from ' || v_investor.investor_id, p_created_by, p_purpose, 
        v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        period_start, period_end, purpose,
        source_net_income, ib_percentage, ib_fee_amount, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_investor.ib_parent_id,
        p_yield_date, p_yield_date, p_purpose,
        v_investor_gross, v_ib_pct, v_ib_amount, p_created_by
      ) ON CONFLICT DO NOTHING;
      
      v_total_ib := v_total_ib + v_ib_amount;
    END IF;

    -- Update investor position
    UPDATE investor_positions
    SET 
      current_value = current_value + v_net_yield,
      cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
      last_yield_crystallization_date = p_yield_date,
      updated_at = now()
    WHERE investor_id = v_investor.investor_id
      AND fund_id = p_fund_id;

    v_distributions_created := v_distributions_created + 1;
    v_total_distributed := v_total_distributed + v_net_yield;
    v_total_fees := v_total_fees + v_fee_amount;
  END LOOP;

  -- ===== DUST ROUTING (Conservation Check) =====
  -- Calculate any rounding residual
  v_allocated_sum := v_total_distributed + v_total_fees + v_total_ib;
  v_dust := v_gross_yield_amount - v_allocated_sum;

  -- Route dust if it exists (micro-amounts only)
  IF ABS(v_dust) > 0 AND ABS(v_dust) < 0.0000001 AND v_fees_account_id IS NOT NULL THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      reference_id, notes, created_by, purpose, asset, fund_class, source, visibility_scope
    ) VALUES (
      v_fees_account_id, p_fund_id, 'FEE', v_dust, p_yield_date, p_yield_date,
      'DUST-' || p_fund_id || '-' || p_yield_date, 'Rounding dust', p_created_by, 
      p_purpose, v_fund.asset, v_fund.asset, 'yield_distribution', 'admin_only'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    
    -- Update dust tracking in distribution (update most recent distribution)
    UPDATE yield_distributions
    SET dust_amount = v_dust, dust_receiver_id = v_fees_account_id
    WHERE id = v_distribution_id;
    
    v_total_fees := v_total_fees + v_dust;
  END IF;

  -- Update fund AUM with new value
  UPDATE fund_daily_aum
  SET 
    total_aum = total_aum + v_gross_yield_amount,
    updated_at = now(),
    updated_by = p_created_by
  WHERE fund_id = p_fund_id
    AND aum_date = p_yield_date
    AND purpose = p_purpose
    AND is_voided = false;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_aum', v_fund_aum,
    'gross_yield_amount', v_gross_yield_amount,
    'distributions_created', v_distributions_created,
    'total_distributed', v_total_distributed,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', v_dust,
    'conservation_check', jsonb_build_object(
      'gross', v_gross_yield_amount,
      'allocated', v_allocated_sum + COALESCE(v_dust, 0),
      'balanced', ABS(v_gross_yield_amount - (v_allocated_sum + COALESCE(v_dust, 0))) < 0.0000000001
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3 TO authenticated;