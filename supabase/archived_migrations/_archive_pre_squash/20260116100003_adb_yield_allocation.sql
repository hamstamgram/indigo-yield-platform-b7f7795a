-- ============================================================================
-- P0: Average Daily Balance (ADB) Yield Allocation
-- Date: 2026-01-16
-- Purpose: Implement fair yield allocation for mid-month deposits/withdrawals
-- ============================================================================

-- ============================================================================
-- 1. Calculate Average Daily Balance for an investor in a period
-- ============================================================================
CREATE OR REPLACE FUNCTION calc_avg_daily_balance(
  p_investor_id uuid,
  p_fund_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result numeric := 0;
  v_total_weighted_balance numeric := 0;
  v_total_days int;
  v_current_balance numeric := 0;
  v_current_date date;
  v_next_date date;
  v_days_at_balance int;
  v_tx RECORD;
  v_initial_balance numeric;
BEGIN
  -- Calculate total days in period
  v_total_days := (p_period_end - p_period_start + 1);

  IF v_total_days <= 0 THEN
    RETURN 0;
  END IF;

  -- Get initial balance at period start (from position snapshot or calculate from transactions)
  SELECT COALESCE(
    (
      SELECT ps.current_value
      FROM investor_position_snapshots ps
      WHERE ps.investor_id = p_investor_id
        AND ps.fund_id = p_fund_id
        AND ps.snapshot_date = p_period_start - 1
      ORDER BY ps.created_at DESC
      LIMIT 1
    ),
    (
      SELECT COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE t.amount
        END
      ), 0)
      FROM transactions_v2 t
      WHERE t.investor_id = p_investor_id
        AND t.fund_id = p_fund_id
        AND t.tx_date < p_period_start
        AND t.is_voided = false
    )
  ) INTO v_initial_balance;

  v_current_balance := COALESCE(v_initial_balance, 0);
  v_current_date := p_period_start;

  -- Process each transaction in the period
  FOR v_tx IN
    SELECT
      t.tx_date,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
          WHEN t.type = 'ADJUSTMENT' THEN t.amount  -- Can be positive or negative
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE 0
        END
      ) as daily_net_change
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.tx_date >= p_period_start
      AND t.tx_date <= p_period_end
      AND t.is_voided = false
    GROUP BY t.tx_date
    ORDER BY t.tx_date
  LOOP
    -- Days at current balance (before this transaction date)
    v_days_at_balance := v_tx.tx_date - v_current_date;

    IF v_days_at_balance > 0 THEN
      v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
    END IF;

    -- Update balance and date
    v_current_balance := v_current_balance + v_tx.daily_net_change;
    v_current_date := v_tx.tx_date;
  END LOOP;

  -- Days from last transaction to period end
  v_days_at_balance := (p_period_end - v_current_date + 1);
  IF v_days_at_balance > 0 THEN
    v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
  END IF;

  -- Calculate average
  v_result := v_total_weighted_balance / v_total_days;

  RETURN ROUND(v_result, 8);
END;
$$;

GRANT EXECUTE ON FUNCTION calc_avg_daily_balance TO authenticated;

COMMENT ON FUNCTION calc_avg_daily_balance IS
  'Calculates the Average Daily Balance for an investor position over a date range. Used for fair yield allocation.';

-- ============================================================================
-- 2. Preview ADB-based yield allocation for a fund
-- ============================================================================
CREATE OR REPLACE FUNCTION preview_adb_yield(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'month_end'
)
RETURNS TABLE (
  investor_id uuid,
  investor_email text,
  avg_daily_balance numeric,
  adb_share_pct numeric,
  gross_yield_share numeric,
  fee_pct numeric,
  net_yield_share numeric,
  ib_share numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_adb numeric := 0;
  v_dust_tolerance numeric := 0.01;
BEGIN
  -- First pass: calculate all ADBs
  CREATE TEMP TABLE temp_adb_calc ON COMMIT DROP AS
  SELECT
    ip.investor_id,
    p.email as investor_email,
    calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as avg_daily_balance,
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
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true;

  -- Calculate total ADB
  SELECT COALESCE(SUM(avg_daily_balance), 0) INTO v_total_adb
  FROM temp_adb_calc
  WHERE avg_daily_balance > 0;

  IF v_total_adb = 0 THEN
    -- No positions with positive ADB
    RETURN QUERY SELECT
      NULL::uuid, NULL::text, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric
    WHERE false;
    RETURN;
  END IF;

  -- Return allocation preview
  RETURN QUERY
  SELECT
    t.investor_id,
    t.investor_email,
    t.avg_daily_balance,
    ROUND((t.avg_daily_balance / v_total_adb * 100)::numeric, 6) as adb_share_pct,
    ROUND((t.avg_daily_balance / v_total_adb * p_gross_yield_amount)::numeric, 8) as gross_yield_share,
    t.fee_pct,
    ROUND((t.avg_daily_balance / v_total_adb * p_gross_yield_amount * (1 - t.fee_pct / 100))::numeric, 8) as net_yield_share,
    ROUND((t.avg_daily_balance / v_total_adb * p_gross_yield_amount * t.fee_pct / 100 * t.ib_rate)::numeric, 8) as ib_share
  FROM temp_adb_calc t
  WHERE t.avg_daily_balance > 0
  ORDER BY t.avg_daily_balance DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_adb_yield TO authenticated;

COMMENT ON FUNCTION preview_adb_yield IS
  'Preview yield allocation using Average Daily Balance method. Returns per-investor breakdown.';

-- ============================================================================
-- 3. Apply ADB-based yield distribution
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
BEGIN
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

  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Acquire fund-level lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || p_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

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
    'ADB', -- Average Daily Balance
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

    -- Create YIELD transaction for investor (through canonical RPC)
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
    net_yield_amount = v_total_net,
    total_fees = v_total_fees,
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
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'allocation_count', v_allocation_count,
    'dust_amount', p_gross_yield_amount - v_total_gross,
    'conservation_check', ABS(p_gross_yield_amount - (v_total_net + v_total_fees)) < p_dust_tolerance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_adb_yield_distribution TO authenticated;

COMMENT ON FUNCTION apply_adb_yield_distribution IS
  'Apply yield distribution using Average Daily Balance method. Creates allocations and YIELD transactions.';

-- ============================================================================
-- 4. View for ADB calculation verification
-- ============================================================================
CREATE OR REPLACE VIEW v_adb_verification AS
SELECT
  ip.investor_id,
  ip.fund_id,
  f.code as fund_code,
  p.email as investor_email,
  ip.current_value as position_value,
  calc_avg_daily_balance(
    ip.investor_id,
    ip.fund_id,
    DATE_TRUNC('month', CURRENT_DATE)::date,
    (DATE_TRUNC('month', CURRENT_DATE) + interval '1 month - 1 day')::date
  ) as current_month_adb,
  calc_avg_daily_balance(
    ip.investor_id,
    ip.fund_id,
    (DATE_TRUNC('month', CURRENT_DATE) - interval '1 month')::date,
    (DATE_TRUNC('month', CURRENT_DATE) - interval '1 day')::date
  ) as last_month_adb
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.is_active = true
ORDER BY ip.current_value DESC;

COMMENT ON VIEW v_adb_verification IS
  'Verification view for ADB calculations showing current and last month ADB per position.';

GRANT SELECT ON v_adb_verification TO authenticated;

