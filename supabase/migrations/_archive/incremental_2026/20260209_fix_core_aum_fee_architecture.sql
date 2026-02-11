-- Migration: Fix Core AUM, Fee, and Yield Architecture Issues
-- Date: 2026-02-09
--
-- Core Fix 2: Add p_recorded_aum optional parameter to both yield RPCs
--             When provided, use it for fund_daily_aum instead of computing from positions.
--
-- Core Fix 3: Fee hierarchy simplification
--             Remove investor_fee_schedule lookups; use profiles.fee_pct only.
--             Data sync: copy latest schedule fees into profiles.fee_pct first.
--
-- Core Fix 4: Crystallization AUM source
--             Switch from fund_aum_events to fund_daily_aum (transaction purpose).

-- ============================================================================
-- CORE FIX 3a: Data sync - copy investor_fee_schedule fees into profiles.fee_pct
-- Must run BEFORE function changes so no data is lost
-- ============================================================================
UPDATE profiles p
SET fee_pct = sub.latest_fee
FROM (
  SELECT DISTINCT ON (ifs.investor_id) ifs.investor_id, ifs.fee_pct as latest_fee
  FROM investor_fee_schedule ifs
  ORDER BY ifs.investor_id, ifs.created_at DESC
) sub
WHERE p.id = sub.investor_id
  AND p.account_type = 'investor'
  AND (p.fee_pct IS NULL OR p.fee_pct != sub.latest_fee);

-- ============================================================================
-- CORE FIX 3b: Simplify get_investor_fee_pct to profiles-only
-- ============================================================================
CREATE OR REPLACE FUNCTION get_investor_fee_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_effective_date date
) RETURNS numeric AS $$
  SELECT CASE
    WHEN p.account_type IN ('ib', 'fees_account') THEN 0
    ELSE COALESCE(p.fee_pct, 0)
  END
  FROM profiles p WHERE p.id = p_investor_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================================
-- CORE FIX 2 + 3: apply_adb_yield_distribution_v3
-- - Add p_recorded_aum optional parameter
-- - Remove investor_fee_schedule lookups
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."apply_adb_yield_distribution_v3"(
  "p_fund_id" "uuid",
  "p_period_start" "date",
  "p_period_end" "date",
  "p_gross_yield_amount" numeric,
  "p_admin_id" "uuid" DEFAULT NULL::"uuid",
  "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose",
  "p_distribution_date" "date" DEFAULT NULL::"date",
  "p_recorded_aum" numeric DEFAULT NULL
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
      -- Core Fix 3: profiles.fee_pct only (no investor_fee_schedule lookup)
      CASE WHEN p.account_type IN ('ib', 'fees_account') THEN 0
        ELSE COALESCE(p.fee_pct, 0)
      END as fee_pct,
      COALESCE(
        (SELECT CASE WHEN p.ib_parent_id IS NULL THEN 0 ELSE COALESCE(p.ib_percentage, 0) END
         FROM profiles p WHERE p.id = ip.investor_id), 0
      ) as ib_rate,
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
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_investor.investor_id, p_fund_id, v_gross_share, v_net_share,
      v_fee_share, v_ib_share, v_investor.adb, v_investor.fee_pct, v_investor.ib_rate, v_yield_tx_id, NOW()
    );

    IF v_fee_share > 0 THEN
      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date, asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_gross_share, v_investor.fee_pct, v_fee_share, v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    IF v_ib_share > 0 AND v_investor.ib_parent_id IS NOT NULL THEN
      v_ib_tx := apply_transaction_with_crystallization(
        p_investor_id := v_investor.ib_parent_id, p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT', p_amount := v_ib_share, p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
        p_notes := 'IB commission for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
        p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx->>'tx_id', '')::uuid;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id AND investor_id = v_investor.investor_id AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_investor.investor_id, NULLIF(v_investor.investor_name, ''),
        v_investor.ib_parent_id, trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
        v_gross_share, v_investor.ib_rate, v_ib_share, v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_investor.ib_parent_id;
    END IF;

    IF v_fee_share > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_gross_share, v_investor.fee_pct,
        v_fee_share, NULL, v_admin
      );
    END IF;

    v_total_gross := v_total_gross + v_gross_share;
    v_total_net := v_total_net + v_net_share;
    v_total_fees := v_total_fees + v_fee_share;
    v_total_ib := v_total_ib + v_ib_share;
    v_allocation_count := v_allocation_count + 1;
  END LOOP;

  -- ========================================================================
  -- LARGEST REMAINDER: assign any residual to the largest allocation
  -- ========================================================================
  v_residual := v_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND v_largest_alloc_investor_id IS NOT NULL THEN
    UPDATE yield_allocations
    SET gross_amount = gross_amount + v_residual,
        net_amount = net_amount + v_residual
    WHERE distribution_id = v_distribution_id
      AND investor_id = v_largest_alloc_investor_id;

    UPDATE transactions_v2
    SET amount = amount + v_residual
    WHERE reference_id = 'yield_adb_' || v_distribution_id::text || '_' || v_largest_alloc_investor_id::text
      AND NOT is_voided;

    PERFORM recompute_investor_position(v_largest_alloc_investor_id, p_fund_id);

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_residual;
  END IF;

  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id, p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT', p_amount := v_total_fees, p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees collected after IB for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  -- Auto-mark IB allocations as 'paid' when purpose = 'reporting'
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid',
        paid_at = NOW(),
        paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false
      AND payout_status = 'pending';
  END IF;

  UPDATE yield_distributions SET
    total_net_amount = v_total_net, total_fee_amount = v_total_fees, total_ib_amount = v_total_ib,
    net_yield = v_total_net, total_fees = v_total_fees, total_ib = v_total_ib,
    dust_amount = 0,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Core Fix 2: Use v_recorded_aum (admin-provided or computed) for fund_daily_aum
  UPDATE fund_daily_aum
  SET total_aum = v_recorded_aum,
      as_of_date = v_period_end,
      is_month_end = v_is_month_end,
      source = 'yield_distribution',
      created_by = v_admin
  WHERE fund_id = p_fund_id
    AND aum_date = v_period_end
    AND purpose = p_purpose
    AND is_voided = false;

  IF NOT FOUND THEN
    INSERT INTO fund_daily_aum (
      id, fund_id, aum_date, total_aum, as_of_date, is_month_end,
      purpose, source, created_at, created_by, is_voided
    ) VALUES (
      gen_random_uuid(), p_fund_id, v_period_end, v_recorded_aum,
      v_period_end, v_is_month_end, p_purpose, 'yield_distribution', NOW(), v_admin, false
    );
  END IF;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('previous_aum', v_current_aum),
    jsonb_build_object(
      'new_aum', v_recorded_aum, 'gross_yield', v_gross_yield_amount,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'distribution_date', v_tx_date, 'purpose', p_purpose::text,
      'calculation_method', 'ADB', 'total_adb', v_total_adb,
      'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
      'dust_amount', 0, 'residual_applied_to', v_largest_alloc_investor_id,
      'includes_fees_account', true, 'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
      'admin_recorded_aum', p_recorded_aum IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true, 'distribution_id', v_distribution_id, 'fund_id', p_fund_id,
    'period_start', v_period_start, 'period_end', v_period_end, 'total_adb', v_total_adb,
    'gross_yield', v_gross_yield_amount, 'allocated_gross', v_total_gross,
    'allocated_net', v_total_net, 'net_yield', v_total_net,
    'total_fees', v_total_fees, 'total_ib', v_total_ib,
    'allocation_count', v_allocation_count, 'investor_count', v_allocation_count,
    'dust_amount', 0,
    'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
    'days_in_period', v_period_end - v_period_start + 1,
    'yield_rate_pct', CASE WHEN v_total_adb > 0 THEN ROUND((v_gross_yield_amount / v_total_adb * 100)::numeric, 6) ELSE 0 END,
    'total_loss_offset', 0,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'recorded_aum', v_recorded_aum,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date', 'fees_account_in_adb', 'ib_auto_payout', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance', 'profiles_fee_only', 'admin_recorded_aum']
  );
END;
$$;

-- ============================================================================
-- CORE FIX 2 + 3: preview_adb_yield_distribution_v3
-- - Remove investor_fee_schedule lookups
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."preview_adb_yield_distribution_v3"(
  "p_fund_id" "uuid",
  "p_period_start" "date",
  "p_period_end" "date",
  "p_gross_yield_amount" numeric,
  "p_purpose" "text" DEFAULT 'transaction'::"text"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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
      -- Core Fix 3: profiles.fee_pct only (no investor_fee_schedule lookup)
      CASE WHEN p.account_type IN ('ib', 'fees_account') THEN 0
        ELSE COALESCE(p.fee_pct, 0)
      END as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_rate
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

  -- ========================================================================
  -- LARGEST REMAINDER: adjust the largest allocation in the preview
  -- ========================================================================
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
    'features', ARRAY['time_weighted', 'loss_carryforward', 'ib_fee_exempt', 'ib_commission', 'fees_account_in_adb', 'largest_remainder_zero_dust', 'satoshi_dust_tolerance', 'profiles_fee_only']
  );
END;
$$;

-- ============================================================================
-- CORE FIX 4: crystallize_yield_before_flow
-- Switch from fund_aum_events to fund_daily_aum (transaction purpose)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_last_checkpoint record;
  v_existing_preflow record;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;

  v_validation_result jsonb;
  v_actual_position_sum numeric;

  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;
  v_dust_receiver_id uuid;

  v_total_adb numeric(28,10);
  v_investor_adb numeric(28,10);
  v_weight numeric(28,10);

  v_investor record;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share_pct numeric(18,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
  v_scale int := 10;

  v_orphaned_yield_events int;
  v_orphaned_snapshots int;
  v_orphaned_distributions int;

  -- Core Fix 4: fund_daily_aum record for opening AUM
  v_fund_daily_aum_record record;
begin
  if p_purpose is null then
    raise exception 'p_purpose parameter is required'
      using errcode = 'not_null_violation';
  end if;

  v_event_date := (p_event_ts at time zone 'UTC')::date;

  v_validation_result := validate_aum_against_positions_at_date(
    p_fund_id, p_closing_aum, v_event_date, 0.10, 'crystallize_yield_before_flow'
  );

  if not (v_validation_result->>'valid')::boolean then
    return jsonb_build_object(
      'success', false,
      'error', 'AUM_VALIDATION_FAILED',
      'error_code', 'AUM_DEVIATION_ERROR',
      'message', v_validation_result->>'error',
      'validation', v_validation_result,
      'fund_id', p_fund_id,
      'entered_closing_aum', p_closing_aum
    );
  end if;

  select * into v_existing_preflow
  from get_existing_preflow_aum(p_fund_id, v_event_date, p_purpose);

  if v_existing_preflow.aum_event_id is not null then
    v_reused_preflow := true;
    v_snapshot_id := v_existing_preflow.aum_event_id;

    -- Core Fix 4: Read opening AUM from fund_daily_aum (transaction purpose)
    select total_aum, aum_date into v_fund_daily_aum_record
    from fund_daily_aum
    where fund_id = p_fund_id
      and aum_date < v_event_date
      and purpose = 'transaction'
      and is_voided = false
    order by aum_date desc
    limit 1;

    if v_fund_daily_aum_record.total_aum is not null then
      v_opening_aum := v_fund_daily_aum_record.total_aum;
      v_period_start := v_fund_daily_aum_record.aum_date;
    else
      -- Fallback: use fund_aum_events for backwards compatibility
      select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
      into v_last_checkpoint
      from fund_aum_events
      where fund_id = p_fund_id and is_voided = false and purpose = p_purpose
        and event_ts < v_existing_preflow.event_ts
      order by event_ts desc limit 1;

      if v_last_checkpoint.id is null then
        v_opening_aum := 0; v_period_start := v_event_date;
      else
        v_opening_aum := v_last_checkpoint.effective_aum; v_period_start := v_last_checkpoint.event_date;
      end if;
    end if;

    v_yield_amount := v_existing_preflow.closing_aum - v_opening_aum;
    if v_opening_aum > 0 then
      v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
    else
      v_yield_pct := 0;
    end if;

    return jsonb_build_object(
      'success', true, 'snapshot_id', v_snapshot_id, 'fund_id', p_fund_id,
      'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
      'period_start', v_period_start, 'opening_aum', v_opening_aum,
      'closing_aum', v_existing_preflow.closing_aum, 'fund_yield_pct', v_yield_pct,
      'gross_yield', v_yield_amount, 'reused_preflow', true,
      'calculation_method', 'adb_time_weighted', 'message', 'Reused existing preflow AUM',
      'validation', v_validation_result
    );
  end if;

  -- Core Fix 4: Read opening AUM from fund_daily_aum (transaction purpose)
  select total_aum, aum_date into v_fund_daily_aum_record
  from fund_daily_aum
  where fund_id = p_fund_id
    and aum_date < v_event_date
    and purpose = 'transaction'
    and is_voided = false
  order by aum_date desc
  limit 1;

  if v_fund_daily_aum_record.total_aum is not null then
    v_opening_aum := v_fund_daily_aum_record.total_aum;
    v_period_start := v_fund_daily_aum_record.aum_date;
  else
    -- Fallback: use fund_aum_events for backwards compatibility
    select id, coalesce(post_flow_aum, closing_aum) as effective_aum, event_ts, event_date
    into v_last_checkpoint
    from fund_aum_events
    where fund_id = p_fund_id and is_voided = false and purpose = p_purpose and event_ts < p_event_ts
    order by event_ts desc limit 1;

    if v_last_checkpoint.id is null then
      -- Final fallback: sum ALL active positions (new fund)
      select coalesce(sum(current_value), 0) into v_opening_aum
      from investor_positions
      where fund_id = p_fund_id and is_active = true;
      v_period_start := v_event_date;
    else
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    end if;
  end if;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  if v_yield_amount < 0 then
    raise exception 'Gross yield amount cannot be negative (closing AUM % is less than opening AUM %)', p_closing_aum, v_opening_aum;
  end if;

  if v_opening_aum > 0 then
    v_yield_pct := round((v_yield_amount / v_opening_aum) * 100, v_scale);
  else
    v_yield_pct := 0;
  end if;

  insert into fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) values (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  ) returning id into v_snapshot_id;

  if v_opening_aum > 0 and v_yield_amount > 0 then

    perform set_canonical_rpc(true);

    update investor_yield_events
    set is_voided = true, voided_at = now(), voided_by = p_admin_id
    where fund_id = p_fund_id and event_date = v_event_date
      and is_voided = false
      and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
    get diagnostics v_orphaned_yield_events = row_count;

    delete from fund_yield_snapshots
    where fund_id = p_fund_id and snapshot_date = v_event_date and trigger_type = p_trigger_type;
    get diagnostics v_orphaned_snapshots = row_count;

    update yield_distributions
    set is_voided = true, voided_at = now(), voided_by = p_admin_id,
        void_reason = 'Orphaned from failed flow retry - voided for idempotency'
    where fund_id = p_fund_id and effective_date = v_event_date and purpose = p_purpose
      and distribution_type = p_trigger_type and is_voided = false;
    get diagnostics v_orphaned_distributions = row_count;

    if v_orphaned_yield_events > 0 or v_orphaned_snapshots > 0 or v_orphaned_distributions > 0 then
      raise notice 'Idempotency cleanup: voided % yield events, % snapshots, % distributions for fund % on %',
        v_orphaned_yield_events, v_orphaned_snapshots, v_orphaned_distributions, p_fund_id, v_event_date;
    end if;

    select coalesce(sum(daily_balance), 0) into v_total_adb
    from (
      select d::date as balance_date,
             coalesce(
               (select sum(end_of_day_balance) from investor_daily_balance idb
                where idb.fund_id = p_fund_id and idb.balance_date = d::date),
               (select coalesce(sum(t.amount), 0) from transactions_v2 t
                where t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
             ) as daily_balance
      from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
    ) daily_balances;

    if v_total_adb = 0 or v_total_adb is null then
      v_total_adb := v_opening_aum;
    end if;

    select ip.investor_id into v_dust_receiver_id
    from investor_positions ip
    where ip.fund_id = p_fund_id and ip.current_value > 0
    order by ip.current_value desc limit 1;

    insert into fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) values (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    for v_investor in
      select ip.investor_id, ip.current_value, row_number() over (order by ip.current_value desc) as rank
      from investor_positions ip
      where ip.fund_id = p_fund_id and ip.current_value > 0
    loop
      select coalesce(sum(daily_balance), 0) into v_investor_adb
      from (
        select d::date as balance_date,
               coalesce(
                 (select end_of_day_balance from investor_daily_balance idb
                  where idb.investor_id = v_investor.investor_id and idb.fund_id = p_fund_id and idb.balance_date = d::date),
                 (select coalesce(sum(t.amount), 0) from transactions_v2 t
                  where t.investor_id = v_investor.investor_id and t.fund_id = p_fund_id and t.tx_date <= d::date and not t.is_voided)
               ) as daily_balance
        from generate_series(v_period_start, v_event_date - interval '1 day', '1 day') d
      ) daily_balances;

      if v_investor_adb = 0 or v_investor_adb is null then
        v_investor_adb := v_investor.current_value;
        v_weight := v_investor.current_value / v_opening_aum;
      else
        v_weight := v_investor_adb / nullif(v_total_adb, 0);
      end if;

      v_investor_share_pct := round(v_weight * 100, v_scale);
      v_investor_yield := round(v_yield_amount * v_weight, v_scale);

      if v_investor_yield > 0 then
        v_fee_pct := get_investor_fee_pct(v_investor.investor_id, p_fund_id, v_event_date);
        v_investor_fee := round(v_investor_yield * v_fee_pct / 100, v_scale);
      else
        v_fee_pct := 0; v_investor_fee := 0;
      end if;

      v_investor_net := v_investor_yield - v_investor_fee;
      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      insert into investor_yield_events (
        investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
        fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
        fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
        period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
      ) values (
        v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
        case when p_trigger_reference ~ '^[0-9a-f-]{36}$' then p_trigger_reference::uuid else null end,
        v_opening_aum, p_closing_aum, v_investor.current_value,
        v_investor_share_pct, v_yield_pct, v_investor_yield,
        v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
        v_days_in_period, 'admin_only', v_reference_id, p_admin_id
      );

      v_investors_processed := v_investors_processed + 1;
    end loop;

    v_dust_amount := v_yield_amount - v_total_gross_allocated;

    insert into yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id, calculation_method
    ) values (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, p_trigger_type, 'completed',
      v_period_start, v_event_date, v_dust_amount, v_dust_receiver_id, p_admin_id,
      'DIST-' || p_fund_id::text || '-' || v_event_date::text,
      'adb_time_weighted'
    ) returning id into v_distribution_id;

    if abs(v_dust_amount) > 0.0001 and v_dust_receiver_id is not null then
      update investor_yield_events
      set gross_yield_amount = gross_yield_amount + v_dust_amount,
          net_yield_amount = net_yield_amount + v_dust_amount
      where investor_id = v_dust_receiver_id and fund_id = p_fund_id and event_date = v_event_date
        and reference_id like 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';
      v_total_gross_allocated := v_total_gross_allocated + v_dust_amount;
      v_total_net_allocated := v_total_net_allocated + v_dust_amount;
    end if;

  end if;

  return jsonb_build_object(
    'success', true, 'snapshot_id', v_snapshot_id, 'distribution_id', v_distribution_id,
    'fund_id', p_fund_id, 'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
    'period_start', v_period_start, 'opening_aum', v_opening_aum, 'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct, 'gross_yield', v_yield_amount,
    'investors_processed', v_investors_processed,
    'total_gross_allocated', v_total_gross_allocated,
    'total_fees_allocated', v_total_fees_allocated,
    'total_net_allocated', v_total_net_allocated,
    'dust_amount', v_dust_amount, 'dust_receiver_id', v_dust_receiver_id,
    'reused_preflow', false, 'calculation_method', 'adb_time_weighted',
    'total_adb', v_total_adb, 'zero_yield_skipped', v_yield_amount = 0,
    'validation', v_validation_result,
    'aum_source', case when v_fund_daily_aum_record.total_aum is not null then 'fund_daily_aum' else 'fund_aum_events_fallback' end,
    'conservation_check', jsonb_build_object(
      'gross_matches', abs(coalesce(v_yield_amount, 0) - coalesce(v_total_gross_allocated, 0)) < 0.0001,
      'fee_identity_holds', abs(coalesce(v_total_gross_allocated, 0) - coalesce(v_total_net_allocated, 0) - coalesce(v_total_fees_allocated, 0)) < 0.0001
    ),
    'idempotency_cleanup', jsonb_build_object(
      'orphaned_yield_events_voided', coalesce(v_orphaned_yield_events, 0),
      'orphaned_snapshots_voided', coalesce(v_orphaned_snapshots, 0),
      'orphaned_distributions_voided', coalesce(v_orphaned_distributions, 0)
    )
  );
end;
$function$;
