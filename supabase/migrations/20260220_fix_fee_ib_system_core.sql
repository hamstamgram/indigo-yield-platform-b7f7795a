-- Fix Fee + IB Schedule Resolution System at the Core
--
-- Issues fixed:
-- 1. _resolve_investor_fee_pct: missing funds.perf_fee_bps / 100 fallback (tier 5)
-- 2. V3 apply: inline fee + IB reads bypass fee/IB schedules
-- 3. V3 preview: inline fee + IB reads bypass fee/IB schedules
-- 4. rebuild_investor_period_balances: broken fee lookup (no end_date, hardcoded 20%) + inline IB
--
-- Intended fee hierarchy (ALL code paths):
--   1. fees_account -> 0%
--   2. investor_fee_schedule (fund-specific, date-ranged)
--   3. investor_fee_schedule (global, fund_id IS NULL)
--   4. profiles.fee_pct (investor-level override)
--   5. funds.perf_fee_bps / 100 (fund default)  <-- NEW
--   6. 0% (safety fallback)
--
-- Intended IB hierarchy (ALL code paths):
--   1. fees_account -> 0%
--   2. No ib_parent_id -> 0%
--   3. ib_commission_schedule (fund-specific, date-ranged)
--   4. ib_commission_schedule (global, fund_id IS NULL)
--   5. profiles.ib_percentage (investor-level default)
--   6. 0% (safety fallback)

-- ============================================================
-- Phase 1: Fix _resolve_investor_fee_pct - Add Fund Default
-- ============================================================

CREATE OR REPLACE FUNCTION public._resolve_investor_fee_pct(
  p_investor_id uuid, p_fund_id uuid, p_date date
) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_fee numeric; v_account_type text;
BEGIN
  -- 1. fees_account -> 0%
  SELECT account_type INTO v_account_type FROM profiles WHERE id = p_investor_id;
  IF v_account_type = 'fees_account' THEN RETURN 0; END IF;

  -- 2+3. investor_fee_schedule (fund-specific first, then global)
  SELECT fee_pct INTO v_fee FROM investor_fee_schedule
  WHERE investor_id = p_investor_id
    AND (fund_id = p_fund_id OR fund_id IS NULL)
    AND effective_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- 4. Profile fee override
  SELECT fee_pct INTO v_fee FROM profiles WHERE id = p_investor_id;
  IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;

  -- 5. Fund default (perf_fee_bps / 100)
  IF p_fund_id IS NOT NULL THEN
    SELECT (perf_fee_bps / 100.0) INTO v_fee FROM funds WHERE id = p_fund_id;
    IF v_fee IS NOT NULL THEN RETURN v_fee; END IF;
  END IF;

  -- 6. Safety fallback
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public._resolve_investor_fee_pct(uuid, uuid, date) IS
  'Resolves investor fee percentage. Checks: 1) fees_account=0%, 2) investor_fee_schedule, 3) profile.fee_pct, 4) funds.perf_fee_bps/100, 5) default 0%';


-- ============================================================
-- Phase 2: Fix V3 Apply - Use Centralized Fee + IB Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'transaction',
  p_distribution_date date DEFAULT NULL,
  p_recorded_aum numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
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
  v_current_aum numeric := 0;
  v_recorded_aum numeric := 0;
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
  p_dust_tolerance numeric := 0.00000001;
  v_tx_date date;
  v_derived_yield numeric := 0;
  v_ib_allocation_id uuid;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_alloc_investor_id uuid;
  v_largest_alloc_gross numeric;
  v_largest_alloc_fee_pct numeric;
  v_largest_alloc_ib_rate numeric;
  v_largest_alloc_ib_parent_id uuid;
  v_adj_fee numeric;
  v_adj_ib numeric;
  v_adj_net numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF p_period_end IS NOT NULL THEN
      v_period_start := date_trunc('month', p_period_end)::date;
      v_period_end := (date_trunc('month', p_period_end)::date + interval '1 month - 1 day')::date;
    ELSE
      SELECT MAX(tx_date)::date INTO v_latest_tx_date
      FROM transactions_v2 WHERE fund_id = p_fund_id AND is_voided = false;
      IF v_latest_tx_date IS NULL THEN
        RAISE EXCEPTION 'No transactions found for fund % to derive reporting period', p_fund_id;
      END IF;
      v_period_start := date_trunc('month', v_latest_tx_date)::date;
      v_period_end := (date_trunc('month', v_latest_tx_date)::date + interval '1 month - 1 day')::date;
    END IF;

    v_tx_date := COALESCE(p_distribution_date, v_period_end);
    PERFORM set_config('indigo.aum_synced', 'true', true);

    IF COALESCE(p_gross_yield_amount, 0) <= 0 THEN
      SELECT COALESCE(SUM(amount), 0) INTO v_derived_yield
      FROM transactions_v2
      WHERE fund_id = p_fund_id AND is_voided = false
        AND type = 'YIELD'::tx_type
        AND tx_date >= v_period_start AND tx_date <= v_period_end;
      v_gross_yield_amount := v_derived_yield;
    END IF;
  ELSE
    v_tx_date := COALESCE(p_distribution_date, CURRENT_DATE);
  END IF;

  IF v_gross_yield_amount < 0 THEN
    RAISE EXCEPTION 'Gross yield amount must be non-negative';
  END IF;
  IF v_period_end < v_period_start THEN
    RAISE EXCEPTION 'Period end must be after period start';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured (profiles.account_type=fees_account)';
  END IF;

  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end)::date + interval '1 month - 1 day')::date);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end AND is_voided = false
  ) THEN
    RAISE EXCEPTION 'Yield distribution already exists for fund % on %', p_fund_id, v_period_end;
  END IF;

  -- Compute current AUM from ALL active positions (unified scope)
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_current_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- Core Fix 2: Use admin-provided recorded AUM if available, else compute
  IF p_recorded_aum IS NOT NULL THEN
    v_recorded_aum := p_recorded_aum;
  ELSE
    v_recorded_aum := v_current_aum + v_gross_yield_amount;
  END IF;

  -- ADB still computed from investor + IB + fees_account (all with positions)
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib,
    status, created_by, calculation_method, purpose, is_month_end
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    v_recorded_aum, v_current_aum, v_gross_yield_amount, v_gross_yield_amount,
    0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'ADB', p_purpose, v_is_month_end
  ) RETURNING id INTO v_distribution_id;

  -- Track the largest allocation for residual assignment
  v_largest_alloc_gross := 0;
  v_largest_alloc_investor_id := NULL;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
      -- FIX: Use centralized fee resolution (respects fee schedule + fund default)
      get_investor_fee_pct(ip.investor_id, p_fund_id, v_period_end) as fee_pct,
      -- FIX: Use centralized IB resolution (respects IB commission schedule)
      get_investor_ib_pct(ip.investor_id, p_fund_id, v_period_end) as ib_rate,
      p.ib_parent_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) as investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) > 0
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * v_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);
    v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share < p_dust_tolerance THEN CONTINUE; END IF;

    -- Track the largest allocation
    IF v_gross_share > v_largest_alloc_gross THEN
      v_largest_alloc_gross := v_gross_share;
      v_largest_alloc_investor_id := v_investor.investor_id;
      v_largest_alloc_fee_pct := v_investor.fee_pct;
      v_largest_alloc_ib_rate := v_investor.ib_rate;
      v_largest_alloc_ib_parent_id := v_investor.ib_parent_id;
    END IF;

    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id, p_fund_id := p_fund_id,
      p_tx_type := 'YIELD', p_amount := v_net_share, p_tx_date := v_tx_date,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_yield_tx->>'tx_id', '')::uuid;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
      transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id,
      v_gross_share, v_net_share, v_fee_share, v_ib_share,
      ROUND((v_investor.adb / v_total_adb * 100)::numeric, 6),
      v_investor.fee_pct, v_investor.ib_rate,
      v_yield_tx_id, NOW()
    );

    INSERT INTO fee_allocations (
      distribution_id, fund_id, investor_id, fees_account_id,
      period_start, period_end, purpose, base_net_income, fee_percentage,
      fee_amount, credit_transaction_id, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
      v_period_start, v_period_end, p_purpose, v_gross_share,
      v_investor.fee_pct, v_fee_share, NULL, v_admin
    );

    IF v_investor.ib_parent_id IS NOT NULL AND v_ib_share > 0 THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id, p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT', p_amount := v_ib_share, p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ' || v_investor.investor_name,
        p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_investor.investor_id, v_investor.investor_name,
             v_investor.ib_parent_id,
             trim(COALESCE(ib.first_name, '') || ' ' || COALESCE(ib.last_name, '')),
             v_gross_share, v_investor.ib_rate, v_ib_share,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_investor.ib_parent_id;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id;
    END IF;

    -- FEE_CREDIT transaction
    IF v_fee_share > 0 THEN
      v_fee_tx := apply_transaction_with_crystallization(
        p_investor_id := v_fees_account_id, p_fund_id := p_fund_id,
        p_tx_type := 'FEE_CREDIT', p_amount := v_fee_share, p_tx_date := v_tx_date,
        p_reference_id := 'fee_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'Platform fee for ' || v_investor.investor_name,
        p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
      v_fee_tx_id := NULLIF(v_fee_tx->>'tx_id', '')::uuid;
      UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id;
      UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id;
    END IF;

    INSERT INTO platform_fee_ledger (
      fund_id, yield_distribution_id, investor_id, investor_name,
      gross_yield_amount, fee_percentage, fee_amount, effective_date,
      asset, transaction_id, created_by
    ) VALUES (
      p_fund_id, v_distribution_id, v_investor.investor_id, v_investor.investor_name,
      v_gross_share, v_investor.fee_pct, v_fee_share, v_period_end,
      v_fund.asset, v_fee_tx_id, v_admin
    );

    IF v_yield_tx_id IS NOT NULL AND p_purpose = 'reporting'::aum_purpose THEN
      UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope WHERE id = v_yield_tx_id;
    END IF;
    IF v_ib_tx_id IS NOT NULL AND p_purpose = 'reporting'::aum_purpose THEN
      UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope WHERE id = v_ib_tx_id;
    END IF;

    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- Largest remainder: assign residual to largest allocation
  v_residual := v_gross_yield_amount - v_total_gross;
  IF v_residual != 0 AND v_largest_alloc_investor_id IS NOT NULL THEN
    v_adj_fee := ROUND((v_residual * COALESCE(v_largest_alloc_fee_pct, 0) / 100)::numeric, 8);
    IF v_largest_alloc_ib_parent_id IS NOT NULL AND COALESCE(v_largest_alloc_ib_rate, 0) > 0 THEN
      v_adj_ib := ROUND((v_residual * v_largest_alloc_ib_rate / 100)::numeric, 8);
    ELSE
      v_adj_ib := 0;
    END IF;
    v_adj_net := v_residual - v_adj_fee - v_adj_ib;

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_adj_net;
    v_total_fees := v_total_fees + v_adj_fee;
    v_total_ib := v_total_ib + v_adj_ib;
  END IF;

  -- Update distribution header
  UPDATE yield_distributions SET
    gross_yield = v_total_gross, gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net, total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib, net_yield = v_total_net,
    total_fees = v_total_fees, total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0), allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Record AUM snapshot
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, v_recorded_aum, p_purpose, 'yield_distribution_v3', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v3',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- Sync transaction-purpose AUM after reporting yield
  IF p_purpose = 'reporting'::aum_purpose THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, v_recorded_aum, 'transaction'::aum_purpose, 'yield_aum_sync', v_admin, v_is_month_end)
    ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
    DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_aum_sync',
      is_month_end = EXCLUDED.is_month_end, updated_at = now();

    -- Auto-mark IB allocations as paid for reporting
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('previous_aum', v_current_aum),
    jsonb_build_object('recorded_aum', v_recorded_aum, 'gross_yield', v_total_gross,
      'net_yield', v_total_net, 'total_fees', v_total_fees, 'total_ib', v_total_ib),
    jsonb_build_object('fund_id', p_fund_id, 'period', v_period_start || ' to ' || v_period_end,
      'purpose', p_purpose::text, 'allocation_count', v_allocation_count,
      'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
      'dust_residual', v_residual, 'dust_receiver', v_largest_alloc_investor_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'recorded_aum', v_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'allocation_count', v_allocation_count,
    'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
    'fund_asset', v_fund.asset,
    'investor_count', v_allocation_count,
    'days_in_period', (v_period_end - v_period_start + 1),
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission',
      'fees_account_in_adb', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance',
      'centralized_fee_resolution', 'centralized_ib_resolution']
  );
END;
$$;


-- ============================================================
-- Phase 3: Fix V3 Preview - Use Centralized Fee + IB Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.preview_adb_yield_distribution_v3(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_gross_yield_amount numeric,
  p_purpose text DEFAULT 'transaction'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_dust_tolerance numeric := 0.00000001;
  v_ib_parent_name text;
  -- Largest remainder variables
  v_residual numeric;
  v_largest_idx int := 0;
  v_largest_gross numeric := 0;
  v_current_idx int := 0;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 'total_adb', 0,
      'allocations', '[]'::jsonb,
      'message', 'No positions with positive average daily balance'
    );
  END IF;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      p.email as investor_email,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as investor_name,
      p.account_type,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) as adb,
      -- FIX: Use centralized fee resolution (respects fee schedule + fund default)
      get_investor_fee_pct(ip.investor_id, p_fund_id, p_period_end) as fee_pct,
      p.ib_parent_id,
      -- FIX: Use centralized IB resolution (respects IB commission schedule)
      get_investor_ib_pct(ip.investor_id, p_fund_id, p_period_end) as ib_rate
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND p.account_type IN ('investor', 'ib', 'fees_account')
      AND calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) > 0
    ORDER BY calc_avg_daily_balance(ip.investor_id, p_fund_id, p_period_start, p_period_end) DESC
  LOOP
    v_gross_share := ROUND((v_investor.adb / v_total_adb * p_gross_yield_amount)::numeric, 8);
    v_fee_share := ROUND((v_gross_share * v_investor.fee_pct / 100)::numeric, 8);

    IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_rate > 0 THEN
      v_ib_share := ROUND((v_gross_share * v_investor.ib_rate / 100)::numeric, 8);
      SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
      FROM profiles WHERE id = v_investor.ib_parent_id;
    ELSE
      v_ib_share := 0;
      v_ib_parent_name := NULL;
    END IF;

    v_net_share := v_gross_share - v_fee_share - v_ib_share;

    IF v_gross_share >= v_dust_tolerance THEN
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
        'net_yield', v_net_share,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_rate', v_investor.ib_rate,
        'ib_amount', v_ib_share
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

      -- Track largest for residual assignment
      IF v_gross_share > v_largest_gross THEN
        v_largest_gross := v_gross_share;
        v_largest_idx := v_current_idx;
      END IF;
      v_current_idx := v_current_idx + 1;

      v_total_gross := v_total_gross + v_gross_share;
      v_total_net := v_total_net + v_net_share;
      v_total_fees := v_total_fees + v_fee_share;
      v_total_ib := v_total_ib + v_ib_share;
    END IF;
  END LOOP;

  -- Largest remainder: adjust the largest allocation in the preview
  v_residual := p_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND jsonb_array_length(v_allocations) > 0 THEN
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'gross_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'gross_yield')::numeric + v_residual)
    );
    v_allocations := jsonb_set(
      v_allocations,
      ARRAY[v_largest_idx::text, 'net_yield'],
      to_jsonb((v_allocations->v_largest_idx->>'net_yield')::numeric + v_residual)
    );

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'days_in_period', p_period_end - p_period_start + 1,
    'total_adb', v_total_adb,
    'gross_yield_amount', p_gross_yield_amount,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'platform_fees', v_total_fees,
    'dust_amount', 0,
    'investor_count', jsonb_array_length(v_allocations),
    'allocations', v_allocations,
    'ib_summary', v_ib_summary,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((p_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'conservation_check', p_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'adb_v3',
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission',
      'fees_account_in_adb', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance',
      'centralized_fee_resolution', 'centralized_ib_resolution']
  );
END;
$$;


-- ============================================================
-- Phase 4: Fix rebuild_investor_period_balances - Fee + IB
-- ============================================================

CREATE OR REPLACE FUNCTION public.rebuild_investor_period_balances(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_purpose public.aum_purpose
) RETURNS TABLE(
  investor_id uuid,
  investor_name text,
  email text,
  beginning_balance numeric,
  ending_balance numeric,
  additions numeric,
  redemptions numeric,
  avg_capital numeric,
  days_in_period integer,
  days_invested integer,
  fee_pct numeric,
  ib_parent_id uuid,
  ib_percentage numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days_in_period INTEGER;
BEGIN
  v_days_in_period := (p_period_end - p_period_start) + 1;

  RETURN QUERY
  WITH
  -- Get all transactions for the period
  -- NOTE: Use inv_id alias to avoid PL/pgSQL ambiguity with RETURNS TABLE investor_id
  period_txns AS (
    SELECT
      t.investor_id AS inv_id,
      t.tx_date,
      t.type,
      t.amount,
      CASE
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN
          (p_period_end - t.tx_date)::numeric / v_days_in_period
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN
          (p_period_end - t.tx_date)::numeric / v_days_in_period
        ELSE 0
      END as time_weight
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date BETWEEN p_period_start AND p_period_end
  ),

  beginning_balances AS (
    SELECT
      t.investor_id AS inv_id,
      COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
          ELSE 0
        END
      ), 0) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date < p_period_start
    GROUP BY t.investor_id
  ),

  period_movements AS (
    SELECT
      pt.inv_id,
      COALESCE(SUM(CASE WHEN pt.type = 'DEPOSIT' THEN pt.amount ELSE 0 END), 0) as additions,
      COALESCE(SUM(CASE WHEN pt.type = 'WITHDRAWAL' THEN pt.amount ELSE 0 END), 0) as redemptions,
      COALESCE(SUM(
        CASE
          WHEN pt.type = 'DEPOSIT' THEN pt.amount * pt.time_weight
          WHEN pt.type = 'WITHDRAWAL' THEN -pt.amount * pt.time_weight
          ELSE 0
        END
      ), 0) as time_weighted_adjustment
    FROM period_txns pt
    GROUP BY pt.inv_id
  ),

  all_investors AS (
    SELECT DISTINCT inv_id
    FROM (
      SELECT bb.inv_id FROM beginning_balances bb WHERE bb.balance > 0
      UNION
      SELECT pm.inv_id FROM period_movements pm WHERE pm.additions > 0 OR pm.redemptions > 0
      UNION
      SELECT ip.investor_id AS inv_id FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ) combined
  )

  SELECT
    ai.inv_id AS investor_id,
    COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), p.email) AS investor_name,
    p.email,
    COALESCE(bb.balance, 0)::numeric AS beginning_balance,
    (COALESCE(bb.balance, 0) + COALESCE(pm.additions, 0) - COALESCE(pm.redemptions, 0))::numeric AS ending_balance,
    COALESCE(pm.additions, 0)::numeric AS additions,
    COALESCE(pm.redemptions, 0)::numeric AS redemptions,
    (COALESCE(bb.balance, 0) + COALESCE(pm.time_weighted_adjustment, 0))::numeric AS avg_capital,
    v_days_in_period AS days_in_period,
    v_days_in_period AS days_invested,
    -- FIX: Use centralized fee resolution (respects fee schedule + fund default)
    get_investor_fee_pct(ai.inv_id, p_fund_id, p_period_end) AS fee_pct,
    p.ib_parent_id,
    -- FIX: Use centralized IB resolution (respects IB commission schedule)
    get_investor_ib_pct(ai.inv_id, p_fund_id, p_period_end) AS ib_percentage
  FROM all_investors ai
  JOIN profiles p ON p.id = ai.inv_id
  LEFT JOIN beginning_balances bb ON bb.inv_id = ai.inv_id
  LEFT JOIN period_movements pm ON pm.inv_id = ai.inv_id
  WHERE COALESCE(bb.balance, 0) > 0
     OR COALESCE(pm.additions, 0) > 0
     OR EXISTS (SELECT 1 FROM investor_positions ip WHERE ip.investor_id = ai.inv_id AND ip.fund_id = p_fund_id AND ip.current_value > 0);
END;
$$;
