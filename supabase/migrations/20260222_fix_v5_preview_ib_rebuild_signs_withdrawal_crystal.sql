-- Fix remaining P1/P2 audit findings:
-- 1. V5 Preview: IB rate bypass - reads profiles.ib_percentage instead of get_investor_ib_pct()
-- 2. rebuild_investor_period_balances: missing is_voided=false + sign bugs (double-negation)
-- 3. approve_and_complete_withdrawal: full-exit crystallization passes AUM=0 + investor_id as admin_id

-- ============================================================
-- Fix 1: preview_segmented_yield_distribution_v5 - IB rate bypass
-- Lines 10327, 10407: COALESCE(p.ib_percentage, 0) -> get_investor_ib_pct()
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
  v_segments_out jsonb := '[]'::jsonb;
  v_allocations_out jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_seg_yield numeric := 0;
  v_opening_aum numeric := 0;
  v_largest_idx int := -1;
  v_largest_gross numeric := 0;
  v_largest_fee_pct numeric := 0;
  v_largest_ib_rate numeric := 0;
  v_residual numeric;
  v_adj_fee numeric;
  v_adj_ib numeric;
  v_adj_net numeric;
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

  -- FIX: Use get_investor_ib_pct() instead of COALESCE(p.ib_percentage, 0)
  INSERT INTO _v5p_bal (investor_id, balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT
    p.id,
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
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

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
      AND yd.effective_date > v_period_start
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
      -- FIX: Use get_investor_ib_pct() for new investors appearing mid-period
      INSERT INTO _v5p_bal (investor_id, balance, account_type, ib_parent_id, ib_rate, investor_name, investor_email)
      SELECT
        v_inv.investor_id,
        v_inv.flow_amount,
        p.account_type::text,
        p.ib_parent_id,
        get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_seg_end),
        trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        p.email
      FROM profiles p WHERE p.id = v_inv.investor_id
      ON CONFLICT (investor_id)
      DO UPDATE SET balance = _v5p_bal.balance + v_inv.flow_amount;

      INSERT INTO _v5p_tot (investor_id) VALUES (v_inv.investor_id) ON CONFLICT DO NOTHING;
    END LOOP;

    SELECT COALESCE(SUM(balance), 0) INTO v_balance_sum FROM _v5p_bal;
    v_seg_yield := v_seg_closing_aum - v_balance_sum;
    IF v_seg_yield > 0 THEN
      v_total_seg_yield := v_total_seg_yield + v_seg_yield;
    END IF;

    DECLARE
      v_seg_allocs jsonb := '[]'::jsonb;
      v_seg_investors int := 0;
    BEGIN
      IF v_seg_yield > 0 AND v_balance_sum > 0 THEN
        FOR v_inv IN
          SELECT b.investor_id, b.balance, b.account_type, b.ib_parent_id,
                 b.ib_rate, b.investor_name, b.investor_email
          FROM _v5p_bal b WHERE b.balance > 0
        LOOP
          v_share := v_inv.balance / v_balance_sum;
          v_gross := ROUND((v_seg_yield * v_share)::numeric, 8);

          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_seg_end);
          v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

          IF v_inv.ib_parent_id IS NOT NULL AND v_inv.ib_rate > 0 THEN
            v_ib := ROUND((v_gross * v_inv.ib_rate / 100)::numeric, 8);
          ELSE
            v_ib := 0;
          END IF;

          v_net := v_gross - v_fee - v_ib;

          UPDATE _v5p_bal SET balance = balance + v_net WHERE investor_id = v_inv.investor_id;

          IF v_fee > 0 AND v_fees_account_id IS NOT NULL THEN
            INSERT INTO _v5p_bal (investor_id, balance, account_type)
            VALUES (v_fees_account_id, v_fee, 'fees_account')
            ON CONFLICT (investor_id) DO UPDATE SET balance = _v5p_bal.balance + v_fee;
            INSERT INTO _v5p_tot (investor_id) VALUES (v_fees_account_id) ON CONFLICT DO NOTHING;
          END IF;

          IF v_ib > 0 AND v_inv.ib_parent_id IS NOT NULL THEN
            INSERT INTO _v5p_bal (investor_id, balance, account_type, ib_parent_id, ib_rate, investor_name)
            SELECT v_inv.ib_parent_id, v_ib, p.account_type::text, NULL, 0,
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
            'balance', v_inv.balance,
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
        'investors', v_seg_investors,
        'skipped', (v_seg_yield <= 0),
        'allocations', v_seg_allocs
      );
    END;
  END LOOP;

  v_residual := v_total_seg_yield - v_total_gross;

  v_largest_gross := 0;
  v_largest_idx := 0;
  DECLARE
    v_alloc_idx int := 0;
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
      IF v_alloc.total_gross > v_largest_gross THEN
        v_largest_gross := v_alloc.total_gross;
        v_largest_idx := v_alloc_idx;
        v_largest_fee_pct := COALESCE(
          get_investor_fee_pct(v_alloc.investor_id, p_fund_id, v_period_end), 0);
        v_largest_ib_rate := v_alloc.ib_rate;
      END IF;

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
      v_alloc_idx := v_alloc_idx + 1;
    END LOOP;
  END;

  IF v_residual != 0 AND jsonb_array_length(v_allocations_out) > 0 THEN
    v_adj_fee := ROUND((v_residual * v_largest_fee_pct / 100)::numeric, 8);
    v_adj_ib := ROUND((v_residual * v_largest_ib_rate / 100)::numeric, 8);
    v_adj_net := v_residual - v_adj_fee - v_adj_ib;

    v_allocations_out := jsonb_set(v_allocations_out,
      ARRAY[v_largest_idx::text, 'gross'],
      to_jsonb((v_allocations_out->v_largest_idx->>'gross')::numeric + v_residual));
    v_allocations_out := jsonb_set(v_allocations_out,
      ARRAY[v_largest_idx::text, 'fee'],
      to_jsonb((v_allocations_out->v_largest_idx->>'fee')::numeric + v_adj_fee));
    v_allocations_out := jsonb_set(v_allocations_out,
      ARRAY[v_largest_idx::text, 'ib'],
      to_jsonb((v_allocations_out->v_largest_idx->>'ib')::numeric + v_adj_ib));
    v_allocations_out := jsonb_set(v_allocations_out,
      ARRAY[v_largest_idx::text, 'net'],
      to_jsonb((v_allocations_out->v_largest_idx->>'net')::numeric + v_adj_net));

    v_total_gross := v_total_gross + v_residual;
    v_total_net := v_total_net + v_adj_net;
    v_total_fees := v_total_fees + v_adj_fee;
    v_total_ib := v_total_ib + v_adj_ib;
  END IF;

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
    'investor_count', jsonb_array_length(v_allocations_out),
    'segment_count', v_seg_count,
    'crystal_count', v_crystals_in_period,
    'segments', v_segments_out,
    'allocations', v_allocations_out,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'segmented_v5',
    'features', ARRAY[
      'segmented_proportional', 'per_segment_fees', 'ib_in_running_balance',
      'fees_account_yield', 'largest_remainder', 'crystal_consolidation',
      'aum_only_input', 'segment_notes_in_tx', 'inception_date_period_start'
    ]
  );
END;
$$;


-- ============================================================
-- Fix 2: rebuild_investor_period_balances
-- Bugs: missing is_voided=false, sign double-negation on WITHDRAWAL/FEE
-- Transaction amounts are ALREADY SIGNED: WITHDRAWAL=-100, DEPOSIT=+100
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
      -- Time weight: fraction of period remaining after transaction
      (p_period_end - t.tx_date)::numeric / v_days_in_period as time_weight
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date BETWEEN p_period_start AND p_period_end
      AND t.is_voided = false  -- FIX: exclude voided transactions
  ),

  -- Beginning balance = SUM of all pre-period transactions (amounts already signed)
  beginning_balances AS (
    SELECT
      t.investor_id AS inv_id,
      -- FIX: amounts are already signed (WITHDRAWAL=-100, DEPOSIT=+100)
      -- Just SUM them directly instead of CASE WHEN with double-negation
      COALESCE(SUM(t.amount), 0) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date < p_period_start
      AND t.is_voided = false  -- FIX: exclude voided transactions
    GROUP BY t.investor_id
  ),

  period_movements AS (
    SELECT
      pt.inv_id,
      -- Additions: positive DEPOSIT amounts
      COALESCE(SUM(CASE WHEN pt.type = 'DEPOSIT' THEN pt.amount ELSE 0 END), 0) as additions,
      -- Redemptions: ABS of negative WITHDRAWAL amounts (return positive for display)
      COALESCE(SUM(CASE WHEN pt.type = 'WITHDRAWAL' THEN ABS(pt.amount) ELSE 0 END), 0) as redemptions,
      -- Time-weighted adjustment: use signed amounts directly
      -- FIX: amounts are already signed, no need to negate WITHDRAWAL again
      COALESCE(SUM(pt.amount * pt.time_weight), 0) as time_weighted_adjustment
    FROM period_txns pt
    GROUP BY pt.inv_id
  ),

  all_investors AS (
    SELECT DISTINCT inv_id
    FROM (
      SELECT bb.inv_id FROM beginning_balances bb WHERE bb.balance > 0
      UNION
      -- FIX: redemptions is now positive (ABS), so > 0 works correctly
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
    -- FIX: redemptions is now positive, so subtract it
    (COALESCE(bb.balance, 0) + COALESCE(pm.additions, 0) - COALESCE(pm.redemptions, 0))::numeric AS ending_balance,
    COALESCE(pm.additions, 0)::numeric AS additions,
    COALESCE(pm.redemptions, 0)::numeric AS redemptions,
    (COALESCE(bb.balance, 0) + COALESCE(pm.time_weighted_adjustment, 0))::numeric AS avg_capital,
    v_days_in_period AS days_in_period,
    v_days_in_period AS days_invested,
    -- Use centralized fee resolution (respects fee schedule + fund default)
    get_investor_fee_pct(ai.inv_id, p_fund_id, p_period_end) AS fee_pct,
    p.ib_parent_id,
    -- Use centralized IB resolution (respects IB commission schedule)
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


-- ============================================================
-- Fix 3: approve_and_complete_withdrawal
-- Full-exit crystallization passes AUM=0 (fails validation) and investor_id as admin_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(
  p_request_id uuid,
  p_processed_amount numeric DEFAULT NULL,
  p_tx_hash text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL,
  p_is_full_exit boolean DEFAULT false,
  p_send_precision integer DEFAULT 3
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(28,10);
  v_balance numeric(28,10);
  v_pending_sum numeric(28,10);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(28,10);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(28,10);  -- FIX: added for proper crystallization
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
    BEGIN
      -- FIX: Compute actual closing AUM from current positions (not dummy 0)
      SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
      FROM investor_positions ip
      WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

      SELECT public.crystallize_yield_before_flow(
        v_request.fund_id,
        v_closing_aum,                             -- FIX: actual AUM, not 0
        'withdrawal',                              -- trigger_type
        'full-exit:' || p_request_id::text,        -- FIX: proper trigger_reference
        NOW(),                                     -- event_ts
        v_admin_id                                 -- FIX: admin ID, not investor_id
      ) INTO v_crystal_result;
    EXCEPTION WHEN OTHERS THEN
      -- Crystallization may fail if no yield to distribute; that's OK
      NULL;
    END;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    -- Truncate balance to send precision (floor, not round)
    v_final_amount := TRUNC(v_balance, p_send_precision);
    v_dust := v_balance - v_final_amount;

    -- Safety: if truncated amount is zero (balance < 0.001), send everything as dust
    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  -- Check for other pending withdrawals (exclude current request)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger (only if send amount > 0)
  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'WITHDRAWAL',
      -ABS(v_final_amount),
      CURRENT_DATE,
      v_fund.asset,
      v_reference_id,
      COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id,
      false,
      'investor_visible',
      'rpc_canonical',
      p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- If full exit with dust, create DUST_SWEEP transactions
  IF p_is_full_exit AND v_dust > 0 THEN
    -- Find INDIGO Fees account
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    -- DUST_SWEEP: debit from investor (admin-only, invisible to investor)
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'DUST_SWEEP',
      -ABS(v_dust),
      CURRENT_DATE,
      v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    -- DUST_SWEEP: credit to INDIGO Fees account
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_fees_account_id,
      'DUST_SWEEP',
      ABS(v_dust),
      CURRENT_DATE,
      v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;

    -- Deactivate investor position (balance should now be 0)
    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id;
  END IF;

  -- trg_ledger_sync fires automatically for each INSERT above

  -- Update withdrawal request to completed
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit
  );
END;
$$;
