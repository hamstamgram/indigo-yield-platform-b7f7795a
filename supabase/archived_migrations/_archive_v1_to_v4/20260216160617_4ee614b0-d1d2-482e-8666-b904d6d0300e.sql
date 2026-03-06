
-- =========================================================================
-- FIX BUG 1: get_active_funds_summary - Include ALL account types in AUM
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_active_funds_summary()
RETURNS TABLE(fund_id uuid, fund_code text, fund_name text, fund_asset text, total_aum numeric, investor_count bigint, aum_record_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH fund_metrics AS (
    SELECT
      ip.fund_id,
      -- FIX: Sum ALL account balances (investor + IB + fees_account)
      SUM(ip.current_value) as calculated_aum,
      -- Keep investor_count as investor-only (cosmetic metric)
      COUNT(DISTINCT CASE WHEN p.account_type = 'investor' THEN ip.investor_id END) as distinct_investors
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.current_value > 0
    GROUP BY ip.fund_id
  ),
  aum_counts AS (
    SELECT fda.fund_id, COUNT(*) as record_count
    FROM fund_daily_aum fda
    WHERE fda.is_voided = false
    GROUP BY fda.fund_id
  )
  SELECT
    f.id,
    f.code,
    f.name,
    f.asset,
    COALESCE(fm.calculated_aum, 0) as total_aum,
    COALESCE(fm.distinct_investors, 0) as investor_count,
    COALESCE(ac.record_count, 0) as aum_record_count
  FROM funds f
  LEFT JOIN fund_metrics fm ON f.id = fm.fund_id
  LEFT JOIN aum_counts ac ON f.id = ac.fund_id
  WHERE f.status = 'active'
  ORDER BY total_aum DESC NULLS LAST;
END;
$$;

-- =========================================================================
-- FIX BUG 2: get_fund_composition(uuid) - Include ALL account types
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_fund_composition(p_fund_id uuid)
RETURNS TABLE(investor_id uuid, investor_name text, investor_email text, current_value numeric, ownership_pct numeric, mtd_yield numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_total_fund_aum numeric;
  v_mtd_start date;
  v_mtd_end date;
BEGIN
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  v_mtd_start := date_trunc('month', current_date);
  v_mtd_end := current_date;

  -- FIX: Calculate Total Fund AUM from ALL account types
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_total_fund_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0;

  RETURN QUERY
  WITH investor_yields AS (
    SELECT
      t.investor_id,
      SUM(
        CASE
          WHEN t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') THEN t.amount
          WHEN t.type = 'FEE' THEN -ABS(t.amount)
          ELSE 0
        END
      ) as yield_amount
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.tx_date >= v_mtd_start
      AND t.tx_date <= v_mtd_end
      AND t.is_voided = false
      AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'FEE')
    GROUP BY t.investor_id
  )
  SELECT
    ip.investor_id,
    COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), p.email) as investor_name,
    p.email as investor_email,
    ip.current_value,
    CASE
      WHEN v_total_fund_aum > 0 THEN (ip.current_value / v_total_fund_aum) * 100
      ELSE 0
    END as ownership_pct,
    COALESCE(iy.yield_amount, 0) as mtd_yield
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  LEFT JOIN investor_yields iy ON ip.investor_id = iy.investor_id
  WHERE ip.fund_id = p_fund_id
    -- FIX: Removed account_type = 'investor' filter; show ALL accounts
    AND ip.current_value > 0
  ORDER BY ip.current_value DESC;
END;
$$;

-- =========================================================================
-- FIX BUG 4: preview_segmented_yield_distribution_v5 - Include fees_account in output
-- =========================================================================
CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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

          -- FIX: Include ALL accounts (including fees_account) in totals
          v_total_gross := v_total_gross + v_gross;
          v_total_net := v_total_net + v_net;
          v_total_fees := v_total_fees + v_fee;
          v_total_ib := v_total_ib + v_ib;

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
      -- FIX: Removed fees_account exclusion; INDIGO FEES now appears in output
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
