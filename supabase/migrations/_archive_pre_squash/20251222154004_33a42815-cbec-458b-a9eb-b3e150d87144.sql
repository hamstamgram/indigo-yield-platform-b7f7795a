-- Fix preview_daily_yield_to_fund_v2 overload conflict
-- There are two versions causing ambiguity:
-- 1. (uuid, date, numeric, uuid, text) - correct one
-- 2. (uuid, date, numeric, aum_purpose) - old one causing conflicts

-- Drop the old conflicting overload (4 params with aum_purpose)
DROP FUNCTION IF EXISTS public.preview_daily_yield_to_fund_v2(uuid, date, numeric, aum_purpose);

-- Ensure the 5-param version is the only one and works correctly
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_date date,
  p_gross_amount numeric,
  p_admin_id uuid,
  p_purpose text DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_total_aum NUMERIC;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_purpose_enum aum_purpose;
  v_distributions jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  v_indigo_credit NUMERIC := 0;
  v_existing_conflicts text[] := '{}';
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ref TEXT;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ib_source TEXT;
BEGIN
  -- Cast purpose to enum
  v_purpose_enum := p_purpose::aum_purpose;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current total AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_total_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No investor positions in fund');
  END IF;

  -- Calculate distributions for each investor
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_class,
      p.full_name,
      p.email,
      p.ib_parent_id,
      p.ib_percentage,
      CASE 
        WHEN ip.investor_id = v_indigo_fees_id THEN 'fees_account'
        WHEN p.ib_parent_id IS NOT NULL THEN 'ib_referral'
        ELSE 'investor'
      END as account_type
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    v_share := rec.current_value / v_total_aum;
    v_gross := p_gross_amount * v_share;

    -- Skip tiny amounts
    IF ABS(v_gross) < 0.00000001 THEN
      CONTINUE;
    END IF;

    -- Generate reference ID for idempotency check
    v_ref := format('yield:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum);

    -- Check for existing conflict
    IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref) THEN
      v_existing_conflicts := array_append(v_existing_conflicts, v_ref);
    END IF;

    -- Calculate fee (INDIGO FEES account has 0% fee)
    IF rec.investor_id = v_indigo_fees_id THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get investor's fee percentage from schedule or default
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
        AND effective_date <= p_date
      ORDER BY effective_date DESC
      LIMIT 1;

      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20;
      END IF;

      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100.0));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;

    -- Check IB
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;
    v_ib_source := NULL;

    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_fee > 0 AND rec.investor_id != v_indigo_fees_id THEN
      v_ib_amount := v_fee * (v_ib_pct / 100.0);
      v_ib_source := 'from_platform_fees';
      v_total_fees := v_total_fees - v_ib_amount;
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;

      -- Add IB credit to list
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ib_investor_id', v_ib_parent_id,
        'ib_investor_name', (SELECT full_name FROM profiles WHERE id = v_ib_parent_id),
        'source_investor_id', rec.investor_id,
        'source_investor_name', rec.full_name,
        'amount', ROUND(v_ib_amount::numeric, 8),
        'ib_percentage', v_ib_pct,
        'source', v_ib_source,
        'reference_id', format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum),
        'would_skip', EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum))
      );
    END IF;

    -- Add distribution
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', rec.full_name,
      'email', rec.email,
      'account_type', rec.account_type,
      'current_balance', ROUND(rec.current_value::numeric, 8),
      'allocation_percentage', ROUND((v_share * 100)::numeric, 4),
      'fee_percentage', v_fee_pct,
      'gross_yield', ROUND(v_gross::numeric, 8),
      'fee_amount', ROUND(v_fee::numeric, 8),
      'net_yield', ROUND(v_net::numeric, 8),
      'new_balance', ROUND((rec.current_value + v_net)::numeric, 8),
      'position_delta', ROUND(v_net::numeric, 8),
      'ib_parent_id', v_ib_parent_id,
      'ib_parent_name', (SELECT full_name FROM profiles WHERE id = v_ib_parent_id),
      'ib_percentage', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount::numeric, 8),
      'ib_source', v_ib_source,
      'reference_id', v_ref,
      'would_skip', EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref)
    );

    v_investor_count := v_investor_count + 1;
  END LOOP;

  -- Calculate INDIGO FEES credit
  v_indigo_credit := v_total_fees;

  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'effective_date', p_date,
    'purpose', v_purpose_enum,
    'current_aum', ROUND(v_total_aum::numeric, 8),
    'new_aum', ROUND((v_total_aum + p_gross_amount)::numeric, 8),
    'gross_yield', ROUND(p_gross_amount::numeric, 8),
    'total_fees', ROUND(v_total_fees::numeric, 8),
    'total_ib_fees', ROUND(v_total_ib_fees::numeric, 8),
    'indigo_credit', ROUND(v_indigo_credit::numeric, 8),
    'investor_count', v_investor_count,
    'distributions', v_distributions,
    'ib_credits', v_ib_credits,
    'existing_conflicts', to_jsonb(v_existing_conflicts),
    'has_conflicts', array_length(v_existing_conflicts, 1) > 0
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text) TO authenticated;