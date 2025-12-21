-- Create preview_daily_yield_to_fund_v2 function
-- This is a read-only dry-run that mirrors apply_daily_yield_to_fund_v2 exactly
-- but performs NO writes

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
  v_purpose_enum aum_purpose;
  v_fund RECORD;
  v_total_aum NUMERIC;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investors_count INTEGER := 0;
  v_is_month_end BOOLEAN;
  v_preview_distribution_id UUID := gen_random_uuid();
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ref TEXT;
  v_fee_ref TEXT;
  v_ib_parent_id UUID;
  v_ib_parent_name TEXT;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ib_source TEXT;
  v_asset TEXT;
  v_investor_name TEXT;
  v_would_skip BOOLEAN;
  
  -- Arrays to collect results
  v_distributions JSONB := '[]'::jsonb;
  v_ib_credits JSONB := '[]'::jsonb;
  v_existing_conflicts TEXT[] := ARRAY[]::TEXT[];
  v_indigo_fees_credit NUMERIC := 0;
BEGIN
  -- Admin check
  IF NOT public.is_admin_for_jwt() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Cast purpose to enum
  BEGIN
    v_purpose_enum := p_purpose::aum_purpose;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid purpose. Use reporting or transaction.');
  END;
  
  -- Check if month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  
  v_asset := v_fund.asset;
  
  -- Get current total AUM for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;
  
  IF v_total_aum <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No investor positions in fund');
  END IF;
  
  -- Check for existing distribution (idempotency warning)
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id::text 
      AND aum_date = p_date 
      AND purpose = v_purpose_enum
  ) THEN
    v_existing_conflicts := array_append(v_existing_conflicts, 'fund_daily_aum:' || p_fund_id || ':' || p_date || ':' || p_purpose);
  END IF;
  
  -- Process each investor (EXACTLY like apply)
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_class,
      p.ib_parent_id,
      p.ib_percentage,
      COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), p.email, ip.investor_id::text) as investor_name,
      p.account_type
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_investors_count := v_investors_count + 1;
    
    -- Calculate investor's share of the gross yield
    v_share := rec.current_value / v_total_aum;
    v_gross := p_gross_amount * v_share;
    
    -- Skip tiny amounts
    IF ABS(v_gross) < 0.00000001 THEN
      CONTINUE;
    END IF;
    
    -- Generate unique reference for idempotency check
    v_ref := format('yield:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum);
    
    -- Check if already processed (idempotency)
    v_would_skip := EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref);
    IF v_would_skip THEN
      v_existing_conflicts := array_append(v_existing_conflicts, v_ref);
    END IF;
    
    -- INDIGO FEES account does NOT pay fees
    IF rec.investor_id = v_indigo_fees_id THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get investor's fee percentage from schedule (same logic as apply)
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
        AND effective_date <= p_date
      ORDER BY effective_date DESC
      LIMIT 1;
      
      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20; -- Default 20%
      END IF;
      
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100.0));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
    END IF;
    
    -- Initialize IB fields
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;
    v_ib_source := NULL;
    v_ib_parent_name := NULL;
    
    -- Process IB allocation if investor has IB parent (same logic as apply)
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_fee > 0 AND rec.investor_id != v_indigo_fees_id THEN
      -- IB commission is taken FROM platform fees
      v_ib_amount := v_fee * (v_ib_pct / 100.0);
      v_ib_source := 'from_platform_fees';
      
      -- Deduct from total fees going to INDIGO
      v_total_fees := v_total_fees - v_ib_amount;
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- Get IB parent name
      SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || COALESCE(last_name, '')), ''), email, v_ib_parent_id::text)
      INTO v_ib_parent_name
      FROM profiles WHERE id = v_ib_parent_id;
      
      -- Add to IB credits array
      v_ib_credits := v_ib_credits || jsonb_build_object(
        'ib_investor_id', v_ib_parent_id,
        'ib_investor_name', v_ib_parent_name,
        'source_investor_id', rec.investor_id,
        'source_investor_name', rec.investor_name,
        'amount', ROUND(v_ib_amount::numeric, 8),
        'ib_percentage', v_ib_pct,
        'source', v_ib_source,
        'reference_id', format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum),
        'would_skip', EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum))
      );
    END IF;
    
    -- Add to distributions array
    v_distributions := v_distributions || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', rec.investor_name,
      'account_type', rec.account_type,
      'current_balance', ROUND(rec.current_value::numeric, 8),
      'allocation_percentage', ROUND((v_share * 100)::numeric, 4),
      'gross_yield', ROUND(v_gross::numeric, 8),
      'fee_percentage', v_fee_pct,
      'fee_amount', ROUND(v_fee::numeric, 8),
      'net_yield', ROUND(v_net::numeric, 8),
      'new_balance', ROUND((rec.current_value + v_net)::numeric, 8),
      'position_delta', ROUND(v_net::numeric, 8),
      'ib_parent_id', v_ib_parent_id,
      'ib_parent_name', v_ib_parent_name,
      'ib_percentage', v_ib_pct,
      'ib_amount', ROUND(v_ib_amount::numeric, 8),
      'ib_source', v_ib_source,
      'reference_id', v_ref,
      'would_skip', v_would_skip
    );
  END LOOP;
  
  -- Calculate INDIGO FEES credit (remaining platform fees after IB)
  v_indigo_fees_credit := v_total_fees;
  
  -- Check for existing fee credit transaction
  v_fee_ref := format('fee_credit:%s:%s:%s', p_fund_id, p_date, v_purpose_enum);
  IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_fee_ref) THEN
    v_existing_conflicts := array_append(v_existing_conflicts, v_fee_ref);
  END IF;
  
  -- Return complete preview
  RETURN jsonb_build_object(
    'success', true,
    'preview', true,
    'distribution_id', v_preview_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'fund_asset', v_asset,
    'effective_date', p_date,
    'purpose', v_purpose_enum,
    'is_month_end', v_is_month_end,
    'current_aum', ROUND(v_total_aum::numeric, 8),
    'new_aum', ROUND((v_total_aum + p_gross_amount)::numeric, 8),
    'gross_amount', ROUND(p_gross_amount::numeric, 8),
    'total_fees', ROUND(v_total_fees::numeric, 8),
    'total_ib_fees', ROUND(v_total_ib_fees::numeric, 8),
    'net_yield', ROUND((p_gross_amount - v_total_fees - v_total_ib_fees)::numeric, 8),
    'indigo_fees_credit', ROUND(v_indigo_fees_credit::numeric, 8),
    'indigo_fees_id', v_indigo_fees_id,
    'investor_count', v_investors_count,
    'distributions', v_distributions,
    'ib_credits', v_ib_credits,
    'existing_conflicts', v_existing_conflicts,
    'has_conflicts', array_length(v_existing_conflicts, 1) > 0,
    'totals', jsonb_build_object(
      'gross', ROUND(p_gross_amount::numeric, 8),
      'fees', ROUND(v_total_fees::numeric, 8),
      'ib_fees', ROUND(v_total_ib_fees::numeric, 8),
      'net', ROUND((p_gross_amount - v_total_fees - v_total_ib_fees)::numeric, 8),
      'indigo_credit', ROUND(v_indigo_fees_credit::numeric, 8)
    )
  );
END;
$$;

-- Grant execute to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.preview_daily_yield_to_fund_v2(uuid, date, numeric, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.preview_daily_yield_to_fund_v2 IS 'Read-only preview of yield distribution. Mirrors apply_daily_yield_to_fund_v2 exactly but performs NO writes. Returns computed distributions, IB credits, INDIGO FEES credit, and idempotency conflicts.';