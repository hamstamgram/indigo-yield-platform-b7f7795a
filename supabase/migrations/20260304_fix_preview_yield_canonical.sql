-- Migration: Fix preview_segmented_yield_distribution_v5 to use canonical math
-- Date: 2026-03-04
--
-- Problem: Two overloads existed with different math:
--   4-param (20260303): Used historical transaction sums (BROKEN - inflated by crystallized yield)
--   5-param (20260305): Used live positions (correct, but UI doesn't call it)
--
-- Fix: Drop BOTH overloads. Create ONE canonical 4-param version that:
--   1. Delegates to calculate_yield_allocations() (same as apply function)
--   2. Includes fees_account in allocations output (for UI visibility)
--   3. Excludes fees_account from header totals (conservation identity)
--   4. Reports crystal markers (informational)

BEGIN;

-- Drop ALL overloads to avoid ambiguity
DROP FUNCTION IF EXISTS preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose);
DROP FUNCTION IF EXISTS preview_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose);

-- Create ONE canonical preview (4-param, matching UI call site)
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

COMMIT;
