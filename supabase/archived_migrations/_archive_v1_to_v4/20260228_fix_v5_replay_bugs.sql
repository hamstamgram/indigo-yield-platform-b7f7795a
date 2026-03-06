-- Migration: Fix V5 replay bugs
-- Date: 2026-02-28
--
-- Bug 1: Uniqueness check matches crystal markers, blocking replay
--   Fix: Exclude distribution_type IN ('deposit','withdrawal','transaction') from duplicate check
--
-- Bug 2: UPDATE without WHERE clause fails with pg_safeupdate
--   Fix: Add WHERE clause to temp table updates

-- ============================================================
-- Fix apply function
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose public.aum_purpose DEFAULT 'reporting',
  p_distribution_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;

  -- Segment building
  v_seg_start date;
  v_seg_end date;
  v_seg_closing_aum numeric;
  v_seg_idx int := 0;
  v_seg_count int := 0;
  v_seg_yield numeric;
  v_balance_sum numeric;
  v_opening_balance_sum numeric;
  v_seg_flows numeric;
  v_segments_meta jsonb := '[]'::jsonb;

  -- Running totals
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_seg_yield numeric := 0;
  v_fees_account_gross numeric := 0;
  v_allocation_count int := 0;
  v_opening_aum numeric := 0;

  -- Dust routing (to fees_account, no fee/IB)
  v_residual numeric;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate_seg numeric;

  -- Transaction results
  v_tx_result jsonb;
  v_tx_id uuid;
  v_yield_tx_id uuid;
  v_fee_tx_result jsonb;
  v_fee_tx_id uuid;
  v_ib_tx_result jsonb;
  v_ib_tx_id uuid;

  -- Crystal consolidation
  v_crystals_consolidated int := 0;
  v_crystal_dist RECORD;

  -- Final check
  v_final_positions_sum numeric;
  v_is_month_end boolean;
  v_tx_date date;

  -- Allocation record
  v_alloc RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  -- Load fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Period setup
  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  v_is_month_end := (v_period_end = (date_trunc('month', v_period_end) + interval '1 month - 1 day')::date);

  -- Use p_distribution_date if provided, otherwise fall back to period_end
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  -- Advisory lock
  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- BUG FIX 1: Uniqueness check now excludes crystal/flow markers
  -- Crystal markers have distribution_type IN ('deposit','withdrawal','transaction')
  -- and are meant to be consolidated, not block new month-end distributions
  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND period_end = v_period_end
      AND purpose = p_purpose AND is_voided = false
      AND consolidated_into_id IS NULL
      AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
  ) THEN
    RAISE EXCEPTION 'Distribution already exists for fund % period ending % with purpose %',
      p_fund_id, v_period_end, p_purpose;
  END IF;

  -- Fees account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  -- Suppress AUM auto-recording during yield transaction creation
  PERFORM set_config('indigo.aum_synced', 'true', true);

  -- ============================================================
  -- TEMP TABLES
  -- ============================================================
  DROP TABLE IF EXISTS _v5_bal;
  DROP TABLE IF EXISTS _v5_tot;
  DROP TABLE IF EXISTS _v5_segs;

  CREATE TEMP TABLE _v5_bal (
    investor_id uuid PRIMARY KEY,
    balance numeric NOT NULL DEFAULT 0,
    opening_balance numeric NOT NULL DEFAULT 0,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5_tot (
    investor_id uuid PRIMARY KEY,
    total_gross numeric NOT NULL DEFAULT 0,
    total_fee numeric NOT NULL DEFAULT 0,
    total_ib numeric NOT NULL DEFAULT 0,
    total_net numeric NOT NULL DEFAULT 0,
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5_segs (
    seg_idx int PRIMARY KEY,
    seg_start date NOT NULL,
    seg_end date NOT NULL,
    closing_aum numeric NOT NULL,
    is_last boolean NOT NULL DEFAULT false
  ) ON COMMIT DROP;

  -- ============================================================
  -- Opening balances: SUM(all non-voided txs before period_start)
  -- Uses transactions_v2 to find investors (not investor_positions)
  -- ============================================================
  INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name)
  SELECT
    p.id,
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    p.account_type::text,
    p.ib_parent_id,
    get_investor_ib_pct(p.id, p_fund_id, v_period_end),
    trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
  FROM (
    SELECT DISTINCT t.investor_id
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id AND t.is_voided = false
  ) active_inv
  JOIN profiles p ON p.id = active_inv.investor_id;

  -- Initialize totals
  INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
  SELECT investor_id, ib_parent_id, ib_rate, investor_name FROM _v5_bal;

  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5_bal;

  -- ============================================================
  -- Build segments from crystallization events
  -- Uses >= for day-1 flows (segment boundary fix)
  -- ============================================================
  v_seg_start := v_period_start;
  v_seg_idx := 0;

  FOR v_inv IN
    SELECT
      yd.effective_date,
      COALESCE(fae.closing_aum, 0) as closing_aum
    FROM yield_distributions yd
    LEFT JOIN fund_aum_events fae
      ON fae.fund_id = yd.fund_id
      AND fae.event_date = yd.effective_date
      AND fae.is_voided = false
      AND fae.trigger_type IN ('deposit', 'withdrawal', 'transaction')
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date >= v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_idx := v_seg_idx + 1;
    INSERT INTO _v5_segs (seg_idx, seg_start, seg_end, closing_aum)
    VALUES (v_seg_idx, v_seg_start, v_inv.effective_date, v_inv.closing_aum);
    v_seg_start := v_inv.effective_date;
  END LOOP;

  -- Last/only segment
  v_seg_idx := v_seg_idx + 1;
  INSERT INTO _v5_segs (seg_idx, seg_start, seg_end, closing_aum, is_last)
  VALUES (v_seg_idx, v_seg_start, v_period_end, p_recorded_aum, true);
  v_seg_count := v_seg_idx;

  -- ============================================================
  -- Create the distribution header (amounts updated later)
  -- ============================================================
  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end,
    allocation_count
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin, 'segmented_v5', p_purpose, v_is_month_end,
    0
  ) RETURNING id INTO v_distribution_id;

  -- Consolidate crystallization distributions
  FOR v_crystal_dist IN
    SELECT id FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= v_period_start AND effective_date <= v_period_end
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

  -- ============================================================
  -- Process each segment
  -- Opening-balance allocation timing:
  --   1. Snapshot opening_balance BEFORE flows
  --   2. Apply capital flows
  --   3. Compute yield: closing_aum - opening_balance_sum - flows
  --   4. Allocate yield to opening_balance holders only
  --   5. Update running balance with net yield
  -- ============================================================
  FOR v_seg_idx IN 1..v_seg_count LOOP
    SELECT * INTO v_inv FROM _v5_segs WHERE seg_idx = v_seg_idx;
    v_seg_start := v_inv.seg_start;
    v_seg_end := v_inv.seg_end;
    v_seg_closing_aum := v_inv.closing_aum;

    -- BUG FIX 2: Added WHERE clause for pg_safeupdate compatibility
    -- Step 1: Snapshot opening_balance = current balance BEFORE flows
    UPDATE _v5_bal SET opening_balance = balance WHERE investor_id IS NOT NULL;

    -- Step 2: Apply capital flows for this segment
    v_seg_flows := 0;
    FOR v_inv IN
      SELECT t.investor_id, SUM(t.amount) as flow_amount
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
        AND t.tx_date >= v_seg_start
        AND (
          (v_seg_idx < v_seg_count AND t.tx_date < v_seg_end)
          OR
          (v_seg_idx = v_seg_count AND t.tx_date <= v_seg_end)
        )
      GROUP BY t.investor_id
    LOOP
      INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name)
      SELECT v_inv.investor_id, v_inv.flow_amount, 0, p.account_type::text,
             p.ib_parent_id, get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
             trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT (investor_id)
      DO UPDATE SET balance = _v5_bal.balance + v_inv.flow_amount;

      INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
      SELECT v_inv.investor_id, p.ib_parent_id, get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
             trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT DO NOTHING;

      v_seg_flows := v_seg_flows + v_inv.flow_amount;
    END LOOP;

    -- Step 3: Compute segment yield
    SELECT COALESCE(SUM(opening_balance), 0) INTO v_opening_balance_sum FROM _v5_bal;
    v_seg_yield := v_seg_closing_aum - v_opening_balance_sum - v_seg_flows;

    IF v_seg_yield > 0 THEN
      v_total_seg_yield := v_total_seg_yield + v_seg_yield;
    END IF;

    -- Skip negative yield segments
    IF v_seg_yield <= 0 OR v_opening_balance_sum <= 0 THEN
      v_segments_meta := v_segments_meta || jsonb_build_object(
        'seg_idx', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
        'closing_aum', v_seg_closing_aum, 'yield', v_seg_yield, 'skipped', true,
        'opening_balance_sum', v_opening_balance_sum, 'flows', v_seg_flows
      );
      CONTINUE;
    END IF;

    -- Step 4: Allocate yield proportionally to opening_balance holders ONLY
    -- IB commission from GROSS yield (additive model: total deduction = fee% + ib%)
    FOR v_inv IN
      SELECT b.investor_id, b.opening_balance, b.balance, b.account_type,
             b.ib_parent_id, b.ib_rate, b.investor_name
      FROM _v5_bal b WHERE b.opening_balance > 0
    LOOP
      v_share := v_inv.opening_balance / v_opening_balance_sum;
      v_gross := ROUND((v_seg_yield * v_share)::numeric, 8);

      -- Track fees_account gross separately for accurate dust calculation
      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      END IF;

      -- fees_account earns yield at 0% fee (no self-charging)
      IF v_inv.account_type = 'fees_account' THEN
        v_fee_pct := 0;
      ELSE
        v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_seg_end);
      END IF;
      v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

      -- IB commission from GROSS yield (additive model: total deduction = fee% + ib%)
      v_ib_rate_seg := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end);
      IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate_seg > 0 THEN
        v_ib := ROUND((v_gross * v_ib_rate_seg / 100)::numeric, 8);
      ELSE
        v_ib := 0;
      END IF;

      v_net := v_gross - v_fee - v_ib;

      -- Step 5: Update running balance with net yield
      UPDATE _v5_bal SET balance = balance + v_net WHERE investor_id = v_inv.investor_id;

      -- Credit fees to fees_account for non-fees_account investors
      IF v_fee > 0 AND v_inv.account_type != 'fees_account' THEN
        INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type)
        VALUES (v_fees_account_id, v_fee, 0, 'fees_account')
        ON CONFLICT (investor_id) DO UPDATE SET balance = _v5_bal.balance + v_fee;
        INSERT INTO _v5_tot (investor_id, investor_name)
        VALUES (v_fees_account_id, 'Fees Account')
        ON CONFLICT DO NOTHING;
      END IF;

      IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
        INSERT INTO _v5_bal (investor_id, balance, opening_balance, account_type, investor_name)
        SELECT v_inv.ib_parent_id, v_ib, 0, p.account_type::text,
               trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id
        ON CONFLICT (investor_id) DO UPDATE SET balance = _v5_bal.balance + v_ib;
        INSERT INTO _v5_tot (investor_id, ib_parent_id, ib_rate, investor_name)
        SELECT v_inv.ib_parent_id, NULL, 0,
               trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
        FROM profiles p WHERE p.id = v_inv.ib_parent_id
        ON CONFLICT DO NOTHING;
      END IF;

      -- Accumulate totals
      UPDATE _v5_tot SET
        total_gross = total_gross + v_gross,
        total_fee = total_fee + v_fee,
        total_ib = total_ib + v_ib,
        total_net = total_net + v_net,
        seg_detail = seg_detail || jsonb_build_object(
          'seg', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
          'gross', v_gross, 'fee_pct', v_fee_pct, 'fee', v_fee,
          'ib_pct', v_ib_rate_seg, 'ib', v_ib, 'net', v_net
        )
      WHERE investor_id = v_inv.investor_id;

      -- Only count real investor allocations toward distribution totals
      IF v_inv.investor_id != v_fees_account_id THEN
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;
    END LOOP;

    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_idx, 'start', v_seg_start, 'end', v_seg_end,
      'closing_aum', v_seg_closing_aum, 'yield', v_seg_yield, 'skipped', false,
      'opening_balance_sum', v_opening_balance_sum, 'flows', v_seg_flows,
      'investors', (SELECT count(*) FROM _v5_bal WHERE opening_balance > 0)
    );
  END LOOP;

  -- ============================================================
  -- Dust routing to fees_account (no fee/IB on dust)
  -- ============================================================
  v_residual := v_total_seg_yield - v_total_gross - v_fees_account_gross;

  IF v_residual != 0 THEN
    UPDATE _v5_tot SET
      total_gross = total_gross + v_residual,
      total_net = total_net + v_residual
    WHERE investor_id = v_fees_account_id;

    UPDATE _v5_bal SET balance = balance + v_residual WHERE investor_id = v_fees_account_id;

    v_fees_account_gross := v_fees_account_gross + v_residual;
  END IF;

  -- ============================================================
  -- Create transactions and allocation records
  -- ============================================================
  FOR v_alloc IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.ib_parent_id, t.ib_rate, t.investor_name
    FROM _v5_tot t
    WHERE t.total_net != 0 OR t.total_gross != 0
  LOOP
    -- YIELD transaction for investor (including fees_account)
    IF v_alloc.total_net > 0 THEN
      v_tx_result := apply_transaction_with_crystallization(
        p_investor_id := v_alloc.investor_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'YIELD',
        p_amount := v_alloc.total_net,
        p_tx_date := v_tx_date,
        p_reference_id := 'yield_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'V5 segmented yield for ' || to_char(v_period_start, 'Mon YYYY') ||
          E'\n' || v_alloc.seg_detail::text,
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_yield_tx_id := NULLIF(v_tx_result->>'tx_id', '')::uuid;

      -- Set visibility scope
      IF v_yield_tx_id IS NOT NULL THEN
        IF p_purpose = 'reporting'::aum_purpose THEN
          UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
          WHERE id = v_yield_tx_id;
        ELSE
          UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
          WHERE id = v_yield_tx_id;
        END IF;

        -- Enrich investor_yield_events
        UPDATE investor_yield_events SET
          investor_balance = (
            SELECT COALESCE(current_value, 0) FROM investor_positions
            WHERE investor_id = v_alloc.investor_id AND fund_id = p_fund_id
          ),
          investor_share_pct = CASE
            WHEN v_total_gross > 0
            THEN ROUND((v_alloc.total_gross / v_total_gross * 100)::numeric, 6)
            ELSE 0
          END,
          fund_yield_pct = CASE
            WHEN v_opening_aum > 0
            THEN ROUND((v_total_gross / v_opening_aum * 100)::numeric, 6)
            ELSE 0
          END,
          gross_yield_amount = v_alloc.total_gross,
          fee_pct = CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
                         ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
          fee_amount = v_alloc.total_fee,
          ib_amount = v_alloc.total_ib,
          net_yield_amount = v_alloc.total_net
        WHERE trigger_transaction_id = v_yield_tx_id AND is_voided = false;
      END IF;

      -- yield_allocations
      INSERT INTO yield_allocations (
        distribution_id, investor_id, fund_id, gross_amount, net_amount,
        fee_amount, ib_amount, adb_share, fee_pct, ib_pct,
        transaction_id, created_at
      ) VALUES (
        v_distribution_id, v_alloc.investor_id, p_fund_id,
        v_alloc.total_gross, v_alloc.total_net,
        v_alloc.total_fee, v_alloc.total_ib,
        0,
        CASE WHEN v_alloc.investor_id = v_fees_account_id THEN 0
             ELSE get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end) END,
        v_alloc.ib_rate,
        v_yield_tx_id, NOW()
      );

      v_allocation_count := v_allocation_count + 1;
    END IF;

    -- Fee allocation records - skip for fees_account (no self-charging)
    IF v_alloc.total_fee > 0 AND v_alloc.investor_id != v_fees_account_id THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_alloc.total_gross,
        get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
        v_alloc.total_fee, NULL, v_admin
      );

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date,
        asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id,
        NULLIF(v_alloc.investor_name, ''),
        v_alloc.total_gross,
        get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end),
        v_alloc.total_fee, v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    -- IB allocation
    IF v_alloc.total_ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_transaction_with_crystallization(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.total_ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_credit_v5_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := NULLIF(v_ib_tx_result->>'tx_id', '')::uuid;

      UPDATE yield_allocations SET ib_transaction_id = v_ib_tx_id
      WHERE distribution_id = v_distribution_id
        AND investor_id = v_alloc.investor_id
        AND ib_transaction_id IS NULL;

      INSERT INTO ib_commission_ledger (
        fund_id, yield_distribution_id, source_investor_id, source_investor_name,
        ib_id, ib_name, gross_yield_amount, ib_percentage, ib_commission_amount,
        effective_date, asset, transaction_id, created_by
      )
      SELECT p_fund_id, v_distribution_id, v_alloc.investor_id,
             NULLIF(v_alloc.investor_name, ''),
             v_alloc.ib_parent_id,
             trim(COALESCE(ib.first_name,'') || ' ' || COALESCE(ib.last_name,'')),
             v_alloc.total_gross, v_alloc.ib_rate, v_alloc.total_ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  -- ============================================================
  -- FEE_CREDIT to fees_account
  -- ============================================================
  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_transaction_with_crystallization(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_credit_v5_' || v_distribution_id::text,
      p_notes := 'Platform fees from V5 yield for ' || to_char(v_period_start, 'Mon YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := NULLIF(v_fee_tx_result->>'tx_id', '')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  -- Auto-mark IB allocations as paid for reporting
  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

  -- ============================================================
  -- Update distribution header with final totals
  -- ============================================================
  UPDATE yield_distributions SET
    gross_yield = v_total_gross,
    gross_yield_amount = v_total_gross,
    total_net_amount = v_total_net,
    total_fee_amount = v_total_fees,
    total_ib_amount = v_total_ib,
    net_yield = v_total_net,
    total_fees = v_total_fees,
    total_ib = v_total_ib,
    dust_amount = COALESCE(v_residual, 0),
    allocation_count = v_allocation_count,
    summary_json = jsonb_build_object(
      'segments', v_segments_meta,
      'version', 'v5',
      'opening_aum', v_opening_aum,
      'crystals_consolidated', v_crystals_consolidated
    )
  WHERE id = v_distribution_id;

  -- ============================================================
  -- Record AUM
  -- ============================================================
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
  VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
    is_month_end = EXCLUDED.is_month_end, updated_at = now();

  -- ============================================================
  -- Audit log
  -- ============================================================
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    v_admin, 'YIELD_DISTRIBUTION_V5_APPLIED', 'yield_distributions', v_distribution_id::text,
    jsonb_build_object('opening_aum', v_opening_aum),
    jsonb_build_object(
      'recorded_aum', p_recorded_aum, 'gross_yield', v_total_gross,
      'net_yield', v_total_net, 'total_fees', v_total_fees,
      'total_ib', v_total_ib, 'allocation_count', v_allocation_count
    ),
    jsonb_build_object(
      'fund_id', p_fund_id, 'fund_code', v_fund.code,
      'period_start', v_period_start, 'period_end', v_period_end,
      'purpose', p_purpose::text, 'calculation_method', 'segmented_v5',
      'segment_count', v_seg_count, 'crystals_consolidated', v_crystals_consolidated,
      'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
      'dust_residual', v_residual, 'dust_receiver', 'fees_account',
      'distribution_date', v_tx_date,
      'segments', v_segments_meta
    )
  );

  -- ============================================================
  -- Final conservation check
  -- ============================================================
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'allocation_count', v_allocation_count,
    'segment_count', v_seg_count,
    'crystals_consolidated', v_crystals_consolidated,
    'segments', v_segments_meta,
    'conservation_check', v_total_gross = (v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'position_aum_match', ABS(v_final_positions_sum - p_recorded_aum) < 0.00000001,
    'ib_auto_paid', p_purpose = 'reporting'::aum_purpose,
    'distribution_date', v_tx_date,
    'fund_asset', v_fund.asset,
    'investor_count', v_allocation_count,
    'days_in_period', (v_period_end - v_period_start + 1),
    'features', ARRAY[
      'segmented_proportional', 'per_segment_fees', 'per_segment_ib_rates',
      'ib_in_running_balance', 'fees_account_yield', 'opening_balance_allocation',
      'crystal_consolidation', 'aum_only_input', 'segment_notes_in_tx',
      'inception_date_period_start', 'visibility_scope_control',
      'yield_event_enrichment', 'distribution_date_override',
      'dust_to_fees_account'
    ]
  );
END;
$$;

-- ============================================================
-- Fix preview function (same two fixes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose text DEFAULT 'reporting'::text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_seg_boundaries jsonb := '[]'::jsonb;
  v_crystal RECORD;
  v_seg_start date;
  v_seg_end date;
  v_seg_closing_aum numeric;
  v_seg_idx int := 0;
  v_seg_count int := 0;
  v_seg_yield numeric;
  v_balance_sum numeric;
  v_opening_balance_sum numeric;
  v_seg_flows numeric;
  v_segments_out jsonb := '[]'::jsonb;
  v_allocations_out jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_seg_yield numeric := 0;
  v_opening_aum numeric := 0;
  v_fees_account_gross numeric := 0;
  v_residual numeric;
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_crystals_in_period int := 0;
  v_fees_account_id uuid;
BEGIN
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  v_period_start := GREATEST(
    date_trunc('month', p_period_end)::date,
    COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
  );
  v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  DROP TABLE IF EXISTS _v5p_bal;
  DROP TABLE IF EXISTS _v5p_tot;

  CREATE TEMP TABLE _v5p_bal (
    investor_id uuid PRIMARY KEY,
    balance numeric NOT NULL DEFAULT 0,
    opening_balance numeric NOT NULL DEFAULT 0,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text,
    investor_email text
  ) ON COMMIT DROP;

  CREATE TEMP TABLE _v5p_tot (
    investor_id uuid PRIMARY KEY,
    total_gross numeric NOT NULL DEFAULT 0,
    total_fee numeric NOT NULL DEFAULT 0,
    total_ib numeric NOT NULL DEFAULT 0,
    total_net numeric NOT NULL DEFAULT 0,
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb
  ) ON COMMIT DROP;

  INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT
    p.id,
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
        AND t.tx_date < v_period_start AND t.is_voided = false
    ), 0),
    p.account_type::text,
    p.ib_parent_id,
    get_investor_ib_pct(p.id, p_fund_id, v_period_end),
    trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
    p.email
  FROM (
    SELECT DISTINCT t.investor_id
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id AND t.is_voided = false
  ) active_inv
  JOIN profiles p ON p.id = active_inv.investor_id;

  INSERT INTO _v5p_tot (investor_id)
  SELECT investor_id FROM _v5p_bal;

  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5p_bal;

  DROP TABLE IF EXISTS _v5p_segs;
  CREATE TEMP TABLE _v5p_segs (
    seg_idx int PRIMARY KEY,
    seg_start date NOT NULL,
    seg_end date NOT NULL,
    closing_aum numeric NOT NULL,
    is_last boolean NOT NULL DEFAULT false
  ) ON COMMIT DROP;

  v_seg_start := v_period_start;
  v_seg_idx := 0;

  FOR v_crystal IN
    SELECT
      yd.effective_date,
      COALESCE(fae.closing_aum, 0) as closing_aum
    FROM yield_distributions yd
    LEFT JOIN fund_aum_events fae
      ON fae.fund_id = yd.fund_id
      AND fae.event_date = yd.effective_date
      AND fae.is_voided = false
      AND fae.trigger_type IN ('deposit', 'withdrawal', 'transaction')
    WHERE yd.fund_id = p_fund_id
      AND yd.effective_date >= v_period_start
      AND yd.effective_date <= v_period_end
      AND yd.is_voided = false
      AND yd.distribution_type IN ('deposit', 'withdrawal', 'transaction')
      AND yd.consolidated_into_id IS NULL
    ORDER BY yd.effective_date
  LOOP
    v_seg_idx := v_seg_idx + 1;
    INSERT INTO _v5p_segs (seg_idx, seg_start, seg_end, closing_aum)
    VALUES (v_seg_idx, v_seg_start, v_crystal.effective_date, v_crystal.closing_aum);
    v_seg_start := v_crystal.effective_date;
    v_crystals_in_period := v_crystals_in_period + 1;
  END LOOP;

  v_seg_idx := v_seg_idx + 1;
  INSERT INTO _v5p_segs (seg_idx, seg_start, seg_end, closing_aum, is_last)
  VALUES (v_seg_idx, v_seg_start, v_period_end, p_recorded_aum, true);
  v_seg_count := v_seg_idx;

  FOR v_seg_idx IN 1..v_seg_count LOOP
    SELECT * INTO v_inv FROM _v5p_segs WHERE seg_idx = v_seg_idx;
    v_seg_start := v_inv.seg_start;
    v_seg_end := v_inv.seg_end;
    v_seg_closing_aum := v_inv.closing_aum;

    -- BUG FIX 2: Added WHERE clause for pg_safeupdate compatibility
    UPDATE _v5p_bal SET opening_balance = balance WHERE investor_id IS NOT NULL;

    v_seg_flows := 0;
    FOR v_inv IN
      SELECT t.investor_id, SUM(t.amount) as flow_amount
      FROM transactions_v2 t
      WHERE t.fund_id = p_fund_id
        AND t.is_voided = false
        AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
        AND t.tx_date >= v_seg_start
        AND (
          (v_seg_idx < v_seg_count AND t.tx_date < v_seg_end)
          OR
          (v_seg_idx = v_seg_count AND t.tx_date <= v_seg_end)
        )
      GROUP BY t.investor_id
    LOOP
      INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
      SELECT
        v_inv.investor_id,
        v_inv.flow_amount,
        0,
        p.account_type::text,
        p.ib_parent_id,
        get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
        trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        p.email
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT (investor_id)
      DO UPDATE SET balance = _v5p_bal.balance + v_inv.flow_amount;

      INSERT INTO _v5p_tot (investor_id) VALUES (v_inv.investor_id) ON CONFLICT DO NOTHING;
      v_seg_flows := v_seg_flows + v_inv.flow_amount;
    END LOOP;

    SELECT COALESCE(SUM(opening_balance), 0) INTO v_opening_balance_sum FROM _v5p_bal;
    v_seg_yield := v_seg_closing_aum - v_opening_balance_sum - v_seg_flows;

    IF v_seg_yield > 0 THEN
      v_total_seg_yield := v_total_seg_yield + v_seg_yield;
    END IF;

    DECLARE
      v_seg_allocs jsonb := '[]'::jsonb;
      v_seg_investors int := 0;
    BEGIN
      IF v_seg_yield > 0 AND v_opening_balance_sum > 0 THEN
        FOR v_inv IN
          SELECT b.investor_id, b.opening_balance, b.balance, b.account_type,
                 b.ib_parent_id, b.ib_rate, b.investor_name, b.investor_email
          FROM _v5p_bal b WHERE b.opening_balance > 0
        LOOP
          v_share := v_inv.opening_balance / v_opening_balance_sum;
          v_gross := ROUND((v_seg_yield * v_share)::numeric, 8);

          IF v_inv.investor_id = v_fees_account_id THEN
            v_fees_account_gross := v_fees_account_gross + v_gross;
          END IF;

          IF v_inv.account_type = 'fees_account' THEN
            v_fee_pct := 0;
          ELSE
            v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_seg_end);
          END IF;
          v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

          IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_rate > 0 THEN
            v_ib := ROUND((v_gross * v_inv.ib_rate / 100)::numeric, 8);
          ELSE
            v_ib := 0;
          END IF;

          v_net := v_gross - v_fee - v_ib;

          UPDATE _v5p_bal SET balance = balance + v_net WHERE investor_id = v_inv.investor_id;

          IF v_fee > 0 AND v_fees_account_id IS NOT NULL AND v_inv.account_type != 'fees_account' THEN
            INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type)
            VALUES (v_fees_account_id, v_fee, 0, 'fees_account')
            ON CONFLICT (investor_id) DO UPDATE SET balance = _v5p_bal.balance + v_fee;
            INSERT INTO _v5p_tot (investor_id) VALUES (v_fees_account_id) ON CONFLICT DO NOTHING;
          END IF;

          IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
            INSERT INTO _v5p_bal (investor_id, balance, opening_balance, account_type, ib_parent_id, ib_rate, investor_name)
            SELECT v_inv.ib_parent_id, v_ib, 0, p.account_type::text, NULL, 0,
                   trim(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,''))
            FROM profiles p WHERE p.id = v_inv.ib_parent_id
            ON CONFLICT (investor_id) DO UPDATE SET balance = _v5p_bal.balance + v_ib;
            INSERT INTO _v5p_tot (investor_id) VALUES (v_inv.ib_parent_id) ON CONFLICT DO NOTHING;
          END IF;

          UPDATE _v5p_tot SET
            total_gross = total_gross + v_gross,
            total_fee = total_fee + v_fee,
            total_ib = total_ib + v_ib,
            total_net = total_net + v_net,
            seg_detail = seg_detail || jsonb_build_object(
              'seg', v_seg_idx, 'gross', v_gross, 'fee', v_fee,
              'fee_pct', v_fee_pct, 'ib', v_ib, 'net', v_net
            )
          WHERE investor_id = v_inv.investor_id;

          IF v_inv.investor_id != v_fees_account_id THEN
            v_total_gross := v_total_gross + v_gross;
            v_total_net := v_total_net + v_net;
            v_total_fees := v_total_fees + v_fee;
            v_total_ib := v_total_ib + v_ib;
          END IF;
          v_seg_investors := v_seg_investors + 1;

          v_seg_allocs := v_seg_allocs || jsonb_build_object(
            'investor_id', v_inv.investor_id,
            'investor_name', v_inv.investor_name,
            'opening_balance', v_inv.opening_balance,
            'share_pct', ROUND((v_share * 100)::numeric, 4),
            'gross', v_gross, 'fee_pct', v_fee_pct, 'fee', v_fee,
            'ib_rate', v_inv.ib_rate, 'ib', v_ib, 'net', v_net
          );
        END LOOP;
      END IF;

      v_segments_out := v_segments_out || jsonb_build_object(
        'seg_idx', v_seg_idx,
        'start', v_seg_start, 'end', v_seg_end,
        'closing_aum', v_seg_closing_aum,
        'yield', GREATEST(v_seg_yield, 0),
        'opening_balance_sum', v_opening_balance_sum,
        'flows', v_seg_flows,
        'investors', v_seg_investors,
        'skipped', (v_seg_yield <= 0),
        'allocations', v_seg_allocs
      );
    END;
  END LOOP;

  v_residual := v_total_seg_yield - v_total_gross - v_fees_account_gross;

  DECLARE
    v_alloc RECORD;
  BEGIN
    FOR v_alloc IN
      SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
             t.seg_detail, b.investor_name, b.investor_email, b.account_type,
             b.ib_parent_id, b.ib_rate
      FROM _v5p_tot t
      JOIN _v5p_bal b ON b.investor_id = t.investor_id
      WHERE t.total_gross > 0
        AND t.investor_id != v_fees_account_id
      ORDER BY t.total_gross DESC
    LOOP
      v_allocations_out := v_allocations_out || jsonb_build_object(
        'investor_id', v_alloc.investor_id,
        'investor_name', v_alloc.investor_name,
        'investor_email', v_alloc.investor_email,
        'account_type', v_alloc.account_type,
        'gross', v_alloc.total_gross,
        'fee_pct', COALESCE(
          get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0),
        'fee', v_alloc.total_fee,
        'ib_parent_id', v_alloc.ib_parent_id,
        'ib_rate', v_alloc.ib_rate,
        'ib', v_alloc.total_ib,
        'net', v_alloc.total_net,
        'segments', v_alloc.seg_detail
      );
    END LOOP;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'days_in_period', v_period_end - v_period_start + 1,
    'opening_aum', v_opening_aum,
    'recorded_aum', p_recorded_aum,
    'total_yield', v_total_gross,
    'gross_yield', v_total_gross,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'dust_amount', COALESCE(v_residual, 0),
    'dust_receiver', 'fees_account',
    'investor_count', jsonb_array_length(v_allocations_out),
    'segment_count', v_seg_count,
    'crystal_count', v_crystals_in_period,
    'segments', v_segments_out,
    'allocations', v_allocations_out,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'segmented_v5',
    'features', ARRAY[
      'segmented_proportional', 'per_segment_fees', 'opening_balance_allocation',
      'ib_in_running_balance', 'fees_account_yield', 'dust_to_fees_account',
      'crystal_consolidation', 'aum_only_input', 'inception_date_period_start'
    ]
  );
END;
$$;
