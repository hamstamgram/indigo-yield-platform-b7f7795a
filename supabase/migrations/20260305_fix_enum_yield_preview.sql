-- Migration to fix FLAT_FEE enum exception in yield preview
-- Date: 2026-03-05

BEGIN;

-- Update the preview function to remove FLAT_FEE from the tx_type IN list
CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(
    p_fund_id uuid,
    p_period_end date,
    p_recorded_aum numeric,
    p_admin_id uuid,
    p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_allocations_out jsonb := '[]'::jsonb;
  
  -- MTD variables
  v_prior_mtd_gross numeric;
  v_prior_mtd_fee numeric;
  v_prior_mtd_ib numeric;
  v_prior_mtd_net numeric;
  v_mtd_gross numeric;
  v_mtd_fee numeric;
  v_mtd_ib numeric;
  v_mtd_net numeric;
BEGIN
  IF p_recorded_aum IS NULL OR p_recorded_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recorded AUM must be a positive number');
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
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

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

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
      ELSE
        v_total_gross := v_total_gross + v_gross;
        v_total_net := v_total_net + v_net;
        v_total_fees := v_total_fees + v_fee;
        v_total_ib := v_total_ib + v_ib;

        -- Fetch prior MTD yields from live transaction ledger
        -- FIX: Removed FLAT_FEE from the IN clauses as it is not a valid enum value
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'YIELD' THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN type IN ('FEE') THEN amount * -1 ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN type IN ('IB_CREDIT', 'FEE_CREDIT') THEN amount ELSE 0 END), 0),
          COALESCE(SUM(CASE WHEN type IN ('YIELD', 'FEE', 'IB_CREDIT', 'FEE_CREDIT') THEN amount ELSE 0 END), 0)
        INTO v_prior_mtd_gross, v_prior_mtd_fee, v_prior_mtd_ib, v_prior_mtd_net
        FROM transactions_v2
        WHERE investor_id = v_inv.investor_id
          AND fund_id = p_fund_id
          AND tx_date >= v_period_start AND tx_date <= v_period_end
          AND is_voided = false;

        v_mtd_gross := v_gross + v_prior_mtd_gross;
        v_mtd_fee := v_fee + v_prior_mtd_fee;
        v_mtd_ib := v_ib + v_prior_mtd_ib;
        v_mtd_net := v_net + v_prior_mtd_net;

        v_allocations_out := v_allocations_out || jsonb_build_object(
          'investor_id', v_inv.investor_id,
          'investor_name', v_inv.investor_name,
          'investor_email', v_inv.investor_email,
          'account_type', v_inv.account_type,
          'gross', v_gross,
          'fee_pct', v_fee_pct,
          'fee', v_fee,
          'ib_parent_id', v_inv.ib_parent_id,
          'ib_rate', v_ib_rate,
          'ib', v_ib,
          'net', v_net,
          'mtd_gross', v_mtd_gross,
          'mtd_fee', v_mtd_fee,
          'mtd_ib', v_mtd_ib,
          'mtd_net', v_mtd_net,
          'segments', '[]'::jsonb
        );
      END IF;
    END LOOP;
  END IF;

  v_residual := v_total_month_yield - v_total_gross - v_fees_account_gross;

  RETURN jsonb_build_object(
    'success', true,
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
    'investor_count', jsonb_array_length(v_allocations_out),
    'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib),
    'allocations', v_allocations_out,
    'is_negative_yield', v_is_negative_yield,
    'calculation_method', 'flat_position_proportional_v6'
  );
END;
$$;

COMMIT;
