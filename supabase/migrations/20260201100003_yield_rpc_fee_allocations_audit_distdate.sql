-- Migration: Update apply_adb_yield_distribution_v3
-- 1. Add p_distribution_date parameter (use for tx_date instead of period_end)
-- 2. Populate fee_allocations table
-- 3. Add audit_log entry for yield distributions

CREATE OR REPLACE FUNCTION public.apply_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_date date DEFAULT CURRENT_DATE
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
  v_current_aum numeric := 0;
  v_fees_account_id uuid;
  v_fee_tx jsonb;
  v_fee_tx_id uuid;
  v_ib_tx jsonb;
  v_ib_tx_id uuid;
  v_yield_tx jsonb;
  v_yield_tx_id uuid;
  v_is_month_end boolean := false;
  v_latest_tx_date date;
  v_period_start date := p_period_start;
  v_period_end date := p_period_end;
  v_gross_yield_amount numeric := p_gross_yield_amount;
  v_tx_count int := 0;
  p_dust_tolerance numeric := 0.01;
  v_tx_date date;
BEGIN
  -- *** CRITICAL: Enable canonical mutation flag ***
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Use distribution date for transaction booking; fall back to today
  v_tx_date := COALESCE(p_distribution_date, CURRENT_DATE);

  -- Reporting mode: prefer explicit period (p_period_end), fallback to latest transaction month
  IF p_purpose = 'reporting'::aum_purpose THEN
    IF p_period_end IS NOT NULL THEN
      v_period_start := date_trunc('month', p_period_end)::date;
      v_period_end := (date_trunc('month', p_period_end)::date + interval '1 month - 1 day')::date;

      SELECT COUNT(*) INTO v_tx_count
      FROM transactions_v2
      WHERE fund_id = p_fund_id
        AND is_voided = false
        AND tx_date >= v_period_start
        AND tx_date <= v_period_end;

      IF v_tx_count = 0 THEN
        RAISE EXCEPTION 'No transactions found for fund % in reporting period % - %', p_fund_id, v_period_start, v_period_end;
      END IF;
    ELSE
      SELECT MAX(tx_date)::date
      INTO v_latest_tx_date
      FROM transactions_v2
      WHERE fund_id = p_fund_id
        AND is_voided = false;

      IF v_latest_tx_date IS NULL THEN
        RAISE EXCEPTION 'No transactions found for fund % to derive reporting period', p_fund_id;
      END IF;

      v_period_start := date_trunc('month', v_latest_tx_date)::date;
      v_period_end := (date_trunc('month', v_latest_tx_date)::date + interval '1 month - 1 day')::date;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_gross_yield_amount
    FROM transactions_v2
    WHERE fund_id = p_fund_id
      AND is_voided = false
      AND type = 'YIELD'::tx_type
      AND tx_date >= v_period_start
      AND tx_date <= v_period_end;
  END IF;

  -- Validate parameters
  IF v_gross_yield_amount < 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be non-negative';
  END IF;

  IF v_period_end < v_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Fees account (platform)
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured (profiles.account_type=fees_account)';
  END IF;

  -- Determine month-end flag
  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end)::date + interval '1 month - 1 day')::date);

  -- Acquire fund-level lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Check for existing distribution (idempotency)
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND period_end = v_period_end
      AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, v_period_end;
  END IF;

  -- Calculate current AUM for recorded/previous values (investor + IB positions)
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_current_aum
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib');

  -- Calculate total ADB (investor + IB positions)
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib');

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
    recorded_aum,
    previous_aum,
    gross_yield,
    gross_yield_amount,
    total_net_amount,
    total_fee_amount,
    total_ib_amount,
    net_yield,
    total_fees,
    total_ib,
    status,
    created_by,
    calculation_method,
    purpose,
    is_month_end
  ) VALUES (
    p_fund_id,
    v_period_end,
    v_period_end,
    v_period_start,
    v_period_end,
    v_current_aum + v_gross_yield_amount,
    v_current_aum,
    v_gross_yield_amount,
    v_gross_yield_amount,
    0,
    0,
    0,
    0,
    0,
    0,
    'applied'::yield_distribution_status,
    v_admin,
    'ADB',
    p_purpose,
    v_is_month_end
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor with positive ADB (investor + IB accounts)
  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      CASE
        WHEN p.account_type = 'ib' THEN 0
        ELSE COALESCE(
          (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
           WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
           ORDER BY ifs.created_at DESC LIMIT 1),
          p.fee_pct,
          0
        )
      END as fee_pct,
      COALESCE(
        (SELECT CASE WHEN p.ib_parent_id IS NULL THEN 0 ELSE COALESCE(p.ib_percentage, 0) END
         FROM profiles p WHERE p.id = ip.investor_id),
        0
      ) as ib_rate,
      p.ib_parent_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) > 0
  LOOP
    -- Calculate shares
    v_gross_share := ROUND((v_investor.adb / v_total_adb * v_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    -- Skip if allocation is below dust tolerance
    IF v_gross_share < p_dust_tolerance THEN
      CONTINUE;
    END IF;

    -- Create YIELD transaction for investor (use v_tx_date = distribution date)
    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := v_net_share,
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_yield_tx->>'tx_id', '')::uuid;

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
      fee_pct,
      ib_pct,
      transaction_id,
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
      v_investor.fee_pct,
      v_investor.ib_rate,
      v_yield_tx_id,
      NOW()
    );

    -- Log fee allocation to platform_fee_ledger (per investor)
    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id,
        yield_distribution_id,
        investor_id,
        investor_name,
        gross_yield_amount,
        fee_percentage,
        fee_amount,
        effective_date,
        asset,
        transaction_id,
        created_by
      ) VALUES (
        p_fund_id,
        v_distribution_id,
        v_investor.investor_id,
        NULLIF(v_investor.investor_name, ''),
        v_gross_share,
        v_investor.fee_pct,
        v_fee_share,
        v_period_end,
        v_fund.asset,
        NULL,
        v_admin
      );
    END IF;

    -- IB credit + ledger (use v_tx_date = distribution date)
    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_ib_share,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

      UPDATE yield_allocations
      SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id
        AND investor_id = v_investor.investor_id
        AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id,
        yield_distribution_id,
        source_investor_id,
        source_investor_name,
        ib_id,
        ib_name,
        gross_yield_amount,
        ib_percentage,
        ib_commission_amount,
        effective_date,
        asset,
        transaction_id,
        created_by
      )
      SELECT
        p_fund_id,
        v_distribution_id,
        v_investor.investor_id,
        NULLIF(v_investor.investor_name, ''),
        v_investor.ib_parent_id,
        trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
        v_gross_share,
        v_investor.ib_rate,
        v_ib_share,
        v_period_end,
        v_fund.asset,
        v_ib_tx_id,
        v_admin
      FROM profiles ib
      WHERE ib.id = v_investor.ib_parent_id;
    END IF;

    -- Populate fee_allocations table (per investor, if fee > 0)
    IF v_fee_share > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id,
        fund_id,
        investor_id,
        fees_account_id,
        period_start,
        period_end,
        purpose,
        base_net_income,
        fee_percentage,
        fee_amount,
        credit_transaction_id,
        created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        v_investor.investor_id,
        v_fees_account_id,
        v_period_start,
        v_period_end,
        p_purpose,
        v_gross_share,
        v_investor.fee_pct,
        v_fee_share,
        NULL, -- credit_transaction_id updated after FEE_CREDIT tx below
        v_admin
      );
    END IF;

    -- Update totals
    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- Create single fee credit transaction for the distribution total (use v_tx_date)
  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees collected after IB for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger
    SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id
      AND transaction_id IS NULL;

    UPDATE yield_allocations
    SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id
      AND fee_amount > 0
      AND fee_transaction_id IS NULL;

    -- Link fee_allocations to the FEE_CREDIT transaction
    UPDATE fee_allocations
    SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id
      AND credit_transaction_id IS NULL;
  END IF;

  -- Update distribution totals
  UPDATE yield_distributions
  SET
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Ensure a reporting AUM record exists for recorded yields
  IF NOT EXISTS (
    SELECT 1
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date = v_period_end
      AND purpose = p_purpose
      AND is_voided = false
  ) THEN
    INSERT INTO fund_daily_aum (
      id,
      fund_id,
      aum_date,
      total_aum,
      as_of_date,
      is_month_end,
      purpose,
      source,
      created_at,
      created_by,
      is_voided
    ) VALUES (
      gen_random_uuid(),
      p_fund_id,
      v_period_end,
      v_current_aum + v_gross_yield_amount,
      v_period_end,
      v_is_month_end,
      p_purpose,
      'yield_distribution',
      NOW(),
      v_admin,
      false
    );
  END IF;

  -- Audit log entry for yield distribution
  INSERT INTO audit_log (
    actor_user,
    action,
    entity,
    entity_id,
    old_values,
    new_values,
    meta
  ) VALUES (
    v_admin,
    'YIELD_DISTRIBUTION_APPLIED',
    'yield_distributions',
    v_distribution_id::text,
    jsonb_build_object(
      'previous_aum', v_current_aum
    ),
    jsonb_build_object(
      'new_aum', v_current_aum + v_gross_yield_amount,
      'gross_yield', v_gross_yield_amount,
      'net_yield', v_total_net,
      'total_fees', v_total_fees,
      'total_ib', v_total_ib,
      'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund.fund_code,
      'period_start', v_period_start,
      'period_end', v_period_end,
      'distribution_date', v_tx_date,
      'purpose', p_purpose::text,
      'calculation_method', 'ADB',
      'total_adb', v_total_adb,
      'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < p_dust_tolerance
    )
  );

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'total_adb', v_total_adb,
    'gross_yield', v_gross_yield_amount,
    'allocated_gross', v_total_gross,
    'allocated_net', v_total_net,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'allocation_count', v_allocation_count,
    'investor_count', v_allocation_count,
    'dust_amount', v_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < p_dust_tolerance,
    'days_in_period', v_period_end - v_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'total_loss_offset', 0,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date']
  );
END;
$function$;
