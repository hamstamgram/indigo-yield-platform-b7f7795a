-- Fix: investor_yield_events visibility_scope not updated for transaction-purpose yields
--
-- Bug: The sync_yield_to_investor_yield_events trigger fires on YIELD tx INSERT,
-- BEFORE the V4 RPC updates the tx visibility_scope to 'admin_only'.
-- Result: investor_yield_events records for transaction-purpose yields have
-- visibility_scope = 'investor_visible', making them visible on investor portal.
--
-- Fix: After updating the tx visibility_scope in V4, also update the
-- corresponding investor_yield_events record.

-- 1. Backfill: Fix existing investor_yield_events from transaction-purpose yields
-- Note: investor_yield_events.visibility_scope is TEXT, transactions_v2.visibility_scope is ENUM
UPDATE investor_yield_events iye
SET visibility_scope = 'admin_only'
FROM transactions_v2 t
WHERE iye.trigger_transaction_id = t.id
  AND t.visibility_scope = 'admin_only'::visibility_scope
  AND iye.visibility_scope = 'investor_visible';

-- 2. Recreate V4 RPC with the fix
CREATE OR REPLACE FUNCTION "public"."apply_adb_yield_distribution_v4"(
  "p_fund_id" "uuid",
  "p_period_start" "date",
  "p_period_end" "date",
  "p_gross_yield_amount" numeric,
  "p_admin_id" "uuid" DEFAULT NULL::"uuid",
  "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose",
  "p_distribution_date" "date" DEFAULT NULL::"date",
  "p_recorded_aum" numeric DEFAULT NULL,
  "p_snapshot_time" text DEFAULT NULL
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
  p_dust_tolerance numeric := 0.00000001;
  v_tx_date date;
  v_derived_yield numeric := 0;
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
  -- Reporting consolidation variables
  v_crystal_dist RECORD;
  v_crystals_consolidated int := 0;
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

  -- Fee + IB overflow guard
  IF EXISTS (
    SELECT 1 FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true
      AND p.account_type = 'investor'
      AND COALESCE(p.fee_pct, 0) + COALESCE(p.ib_percentage, 0) >= 100
  ) THEN
    RAISE EXCEPTION 'Fee + IB rate >= 100%% for one or more investors in fund %', p_fund_id;
  END IF;

  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end)::date + interval '1 month - 1 day')::date);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Uniqueness check: ONLY for reporting purpose (transaction purpose allows multiple per day)
  IF p_purpose = 'reporting'::aum_purpose AND EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end
      AND purpose = p_purpose
      AND is_voided = false
      AND consolidated_into_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Reporting yield distribution already exists for fund % on % - void the existing one first', p_fund_id, v_period_end;
  END IF;

  -- Compute current AUM from ALL active positions
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_current_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- Use admin-provided recorded AUM if available, else compute
  IF p_recorded_aum IS NOT NULL THEN
    v_recorded_aum := p_recorded_aum;
  ELSE
    v_recorded_aum := v_current_aum + v_gross_yield_amount;
  END IF;

  -- ADB computed from all position-holding accounts
  SELECT COALESCE(SUM(calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end)), 0)
  INTO v_total_adb
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true
    AND p.account_type IN ('investor', 'ib', 'fees_account');

  IF v_total_adb <= 0 THEN
    RAISE EXCEPTION 'No positions with positive average daily balance';
  END IF;

  -- Create the distribution record (now includes snapshot_time)
  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib,
    status, created_by, calculation_method, purpose, is_month_end,
    snapshot_time
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    v_recorded_aum, v_current_aum, v_gross_yield_amount, v_gross_yield_amount,
    0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'ADB', p_purpose, v_is_month_end,
    p_snapshot_time
  ) RETURNING id INTO v_distribution_id;

  -- ====================================================================
  -- REPORTING CONSOLIDATION: Mark crystallization distributions
  -- When purpose = reporting, find all mid-month crystallization distributions
  -- for this fund and mark them as consolidated into this reporting distribution.
  -- Crystallization events are informational (investor_yield_events, admin_only).
  -- The reporting distribution creates the actual investor-visible transactions.
  -- ====================================================================
  IF p_purpose = 'reporting'::aum_purpose THEN
    FOR v_crystal_dist IN
      SELECT id FROM yield_distributions
      WHERE fund_id = p_fund_id
        AND effective_date >= v_period_start
        AND effective_date <= v_period_end
        AND is_voided = false
        AND distribution_type IN ('deposit', 'withdrawal', 'transaction')
        AND consolidated_into_id IS NULL
        AND id != v_distribution_id
    LOOP
      UPDATE yield_distributions
      SET consolidated_into_id = v_distribution_id
      WHERE id = v_crystal_dist.id;
      v_crystals_consolidated := v_crystals_consolidated + 1;
    END LOOP;
  END IF;

  -- Track the largest allocation for residual assignment
  v_largest_alloc_gross := 0;
  v_largest_alloc_investor_id := NULL;

  FOR v_investor IN
    SELECT
      ip.investor_id,
      calc_avg_daily_balance(ip.investor_id, p_fund_id, v_period_start, v_period_end) as adb,
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

    -- Create YIELD transaction (investor-visible for reporting, admin-only for transaction)
    v_yield_tx := apply_transaction_with_crystallization(
      p_investor_id := v_investor.investor_id, p_fund_id := p_fund_id,
      p_tx_type := 'YIELD', p_amount := v_net_share, p_tx_date := v_tx_date,
      p_reference_id := 'yield_adb_' || v_distribution_id::text || '_' || v_investor.investor_id::text,
      p_notes := 'ADB yield distribution for period ' || v_period_start::text || ' to ' || v_period_end::text,
      p_admin_id := v_admin, p_purpose := p_purpose, p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := NULLIF(v_yield_tx->>'tx_id', '')::uuid;

    -- Set visibility_scope based on purpose
    IF p_purpose = 'reporting'::aum_purpose THEN
      UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
      WHERE id = v_yield_tx_id;
    ELSE
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;

    -- FIX: Also update investor_yield_events visibility for non-reporting yields.
    -- The sync_yield_to_investor_yield_events trigger fires on the YIELD tx INSERT
    -- BEFORE we update visibility_scope above, so it copies the default
    -- 'investor_visible' scope. We must correct it here for transaction-purpose yields.
    IF p_purpose != 'reporting'::aum_purpose AND v_yield_tx_id IS NOT NULL THEN
      UPDATE investor_yield_events
      SET visibility_scope = 'admin_only'
      WHERE trigger_transaction_id = v_yield_tx_id;
    END IF;

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

  -- ====================================================================
  -- LARGEST REMAINDER FIX (2.4): Proportional residual adjustment
  -- Residual goes to the largest allocation. We adjust gross, fee, ib,
  -- and net proportionally so per-investor conservation holds.
  -- ====================================================================
  v_residual := v_gross_yield_amount - v_total_gross;

  IF v_residual != 0 AND v_largest_alloc_investor_id IS NOT NULL THEN
    -- Proportional split of residual matching the largest investor's fee/ib rates
    v_adj_fee := ROUND((v_residual * COALESCE(v_largest_alloc_fee_pct, 0) / 100)::numeric, 8);
    v_adj_ib := ROUND((v_residual * COALESCE(v_largest_alloc_ib_rate, 0) / 100)::numeric, 8);
    v_adj_net := v_residual - v_adj_fee - v_adj_ib;

    UPDATE yield_allocations
    SET gross_amount = gross_amount + v_residual,
        net_amount = net_amount + v_adj_net,
        fee_amount = fee_amount + v_adj_fee,
        ib_amount = ib_amount + v_adj_ib
    WHERE distribution_id = v_distribution_id
      AND investor_id = v_largest_alloc_investor_id;

    -- Adjust the YIELD transaction (net amount)
    UPDATE transactions_v2
    SET amount = amount + v_adj_net
    WHERE reference_id = 'yield_adb_' || v_distribution_id::text || '_' || v_largest_alloc_investor_id::text
      AND NOT is_voided;

    PERFORM recompute_investor_position(v_largest_alloc_investor_id, p_fund_id);

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_adj_net;
    v_total_fees := v_total_fees + v_adj_fee;
    v_total_ib := v_total_ib + v_adj_ib;
  END IF;

  -- FEE_CREDIT to fees account
  IF v_total_fees > 0 THEN
    v_fee_tx := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id, p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT', p_amount := v_total_fees, p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_' || v_distribution_id::text,
      p_notes := 'Platform fees for ADB yield period ' || v_period_start::text || ' to ' || v_period_end::text,
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
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false
      AND payout_status = 'pending';
  END IF;

  -- Update distribution summary
  UPDATE yield_distributions SET
    total_net_amount = v_total_net, total_fee_amount = v_total_fees, total_ib_amount = v_total_ib,
    net_yield = v_total_net, total_fees = v_total_fees, total_ib = v_total_ib,
    dust_amount = 0,
    allocation_count = v_allocation_count
  WHERE id = v_distribution_id;

  -- Record AUM in fund_daily_aum
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

  -- Audit log
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
      'calculation_method', 'ADB_v4', 'total_adb', v_total_adb,
      'conservation_check', v_gross_yield_amount = (v_total_net + v_total_fees + v_total_ib),
      'dust_amount', 0, 'residual_applied_to', v_largest_alloc_investor_id,
      'crystals_consolidated', v_crystals_consolidated,
      'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
      'admin_recorded_aum', p_recorded_aum IS NOT NULL,
      'snapshot_time', p_snapshot_time
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
    'crystals_consolidated', v_crystals_consolidated,
    'features', ARRAY['time_weighted', 'loss_carryforward', 'fee_credit', 'ib_commission', 'latest_period_reporting', 'ib_positions_in_adb', 'ib_fee_exempt', 'fee_allocations', 'audit_log', 'distribution_date', 'fees_account_in_adb', 'ib_auto_payout', 'largest_remainder_proportional', 'satoshi_dust_tolerance', 'profiles_fee_only', 'admin_recorded_aum', 'fee_ib_overflow_guard', 'purpose_uniqueness_reporting_only', 'reporting_consolidation', 'visibility_scope_control', 'snapshot_time', 'yield_event_visibility_fix']
  );
END;
$$;
