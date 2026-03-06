CREATE OR REPLACE FUNCTION public.apply_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  p_dust_tolerance numeric := 0.01;
BEGIN
  -- *** CRITICAL: Enable canonical mutation flag ***
  -- UPDATED: Use 'indigo.canonical_rpc' to match is_canonical_rpc() check
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Validate parameters
  IF p_gross_yield_amount <= 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be positive';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
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
    effective_date,
    yield_date,
    period_start,
    period_end,
    gross_yield_amount,
    total_net_amount,
    total_fee_amount,
    total_ib_amount,
    status,
    created_by,
    calculation_method,
    purpose
  ) VALUES (
    p_fund_id,
    p_period_end,
    p_period_end,
    p_period_start,
    p_period_end,
    p_gross_yield_amount,
    0,
    0,
    0,
    'applied'::yield_distribution_status,
    v_admin,
    'ADB',
    p_purpose
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor with positive ADB
  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      COALESCE(
        (SELECT ifs.fee_percentage FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        (SELECT gs.setting_value::numeric FROM global_fee_settings gs WHERE gs.setting_key = 'default_fee_pct'),
        0
      ) as fee_pct,
      COALESCE(
        (SELECT iba.commission_rate FROM ib_allocations iba
         WHERE iba.investor_id = ip.investor_id AND iba.fund_id = p_fund_id
         AND iba.is_voided = false
         ORDER BY iba.created_at DESC LIMIT 1),
        0
      ) as ib_rate
    FROM investor_positions ip
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
      v_ib_share,
      v_investor.adb,
      NOW()
    );

    -- Create YIELD transaction for investor
    PERFORM apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := v_net_share,
      p_tx_date := p_period_end,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || p_period_start::text || ' to ' || p_period_end::text,
      p_admin_id := v_admin,
      p_purpose := 'transaction'::aum_purpose
    );

    -- Update totals
    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- Update distribution totals
  UPDATE yield_distributions
  SET
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
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
    'total_loss_offset', 0,
    'features', ARRAY['time_weighted', 'loss_carryforward']
  );
END;
$function$;
