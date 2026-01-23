-- Fix: Use valid tx_source enum value in apply_adb_yield_distribution
-- Issue: Function uses 'rpc' which is NOT a valid tx_source enum value
-- The trigger enforce_transaction_via_rpc only allows: rpc_canonical, crystallization, system, migration
-- Fix: Change 'rpc' to 'rpc_canonical'

-- ============================================================================
-- Fix apply_adb_yield_distribution with correct source value
-- ============================================================================
CREATE OR REPLACE FUNCTION apply_adb_yield_distribution(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'month_end',
  p_dust_tolerance numeric DEFAULT 0.01
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_distribution_id uuid;
  v_total_adb numeric := 0;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_allocation_count int := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_lock_key bigint;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_fee_tx_id uuid;
BEGIN
  -- *** CRITICAL: Enable canonical mutation flag ***
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF NOT is_admin() AND v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Validate parameters
  IF p_gross_yield_amount <= 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be positive';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  -- *** VALIDATION: Prevent future-dated yield distributions ***
  IF p_period_end > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot distribute yield for future dates. Period end (%) is after today (%).',
      p_period_end, CURRENT_DATE;
  END IF;

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Acquire fund-level lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || p_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check for existing distribution (idempotency)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND period_end = p_period_end
      AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, p_period_end;
  END IF;

  -- Calculate total ADB
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true;

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id,
    yield_date,
    period_start,
    period_end,
    gross_yield_amount,
    net_yield_amount,
    total_fees,
    total_ib_commission,
    status,
    created_by,
    calculation_method,
    purpose
  ) VALUES (
    p_fund_id,
    p_period_end,
    p_period_start,
    p_period_end,
    p_gross_yield_amount,
    0, -- Will be updated
    0, -- Will be updated
    0, -- Will be updated
    'applied'::yield_distribution_status,
    v_admin,
    'ADB',
    p_purpose
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor with positive ADB
  -- INDIGO FEES account (fees_account type) receives yield but pays 0% fee
  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.first_name || ' ' || p.last_name as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- INDIGO FEES (fees_account) always has 0% fee
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct,
        0
      ) END as fee_pct,
      -- INDIGO FEES has no IB commission
      -- FIXED: Use correct column names (ib_percentage, source_investor_id)
      CASE WHEN p.account_type = 'fees_account' THEN 0
      ELSE COALESCE(
        (SELECT iba.ib_percentage FROM ib_allocations iba
         WHERE iba.source_investor_id = ip.investor_id AND iba.fund_id = p_fund_id
         AND iba.is_voided = false
         ORDER BY iba.created_at DESC LIMIT 1),
        0
      ) END as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
  LOOP
    -- Calculate shares
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share;
    v_ib_share := ROUND((v_fee_share * v_investor.ib_rate)::numeric, 8);

    -- Skip if allocation is below dust tolerance
    IF v_gross_share < p_dust_tolerance THEN
      CONTINUE;
    END IF;

    -- Create yield allocation
    INSERT INTO yield_allocations (
      distribution_id,
      investor_id,
      fund_id,
      gross_amount,
      net_amount,
      fee_amount,
      fee_pct,
      ib_amount,
      adb_share,
      created_at
    ) VALUES (
      v_distribution_id,
      v_investor.investor_id,
      p_fund_id,
      v_gross_share,
      v_net_share,
      v_fee_share,
      v_investor.fee_pct,
      v_ib_share,
      v_investor.adb,
      NOW()
    );

    -- Create YIELD transaction for investor (NET amount)
    -- FIXED: Use 'rpc_canonical' (valid enum value allowed by trigger)
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount,
      tx_date, value_date, reference_id, notes,
      created_by, is_voided, source, created_at
    ) VALUES (
      v_investor.investor_id, p_fund_id, 'YIELD', v_fund.asset, v_net_share,
      p_period_end, p_period_end,
      'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      'ADB yield distribution for period ' || p_period_start::text || ' to ' || p_period_end::text,
      v_admin, false, 'rpc_canonical', NOW()
    );

    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_net_share, updated_at = NOW()
    WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;

    -- If fee was charged, create platform fee ledger entry
    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount,
        effective_date, asset, created_at, created_by, is_voided
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, v_investor.investor_name,
        v_gross_share, v_investor.fee_pct, v_fee_share,
        p_period_end, v_fund.asset, NOW(), v_admin, false
      );
    END IF;

    -- Update totals
    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- Create FEE_CREDIT transaction for INDIGO FEES account
  IF v_total_fees > 0 THEN
    -- FIXED: Use 'rpc_canonical' (valid enum value allowed by trigger)
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount,
      tx_date, value_date, reference_id, notes,
      created_by, is_voided, source, created_at
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_fund.asset, v_total_fees,
      p_period_end, p_period_end,
      'fee_credit_' || v_distribution_id::text,
      'Platform fees from yield distribution for ' || v_fund.code,
      v_admin, false, 'rpc_canonical', NOW()
    ) RETURNING id INTO v_fee_tx_id;

    -- Update INDIGO FEES position
    INSERT INTO investor_positions (investor_id, fund_id, current_value, is_active, updated_at)
    VALUES (v_indigo_fees_id, p_fund_id, v_total_fees, true, NOW())
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET current_value = investor_positions.current_value + EXCLUDED.current_value,
                  is_active = true, updated_at = NOW();
  END IF;

  -- Update distribution totals
  UPDATE yield_distributions
  SET
    net_yield_amount = v_total_net,
    total_fees = v_total_fees,
    total_fee_amount = v_total_fees,
    total_net_amount = v_total_net,
    total_ib_commission = v_total_ib,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_adb', v_total_adb,
    'gross_yield', p_gross_yield_amount,
    'allocated_gross', v_total_gross,
    'allocated_net', v_total_net,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'allocation_count', v_allocation_count,
    'investor_count', v_allocation_count,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < p_dust_tolerance,
    'days_in_period', p_period_end - p_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit']
  );
END;
$$;

COMMENT ON FUNCTION apply_adb_yield_distribution IS
'Apply yield using ADB method. FIXED: Uses rpc_canonical source (valid enum allowed by trigger).';
