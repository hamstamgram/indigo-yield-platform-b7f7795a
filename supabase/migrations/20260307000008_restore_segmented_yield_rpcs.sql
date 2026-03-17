-- ============================================================
-- Restore Segmented Yield Distribution RPCs
-- ============================================================
-- These functions were lost during the squashed base migration.
-- We are restoring the canonical versions of `calculate_yield_allocations`, `preview_segmented_yield_distribution_v5`
-- and `apply_segmented_yield_distribution_v5`.

-- ============================================================
-- 0. Math Engine: calculate_yield_allocations
-- ============================================================
DROP FUNCTION IF EXISTS public.calculate_yield_allocations(uuid, numeric, date);

CREATE OR REPLACE FUNCTION public.calculate_yield_allocations(
    p_fund_id uuid, 
    p_recorded_aum numeric, 
    p_period_end date DEFAULT CURRENT_DATE
)
 RETURNS TABLE(
    investor_id uuid, 
    investor_name text, 
    investor_email text, 
    account_type text, 
    ib_parent_id uuid, 
    current_value numeric, 
    share numeric, 
    gross numeric, 
    fee_pct numeric, 
    fee numeric, 
    ib_rate numeric, 
    ib numeric, 
    net numeric, 
    fee_credit numeric, 
    ib_credit numeric
)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
BEGIN
  -- A. Identify the system Fees Account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE profiles.account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- B. Compute Opening AUM (First Principles: Live Truth is Position)
  SELECT COALESCE(SUM(ip_base.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip_base
  WHERE ip_base.fund_id = p_fund_id AND ip_base.is_active = true;

  -- C. Total Yield Generated
  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- D. Calculate allocations
  RETURN QUERY
  WITH all_relevant_investors AS (
    SELECT 
      ip_in.investor_id as ari_investor_id,
      ip_in.current_value as ari_current_value
    FROM investor_positions ip_in
    JOIN profiles p_p ON p_p.id = ip_in.investor_id
    WHERE ip_in.fund_id = p_fund_id AND ip_in.is_active = true AND ip_in.current_value > 0
    UNION
    SELECT v_fees_account_id, 0::numeric
    WHERE v_fees_account_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM investor_positions ip_fees 
        WHERE ip_fees.investor_id = v_fees_account_id 
          AND ip_fees.fund_id = p_fund_id 
          AND ip_fees.is_active = true
      )
    UNION
    SELECT DISTINCT p_child.ib_parent_id, 0::numeric
    FROM investor_positions ip_child
    JOIN profiles p_child ON p_child.id = ip_child.investor_id
    WHERE ip_child.fund_id = p_fund_id 
      AND ip_child.is_active = true 
      AND p_child.ib_parent_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM investor_positions ip_ib 
        WHERE ip_ib.investor_id = p_child.ib_parent_id 
          AND ip_ib.fund_id = p_fund_id 
          AND ip_ib.is_active = true
      )
  ),
  raw_alloc AS (
    SELECT 
      ari.ari_investor_id as r_investor_id,
      trim(COALESCE(p_in.first_name, '') || ' ' || COALESCE(p_in.last_name, '')) AS r_investor_name,
      p_in.email AS r_investor_email,
      p_in.account_type::text AS r_account_type,
      p_in.ib_parent_id as r_ib_parent_id,
      ari.ari_current_value as r_current_value,
      COALESCE((ari.ari_current_value / NULLIF(v_opening_aum, 0)), 0) AS r_share,
      ROUND((v_total_month_yield * COALESCE((ari.ari_current_value / NULLIF(v_opening_aum, 0)), 0))::numeric, 8) AS r_gross,
      CASE 
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.account_type = 'fees_account' THEN 0::numeric
        ELSE get_investor_fee_pct(ari.ari_investor_id, p_fund_id, p_period_end)
      END AS r_fee_pct,
      CASE
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.ib_parent_id IS NULL THEN 0::numeric
        ELSE get_investor_ib_pct(ari.ari_investor_id, p_fund_id, p_period_end)
      END AS r_ib_rate
    FROM all_relevant_investors ari
    JOIN profiles p_in ON p_in.id = ari.ari_investor_id
  ),
  computed_alloc AS (
    SELECT ra.*, 
           ROUND((ra.r_gross * ra.r_fee_pct / 100)::numeric, 8) AS r_fee, 
           ROUND((ra.r_gross * ra.r_ib_rate / 100)::numeric, 8) AS r_ib
    FROM raw_alloc ra
  ),
  final_alloc_p0 AS (
    SELECT ca.*, (ca.r_gross - ca.r_fee - ca.r_ib) AS r_net
    FROM computed_alloc ca
  ),
  totals AS (
     SELECT COALESCE(SUM(ca_t.r_gross), 0) as r_sum_gross, COALESCE(SUM(ca_t.r_fee), 0) as r_total_fees_credit
     FROM final_alloc_p0 ca_t
  ),
  ib_credits AS (
     SELECT ic_in.r_ib_parent_id as ic_parent_id, SUM(ic_in.r_ib) as total_ib_credit
     FROM final_alloc_p0 ic_in
     WHERE ic_in.r_ib_parent_id IS NOT NULL
     GROUP BY ic_in.r_ib_parent_id
  ),
  final_alloc_p1 AS (
    SELECT fa.*,
      CASE WHEN fa.r_investor_id = v_fees_account_id THEN fa.r_net + (v_total_month_yield - (SELECT r_sum_gross FROM totals)) ELSE fa.r_net END AS r_net_final
    FROM final_alloc_p0 fa
  )
  SELECT 
    p1.r_investor_id, p1.r_investor_name, p1.r_investor_email, p1.r_account_type, p1.r_ib_parent_id,
    p1.r_current_value, p1.r_share, p1.r_gross, p1.r_fee_pct, p1.r_fee, p1.r_ib_rate, p1.r_ib, p1.r_net_final,
    CASE WHEN p1.r_investor_id = v_fees_account_id THEN (SELECT r_total_fees_credit FROM totals) ELSE 0::numeric END AS fee_credit,
    COALESCE(ic.total_ib_credit, 0::numeric) AS ib_credit
  FROM final_alloc_p1 p1
  LEFT JOIN ib_credits ic ON ic.ic_parent_id = p1.r_investor_id;
END;
$function$;

-- ============================================================
-- 1. Preview Function
-- ============================================================
DROP FUNCTION IF EXISTS preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS preview_segmented_yield_distribution_v5(uuid, date, numeric, text);
DROP FUNCTION IF EXISTS preview_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose);

CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
  p_fund_id uuid,
  p_period_end date,
  p_recorded_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;

  -- Header totals (excluding fees_account)
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_residual numeric := 0;

  -- Crystal markers
  v_seg_count int := 0;
  v_crystals_in_period int := 0;
  v_segments_meta jsonb := '[]'::jsonb;

  v_alloc RECORD;
  v_inv RECORD;
  v_allocations_out jsonb := '[]'::jsonb;
BEGIN
  -- Validate input
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Period boundaries
  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  -- Identify fees account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- Opening AUM from live positions (FIRST PRINCIPLES: matches apply function)
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- Count crystal markers in period (informational)
  FOR v_inv IN
    SELECT yd.effective_date
    FROM yield_distributions yd
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
      'seg_idx', v_seg_count, 'date', v_inv.effective_date, 'type', 'crystal_marker'
    );
  END LOOP;
  v_seg_count := v_seg_count + 1;

  -- Delegate to canonical allocation function (same as apply uses)
  FOR v_alloc IN
    SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, v_period_end)
  LOOP
    IF v_alloc.investor_id = v_fees_account_id THEN
      -- Fees account: track separately for conservation, but include in output
      v_fees_account_gross := v_fees_account_gross + v_alloc.gross;
    ELSE
      -- Regular investors: accumulate into header totals
      v_total_gross := v_total_gross + v_alloc.gross;
      v_total_net := v_total_net + v_alloc.net;
      v_total_fees := v_total_fees + v_alloc.fee;
      v_total_ib := v_total_ib + v_alloc.ib;
    END IF;

    -- Include ALL investors in allocations output (fees_account for UI visibility)
    IF v_alloc.gross != 0 OR v_alloc.fee_credit != 0 OR v_alloc.ib_credit != 0 THEN
      v_allocations_out := v_allocations_out || jsonb_build_object(
        'investor_id', v_alloc.investor_id,
        'investor_name', v_alloc.investor_name,
        'investor_email', v_alloc.investor_email,
        'account_type', v_alloc.account_type,
        'current_value', v_alloc.current_value,
        'share', v_alloc.share,
        'gross', v_alloc.gross,
        'fee_pct', v_alloc.fee_pct,
        'fee', v_alloc.fee,
        'ib_parent_id', v_alloc.ib_parent_id,
        'ib_rate', v_alloc.ib_rate,
        'ib', v_alloc.ib,
        'net', v_alloc.net,
        'fee_credit', v_alloc.fee_credit,
        'ib_credit', v_alloc.ib_credit
      );
    END IF;
  END LOOP;

  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

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
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'canonical_position_proportional',
    'features', ARRAY[
      'live_position_allocation',
      'negative_yield_support',
      'per_investor_fees',
      'ib_from_gross',
      'fees_account_yield',
      'fees_account_visible',
      'dust_to_fees_account',
      'matches_apply_function'
    ]
  );
END;
$function$;


-- ============================================================
-- 2. Apply Function
-- ============================================================
DROP FUNCTION IF EXISTS apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date);
DROP FUNCTION IF EXISTS apply_segmented_yield_distribution_v5(uuid, numeric, date, date, aum_purpose, uuid);

CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_admin_id uuid,
    p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
    p_distribution_date date DEFAULT NULL::date
) RETURNS jsonb
    LANGUAGE plpgsql
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_tx_result json;
  v_yield_tx_id uuid;
  v_fee_tx_result json;
  v_fee_tx_id uuid;
  v_ib_tx_result json;
  v_ib_tx_id uuid;
  v_final_positions_sum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = v_period_end
        AND purpose = 'reporting' AND is_voided = false
        AND consolidated_into_id IS NULL
        AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
    ) THEN
      RAISE EXCEPTION 'Reporting yield already exists for fund % period ending %. Void before reapplying.',
        p_fund_id, v_period_end;
    END IF;
  END IF;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    RAISE EXCEPTION 'Fees account not configured';
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  INSERT INTO yield_distributions (
    fund_id, effective_date, yield_date, period_start, period_end,
    recorded_aum, previous_aum, gross_yield, gross_yield_amount,
    total_net_amount, total_fee_amount, total_ib_amount,
    net_yield, total_fees, total_ib, dust_amount,
    status, created_by, calculation_method, purpose, is_month_end, allocation_count,
    distribution_type
  ) VALUES (
    p_fund_id, v_period_end, v_period_end, v_period_start, v_period_end,
    p_recorded_aum, v_opening_aum, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    'applied'::yield_distribution_status, v_admin,
    'flat_position_proportional_v6', p_purpose, v_is_month_end, 0,
    CASE WHEN p_purpose = 'reporting' THEN 'month_end' ELSE p_purpose::text END
  ) RETURNING id INTO v_distribution_id;

  DROP TABLE IF EXISTS _vflat_alloc;
  CREATE TEMP TABLE _vflat_alloc (
    investor_id uuid PRIMARY KEY,
    investor_name text,
    investor_email text,
    account_type text NOT NULL DEFAULT 'investor',
    ib_parent_id uuid,
    current_value numeric NOT NULL DEFAULT 0,
    gross numeric NOT NULL DEFAULT 0,
    fee_pct numeric NOT NULL DEFAULT 0,
    fee numeric NOT NULL DEFAULT 0,
    ib_rate numeric NOT NULL DEFAULT 0,
    ib numeric NOT NULL DEFAULT 0,
    net numeric NOT NULL DEFAULT 0
  ) ON COMMIT DROP;

  IF v_total_month_yield != 0 AND v_opening_aum > 0 THEN
    FOR v_inv IN
      SELECT ip.investor_id, ip.current_value,
             p.account_type::text AS account_type,
             p.ib_parent_id,
             trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
             p.email AS investor_email
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
      ORDER BY ip.current_value DESC
    LOOP
      v_share := v_inv.current_value / v_opening_aum;
      v_gross := ROUND((v_total_month_yield * v_share)::numeric, 8);

      IF v_is_negative_yield THEN
        v_fee_pct := 0; v_ib_rate := 0;
        v_fee := 0; v_ib := 0; v_net := v_gross;
      ELSE
        IF v_inv.account_type = 'fees_account' THEN
          v_fee_pct := 0;
        ELSE
          v_fee_pct := get_investor_fee_pct(v_inv.investor_id, p_fund_id, v_period_end);
        END IF;
        v_fee := ROUND((v_gross * v_fee_pct / 100)::numeric, 8);

        v_ib_rate := get_investor_ib_pct(v_inv.investor_id, p_fund_id, v_period_end);
        IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate > 0 THEN
          v_ib := ROUND((v_gross * v_ib_rate / 100)::numeric, 8);
        ELSE
          v_ib := 0;
        END IF;

        v_net := v_gross - v_fee - v_ib;
      END IF;

      IF v_inv.investor_id = v_fees_account_id THEN
        v_fees_account_gross := v_fees_account_gross + v_gross;
        v_fees_account_net := v_fees_account_net + v_net;
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;
      END IF;

      INSERT INTO _vflat_alloc (
        investor_id, investor_name, investor_email, account_type, ib_parent_id,
        current_value, gross, fee_pct, fee, ib_rate, ib, net
      ) VALUES (
        v_inv.investor_id, v_inv.investor_name, v_inv.investor_email,
        v_inv.account_type, v_inv.ib_parent_id,
        v_inv.current_value, v_gross, v_fee_pct, v_fee, v_ib_rate, v_ib, v_net
      );
    END LOOP;
  END IF;

  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;
  v_fees_account_net := v_fees_account_net + v_residual;

  FOR v_alloc IN
    SELECT * FROM _vflat_alloc
    WHERE investor_id != v_fees_account_id AND net != 0
    ORDER BY gross DESC
  LOOP
    v_tx_result := apply_investor_transaction(
      p_investor_id := v_alloc.investor_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := ABS(v_alloc.net),
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
      p_notes := 'Flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := (v_tx_result->>'tx_id')::uuid;

    IF v_yield_tx_id IS NOT NULL THEN
      IF p_purpose = 'reporting'::aum_purpose THEN
        UPDATE transactions_v2 SET visibility_scope = 'investor_visible'::visibility_scope
        WHERE id = v_yield_tx_id;
      ELSE
        UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
        WHERE id = v_yield_tx_id;
      END IF;
    END IF;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id, gross_amount, net_amount,
      fee_amount, ib_amount, adb_share, fee_pct, ib_pct, transaction_id, created_at
    ) VALUES (
      v_distribution_id, v_alloc.investor_id, p_fund_id,
      v_alloc.gross, v_alloc.net, v_alloc.fee, v_alloc.ib,
      0, v_alloc.fee_pct, v_alloc.ib_rate, v_yield_tx_id, NOW()
    );
    v_allocation_count := v_allocation_count + 1;

    IF v_alloc.fee > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income, fee_percentage,
        fee_amount, credit_transaction_id, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_alloc.investor_id, v_fees_account_id,
        v_period_start, v_period_end, p_purpose, v_alloc.gross,
        v_alloc.fee_pct, v_alloc.fee, NULL, v_admin
      );

      INSERT INTO platform_fee_ledger (
        fund_id, yield_distribution_id, investor_id, investor_name,
        gross_yield_amount, fee_percentage, fee_amount, effective_date,
        asset, transaction_id, created_by
      ) VALUES (
        p_fund_id, v_distribution_id, v_alloc.investor_id,
        NULLIF(v_alloc.investor_name, ''),
        v_alloc.gross, v_alloc.fee_pct, v_alloc.fee,
        v_period_end, v_fund.asset, NULL, v_admin
      );
    END IF;

    IF v_alloc.ib > 0 AND v_alloc.ib_parent_id IS NOT NULL THEN
      v_ib_tx_result := apply_investor_transaction(
        p_investor_id := v_alloc.ib_parent_id,
        p_fund_id := p_fund_id,
        p_tx_type := 'IB_CREDIT',
        p_amount := v_alloc.ib,
        p_tx_date := v_tx_date,
        p_reference_id := 'ib_flat_' || v_distribution_id::text || '_' || v_alloc.investor_id::text,
        p_notes := 'IB commission flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
        p_admin_id := v_admin,
        p_purpose := p_purpose,
        p_distribution_id := v_distribution_id
      );
      v_ib_tx_id := (v_ib_tx_result->>'tx_id')::uuid;

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
             v_alloc.gross, v_alloc.ib_rate, v_alloc.ib,
             v_period_end, v_fund.asset, v_ib_tx_id, v_admin
      FROM profiles ib WHERE ib.id = v_alloc.ib_parent_id;
    END IF;
  END LOOP;

  IF v_total_fees > 0 THEN
    v_fee_tx_result := apply_investor_transaction(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'FEE_CREDIT',
      p_amount := v_total_fees,
      p_tx_date := v_tx_date,
      p_reference_id := 'fee_flat_' || v_distribution_id::text,
      p_notes := 'Platform fees flat yield ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_fee_tx_id := (v_fee_tx_result->>'tx_id')::uuid;

    UPDATE platform_fee_ledger SET transaction_id = v_fee_tx_id
    WHERE yield_distribution_id = v_distribution_id AND transaction_id IS NULL;
    UPDATE yield_allocations SET fee_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND fee_amount > 0 AND fee_transaction_id IS NULL;
    UPDATE fee_allocations SET credit_transaction_id = v_fee_tx_id
    WHERE distribution_id = v_distribution_id AND credit_transaction_id IS NULL;
  END IF;

  IF v_fees_account_net != 0 THEN
    v_tx_result := apply_investor_transaction(
      p_investor_id := v_fees_account_id,
      p_fund_id := p_fund_id,
      p_tx_type := 'YIELD',
      p_amount := ABS(v_fees_account_net),
      p_tx_date := v_tx_date,
      p_reference_id := 'yield_flat_fees_' || v_distribution_id::text,
      p_notes := 'Fees account yield + dust flat ' || to_char(v_period_start, 'Mon DD, YYYY'),
      p_admin_id := v_admin,
      p_purpose := p_purpose,
      p_distribution_id := v_distribution_id
    );
    v_yield_tx_id := (v_tx_result->>'tx_id')::uuid;

    IF v_yield_tx_id IS NOT NULL THEN
      UPDATE transactions_v2 SET visibility_scope = 'admin_only'::visibility_scope
      WHERE id = v_yield_tx_id;
    END IF;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    UPDATE ib_allocations
    SET payout_status = 'paid', paid_at = NOW(), paid_by = v_admin
    WHERE distribution_id = v_distribution_id
      AND is_voided = false AND payout_status = 'pending';
  END IF;

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
      'version', 'flat_v6',
      'opening_aum', v_opening_aum,
      'is_negative_yield', v_is_negative_yield
    )
  WHERE id = v_distribution_id;

  -- Apply check_aum_reconciliation to the current date dynamically instead of 1 month behind
  PERFORM check_aum_reconciliation(p_period_end, p_fund_id, 0.01);

  IF p_purpose = 'reporting'::aum_purpose THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, p_purpose, 'yield_distribution_v5', v_admin, v_is_month_end)
    ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
    DO UPDATE SET total_aum = EXCLUDED.total_aum, source = 'yield_distribution_v5',
      is_month_end = EXCLUDED.is_month_end, updated_at = now();
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (p_fund_id, v_period_end, p_recorded_aum, 'transaction', 'yield_distribution_v5', v_admin, v_is_month_end);
  END IF;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_final_positions_sum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
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
    'investor_count', v_allocation_count,
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'position_sum', v_final_positions_sum,
    'ib_auto_paid', (p_purpose = 'reporting'::aum_purpose),
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;
