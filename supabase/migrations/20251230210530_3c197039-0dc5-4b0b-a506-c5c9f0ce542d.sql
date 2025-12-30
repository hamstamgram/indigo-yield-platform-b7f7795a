-- ============================================================================
-- Migration: Yield Distribution v3 RPCs
-- P0-2: Server-side gross yield calculation with validation
-- ============================================================================

-- Create preview_daily_yield_to_fund_v3
CREATE OR REPLACE FUNCTION preview_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_as_of_date date,
  p_new_total_aum numeric,
  p_purpose text DEFAULT 'reporting',
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_current_aum numeric;
  v_gross_yield numeric;
  v_investor RECORD;
  v_investor_rows jsonb := '[]'::jsonb;
  v_ib_credits jsonb := '[]'::jsonb;
  v_total_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_total_net numeric := 0;
  v_investor_count integer := 0;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_period_start date;
  v_period_end date;
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found', 'code', 'FUND_NOT_FOUND');
  END IF;

  -- Calculate period dates
  v_period_start := date_trunc('month', p_as_of_date)::date;
  v_period_end := (date_trunc('month', p_as_of_date) + interval '1 month - 1 day')::date;

  -- Calculate current AUM from authoritative source (positions sum, excluding INDIGO FEES)
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id 
    AND current_value > 0
    AND investor_id != v_indigo_fees_id;

  -- Validation: Cannot distribute with 0 AUM
  IF v_current_aum = 0 AND p_new_total_aum > 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Cannot distribute yield with 0 AUM. Use deposits first.',
      'code', 'ZERO_AUM',
      'current_aum', v_current_aum
    );
  END IF;

  -- Calculate gross yield server-side (THIS IS THE KEY CHANGE)
  v_gross_yield := p_new_total_aum - v_current_aum;

  -- Validation: gross_yield must be positive
  IF v_gross_yield <= 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('New AUM (%s) must exceed current AUM (%s) to distribute yield', p_new_total_aum, v_current_aum),
      'code', 'NEGATIVE_YIELD',
      'current_aum', v_current_aum,
      'new_aum', p_new_total_aum,
      'gross_yield', v_gross_yield
    );
  END IF;

  -- Loop through each investor with a position
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') as investor_name,
      ip.current_value,
      CASE WHEN v_current_aum > 0 THEN ip.current_value / v_current_aum ELSE 0 END as allocation_pct,
      p.account_type,
      -- Fee resolution: investor_fee_schedule > profiles.fee_pct > 20%
      COALESCE(
        (SELECT ifs.fee_pct FROM investor_fee_schedule ifs 
         WHERE ifs.investor_id = ip.investor_id 
           AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
           AND ifs.effective_date <= p_as_of_date
           AND (ifs.end_date IS NULL OR ifs.end_date >= p_as_of_date)
         ORDER BY ifs.fund_id NULLS LAST, ifs.effective_date DESC
         LIMIT 1),
        p.fee_pct,
        20.000
      ) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_percentage,
      COALESCE(p.ib_commission_source, 'platform_fees') as ib_commission_source
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      AND ip.investor_id != v_indigo_fees_id
      AND (p.status IS NULL OR p.status = 'active' OR p.status = 'Active')
    ORDER BY ip.current_value DESC
  LOOP
    DECLARE
      v_gross numeric;
      v_fee numeric;
      v_ib numeric;
      v_net numeric;
      v_ib_parent_name text;
      v_ib_source text := NULL;
      v_ref_id text;
    BEGIN
      -- Pro-rata gross yield
      v_gross := v_gross_yield * v_investor.allocation_pct;
      
      -- Fee as percentage of gross (fee_pct is in 0-100 range)
      v_fee := v_gross * (v_investor.fee_pct / 100);
      
      -- Net to investor = gross - fee (before IB adjustment for investor_yield mode)
      v_net := v_gross - v_fee;
      
      -- Generate reference ID for idempotency
      v_ref_id := 'yield:' || p_fund_id || ':' || v_investor.investor_id || ':' || p_as_of_date || ':' || p_purpose;
      
      -- IB commission calculation based on source
      IF v_investor.ib_parent_id IS NOT NULL AND v_investor.ib_percentage > 0 THEN
        v_ib := v_fee * (v_investor.ib_percentage / 100);
        v_ib_source := v_investor.ib_commission_source;
        
        SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_ib_parent_name
        FROM profiles WHERE id = v_investor.ib_parent_id;
        
        -- If source is 'investor_yield', reduce investor net yield
        IF v_investor.ib_commission_source = 'investor_yield' THEN
          v_net := v_net - v_ib;
        END IF;
        
        -- Add IB credit record
        v_ib_credits := v_ib_credits || jsonb_build_object(
          'ib_investor_id', v_investor.ib_parent_id,
          'ib_investor_name', v_ib_parent_name,
          'source_investor_id', v_investor.investor_id,
          'source_investor_name', v_investor.investor_name,
          'amount', v_ib,
          'ib_percentage', v_investor.ib_percentage,
          'source', v_ib_source,
          'reference_id', 'ib_credit:' || v_investor.ib_parent_id || ':' || v_investor.investor_id || ':' || p_as_of_date,
          'would_skip', false
        );
      ELSE
        v_ib := 0;
        v_ib_parent_name := NULL;
      END IF;
      
      -- Accumulate totals
      v_total_gross := v_total_gross + v_gross;
      v_total_fees := v_total_fees + v_fee;
      v_total_ib := v_total_ib + v_ib;
      v_total_net := v_total_net + v_net;
      v_investor_count := v_investor_count + 1;
      
      v_investor_rows := v_investor_rows || jsonb_build_object(
        'investor_id', v_investor.investor_id,
        'investor_name', v_investor.investor_name,
        'account_type', v_investor.account_type,
        'current_value', v_investor.current_value,
        'allocation_pct', v_investor.allocation_pct,
        'fee_pct', v_investor.fee_pct,
        'gross_yield', v_gross,
        'fee_amount', v_fee,
        'ib_amount', v_ib,
        'ib_source', v_ib_source,
        'net_yield', v_net,
        'ib_parent_id', v_investor.ib_parent_id,
        'ib_parent_name', v_ib_parent_name,
        'ib_percentage', v_investor.ib_percentage,
        'new_balance', v_investor.current_value + v_net,
        'position_delta', v_net,
        'reference_id', v_ref_id,
        'would_skip', EXISTS(SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref_id AND NOT is_voided)
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'fund_code', v_fund.code,
    'fund_asset', v_fund.asset,
    'effective_date', p_as_of_date,
    'purpose', p_purpose,
    'notes', p_notes,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'is_month_end', (p_as_of_date = v_period_end),
    'current_aum', v_current_aum,
    'new_aum', p_new_total_aum,
    'gross_yield', v_gross_yield,
    'total_gross', v_total_gross,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'total_net', v_total_net,
    'platform_fees', v_total_fees - v_total_ib,
    'indigo_fees_credit', v_total_fees - v_total_ib,
    'indigo_fees_id', v_indigo_fees_id,
    'investor_count', v_investor_count,
    'investors', v_investor_rows,
    'ib_credits', v_ib_credits,
    'existing_conflicts', '[]'::jsonb,
    'has_conflicts', false
  );
END;
$$;

-- Grant execute to authenticated users (admins only via RLS)
GRANT EXECUTE ON FUNCTION preview_daily_yield_to_fund_v3 TO authenticated;