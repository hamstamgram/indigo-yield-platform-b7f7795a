-- Migration: Align V5 preview function with month-level apply logic
-- Date: 2026-02-28
--
-- The preview function still used per-segment yield computation (skipping negative segments).
-- This rewrites it to use the same month-level approach as the apply function:
--   total_yield = pClosing - opening_balance_sum - month_flows
-- Negative yield: proportional loss, no fees/IB (scorched earth rules).
-- Crystal markers shown in metadata but NOT used for yield computation.

-- Drop old text-parameter overload (causes ambiguity with aum_purpose version)
DROP FUNCTION IF EXISTS public.preview_segmented_yield_distribution_v5(uuid, date, numeric, text);

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose public.aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;

  -- Month-level yield
  v_opening_balance_sum numeric := 0;
  v_total_month_flows numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Running totals (header: excludes fees_account)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_opening_aum numeric := 0;

  -- Dust
  v_residual numeric;

  -- Per-investor iteration
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;

  -- Crystal marker metadata
  v_seg_count int := 0;
  v_crystals_in_period int := 0;
  v_segments_meta jsonb := '[]'::jsonb;

  -- Output
  v_allocations_out jsonb := '[]'::jsonb;
BEGIN
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

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

  -- ============================================================
  -- TEMP TABLES (preview-specific names to avoid collisions)
  -- ============================================================
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
    seg_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
    ib_parent_id uuid,
    ib_rate numeric NOT NULL DEFAULT 0,
    investor_name text,
    investor_email text
  ) ON COMMIT DROP;

  -- ============================================================
  -- Opening balances: SUM(all non-voided txs before period_start)
  -- ============================================================
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

  -- Initialize totals table
  INSERT INTO _v5p_tot (investor_id, ib_parent_id, ib_rate, investor_name, investor_email)
  SELECT investor_id, ib_parent_id, ib_rate, investor_name, investor_email FROM _v5p_bal;

  -- Opening AUM
  SELECT COALESCE(SUM(balance), 0) INTO v_opening_aum FROM _v5p_bal;
  v_opening_balance_sum := v_opening_aum;

  -- ============================================================
  -- MONTH-LEVEL YIELD COMPUTATION (matches apply function)
  -- yield = pClosing - opening - flows
  -- ============================================================
  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_month_flows
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= v_period_start
    AND t.tx_date <= v_period_end;

  v_total_month_yield := p_recorded_aum - v_opening_balance_sum - v_total_month_flows;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- ============================================================
  -- Build crystal marker metadata (for display, NOT yield computation)
  -- ============================================================
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
    v_seg_count := v_seg_count + 1;
    v_crystals_in_period := v_crystals_in_period + 1;
    v_segments_meta := v_segments_meta || jsonb_build_object(
      'seg_idx', v_seg_count,
      'date', v_inv.effective_date,
      'marker_closing_aum', v_inv.closing_aum,
      'type', 'crystal_marker'
    );
  END LOOP;
  v_seg_count := v_seg_count + 1;

  -- ============================================================
  -- YIELD ALLOCATION (matches apply function exactly)
  -- ============================================================
  IF v_total_month_yield != 0 AND v_opening_balance_sum > 0 THEN

    FOR v_inv IN
      SELECT b.investor_id, b.opening_balance, b.account_type,
             b.ib_parent_id, b.ib_rate, b.investor_name, b.investor_email
      FROM _v5p_bal b WHERE b.opening_balance > 0
    LOOP
      v_share := v_inv.opening_balance / v_opening_balance_sum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        -- Negative yield: proportional loss, NO fees, NO IB
        v_fee := 0;
        v_ib := 0;
        v_net := v_gross;
        v_fee_pct := 0;
        v_ib_rate := 0;
      ELSE
        -- Positive yield: apply fees and IB
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        -- IB commission from GROSS yield (additive model)
        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      -- Track fees_account gross separately
      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      -- Accumulate per-investor totals
      UPDATE _v5p_tot SET
        total_gross = v_gross,
        total_fee = v_fee,
        total_ib = v_ib,
        total_net = v_net,
        seg_detail = jsonb_build_object(
          'gross', v_gross, 'fee_pct', v_fee_pct,
          'fee', v_fee, 'ib_pct', v_ib_rate,
          'ib', v_ib, 'net', v_net, 'share', v_share
        )
      WHERE investor_id = v_inv.investor_id;
    END LOOP;

  END IF;

  -- ============================================================
  -- DUST ROUTING to fees_account
  -- ============================================================
  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  IF v_residual != 0 THEN
    UPDATE _v5p_tot SET
      total_gross = total_gross + v_residual,
      total_net = total_net + v_residual
    WHERE investor_id = v_fees_account_id;

    v_fees_account_gross := v_fees_account_gross + v_residual;
  END IF;

  -- ============================================================
  -- BUILD ALLOCATIONS OUTPUT (excluding fees_account)
  -- ============================================================
  FOR v_inv IN
    SELECT t.investor_id, t.total_gross, t.total_fee, t.total_ib, t.total_net,
           t.seg_detail, t.investor_name, t.investor_email, t.ib_parent_id, t.ib_rate
    FROM _v5p_tot t
    WHERE t.total_gross != 0
      AND t.investor_id != v_fees_account_id
    ORDER BY ABS(t.total_gross) DESC
  LOOP
    v_allocations_out := v_allocations_out || jsonb_build_object(
      'investor_id', v_inv.investor_id,
      'investor_name', v_inv.investor_name,
      'investor_email', v_inv.investor_email,
      'account_type', COALESCE((SELECT account_type::text FROM _v5p_bal WHERE investor_id = v_inv.investor_id), 'investor'),
      'gross', v_inv.total_gross,
      'fee_pct', COALESCE(
        get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end), 0),
      'fee', v_inv.total_fee,
      'ib_parent_id', v_inv.ib_parent_id,
      'ib_rate', v_inv.ib_rate,
      'ib', v_inv.total_ib,
      'net', v_inv.total_net,
      'details', v_inv.seg_detail
    );
  END LOOP;

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
    'month_yield', v_total_month_yield,
    'month_flows', v_total_month_flows,
    'is_negative_yield', v_is_negative_yield,
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
    'crystal_markers', v_segments_meta,
    'allocations', v_allocations_out,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'calculation_method', 'segmented_v5_month_level',
    'features', ARRAY[
      'month_level_yield', 'opening_balance_allocation', 'negative_yield_support',
      'per_investor_fees', 'ib_from_gross', 'fees_account_yield',
      'crystal_consolidation', 'aum_only_input',
      'inception_date_period_start', 'dust_to_fees_account'
    ]
  );
END;
$$;
