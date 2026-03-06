-- Reporting-mode yield: derive period from latest fund transaction and gross from YIELD-only sum

CREATE OR REPLACE FUNCTION public.preview_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_adb numeric := 0;
  v_fund RECORD;
  v_allocations jsonb := '[]'::jsonb;
  v_ib_summary jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_investor RECORD;
  v_gross_share numeric;
  v_net_share numeric;
  v_fee_share numeric;
  v_ib_share numeric;
  v_dust_tolerance numeric := 0.01;
  v_ib_parent_name text;
  v_is_zero_yield boolean;
  v_latest_tx_date date;
  v_period_start date := p_period_start;
  v_period_end date := p_period_end;
  v_gross_yield_amount numeric := p_gross_yield_amount;
BEGIN
  -- Reporting mode: override period and gross with latest transaction month + YIELD sum
  IF p_purpose = 'reporting' THEN
    SELECT MAX(tx_date)::date
    INTO v_latest_tx_date
    FROM transactions_v2
    WHERE fund_id = p_fund_id
      AND is_voided = false;

    IF v_latest_tx_date IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'No transactions found for fund to derive reporting period');
    END IF;

    v_period_start := date_trunc('month', v_latest_tx_date)::date;
    v_period_end := (date_trunc('month', v_latest_tx_date)::date + interval '1 month - 1 day')::date;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_gross_yield_amount
    FROM transactions_v2
    WHERE fund_id = p_fund_id
      AND is_voided = false
      AND type = 'YIELD'::tx_type
      AND tx_date >= v_period_start
      AND tx_date <= v_period_end;
  END IF;

  IF v_gross_yield_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gross yield amount must be non-negative');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Check if this is a zero yield month (allows record-keeping for 0% months)
  v_is_zero_yield := (v_gross_yield_amount = 0);

  -- Only include account_type = 'investor' (exclude ib, fees_account)
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id 
    AND ip.is_active = true
    AND p.account_type = 'investor';

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'total_adb', 0, 'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance',
      'is_zero_yield', v_is_zero_yield
    );
  END IF;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      pr.email as investor_email,
      COALESCE(pr.first_name || ' ' || pr.last_name, pr.email) as investor_name,
      pr.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        pr.fee_pct,
        0
      ) as fee_pct,
      pr.ib_parent_id,
      COALESCE(pr.ib_percentage, 0) as ib_rate
    FROM investor_positions ip
    JOIN profiles pr ON pr.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id 
      AND ip.is_active = true
      AND pr.account_type = 'investor'
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * v_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);

    -- IB commission is % of GROSS
    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 THEN
      v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    -- Net = Gross - Fee - IB
    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    -- Include allocations for zero yield months (for record-keeping)
    IF v_gross_share >= v_dust_tolerance OR v_is_zero_yield THEN
      v_allocations := v_allocations || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_email', v_investor.investor_email,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'adb', v_investor.adb,
        'adb_share_pct', ROUND((v_investor.adb / v_total_adb * 100)::numeric, 4),
        'gross_yield', v_gross_share,
        'fee_pct', v_investor.fee_pct,
        'fee_amount', v_fee_share,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share,
        'net_yield', v_net_share,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name
      );

      IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
        v_ib_summary := v_ib_summary || jsonb_build_object(
          'ib_parent_id', v_investor.ib_parent_id,
          'ib_parent_name', v_ib_parent_name,
          'source_investor_id', v_investor.investor_id,
          'source_investor_name', v_investor.investor_name,
          'ib_rate', v_investor.ib_rate,
          'ib_amount', v_ib_share,
          'source_gross', v_gross_share
        );
      END IF;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true, 'fund_id', p_fund_id, 'fund_code', v_fund.code, 'fund_asset', v_fund.asset,
    'period_start', v_period_start, 'period_end', v_period_end,
    'days_in_period', v_period_end - v_period_start + 1,
    'total_adb', v_total_adb, 'gross_yield_amount', v_gross_yield_amount,
    'gross_yield', v_total_gross, 'net_yield', v_total_net,
    'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'platform_fees', v_total_fees,  -- Platform keeps full fee, IB is separate
    'dust_amount', v_gross_yield_amount - v_total_gross,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations, 'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', ABS(v_gross_yield_amount - (v_total_net + v_total_fees + v_total_ib)) < v_dust_tolerance OR v_is_zero_yield,
    'calculation_method', 'adb_v3',
    'is_zero_yield', v_is_zero_yield,
    'features', ARRAY['time_weighted', 'investor_only_filter', 'ib_from_gross', 'zero_yield_support', 'latest_period_reporting']
  );
END;
$function$;

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
  p_dust_tolerance numeric := 0.01;
BEGIN
  -- *** CRITICAL: Enable canonical mutation flag ***
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate admin
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Reporting mode: override period and gross with latest transaction month + YIELD sum
  IF p_purpose = 'reporting'::aum_purpose THEN
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

  -- Calculate current AUM for recorded/previous values (investor positions only)
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_current_aum
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type = 'investor';

  -- Calculate total ADB (investor positions only)
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type = 'investor';

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

  -- Process each investor with positive ADB (investor accounts only)
  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs
         WHERE ifs.investor_id = ip.investor_id AND ifs.fund_id = p_fund_id
         ORDER BY ifs.created_at DESC LIMIT 1),
        p.fee_pct,
        0
      ) as fee_pct,
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
      AND p.account_type = 'investor'
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

    -- Create YIELD transaction for investor
    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := v_net_share,
      p_tx_date := v_period_end,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin,
      p_purpose := p_purpose
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

    -- IB credit + ledger
    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_ib_share,
        p_tx_date := v_period_end,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
        p_admin_id := v_admin,
        p_purpose := p_purpose
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

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

    -- Update totals
    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- Create single fee credit transaction for the distribution total (void-compatible)
  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_period_end,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees collected after IB for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin,
      p_purpose := p_purpose
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
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting']
  );
END;
$function$;
