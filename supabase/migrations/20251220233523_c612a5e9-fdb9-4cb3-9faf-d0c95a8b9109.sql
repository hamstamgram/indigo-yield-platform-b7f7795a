-- Drop existing function first (different signatures)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID);

-- ============================================
-- Fix 1 & 2: Updated apply_daily_yield_to_fund_v2
-- - Records fee_allocations for audit trail
-- - Adds source field to ib_allocations
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id UUID,
  p_date DATE,
  p_gross_amount NUMERIC,
  p_admin_id UUID,
  p_purpose TEXT DEFAULT 'transaction'
)
RETURNS JSONB
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
  v_investors_updated INTEGER := 0;
  v_is_month_end BOOLEAN;
  v_distribution_id UUID := gen_random_uuid();
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ref TEXT;
  v_fee_ref TEXT;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ib_source TEXT;
  v_asset TEXT;
BEGIN
  -- Cast purpose to enum
  v_purpose_enum := p_purpose::aum_purpose;
  
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
  
  -- Process each investor
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_class,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate investor's share of the gross yield
    v_share := rec.current_value / v_total_aum;
    v_gross := p_gross_amount * v_share;
    
    -- Skip tiny amounts
    IF ABS(v_gross) < 0.00000001 THEN
      CONTINUE;
    END IF;
    
    -- Generate unique reference for idempotency
    v_ref := format('yield:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum);
    
    -- Check if already processed (idempotency)
    IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref) THEN
      CONTINUE;
    END IF;
    
    -- INDIGO FEES account does NOT pay fees
    IF rec.investor_id = v_indigo_fees_id THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get investor's fee percentage from schedule
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
    
    -- Record INTEREST transaction (gross yield credit)
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, 
      tx_date, reference_id, notes, created_by, created_at, purpose
    ) VALUES (
      gen_random_uuid(), rec.investor_id, p_fund_id, 'INTEREST', v_asset, 
      rec.fund_class, v_gross, p_date, v_ref, 
      format('Yield distribution (gross) - %s', v_purpose_enum), p_admin_id, now(),
      v_purpose_enum
    );
    
    -- Record FEE transaction (fee debit) if applicable
    IF v_fee > 0 THEN
      v_fee_ref := format('fee:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum);
      
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, 
        tx_date, reference_id, notes, created_by, created_at, purpose
      ) VALUES (
        gen_random_uuid(), rec.investor_id, p_fund_id, 'FEE', v_asset, 
        rec.fund_class, v_fee, p_date, v_fee_ref, 
        format('Platform fee (%s%%) - %s', v_fee_pct, v_purpose_enum), p_admin_id, now(),
        v_purpose_enum
      );
      
      -- FIX 1: Record in fee_allocations for audit trail
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose, base_net_income,
        fee_percentage, fee_amount, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_indigo_fees_id,
        date_trunc('month', p_date)::date, p_date, v_purpose_enum,
        v_gross, v_fee_pct, v_fee, p_admin_id
      )
      ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING;
    END IF;
    
    -- Process IB allocation if investor has IB parent
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_fee > 0 AND rec.investor_id != v_indigo_fees_id THEN
      -- IB commission is taken FROM platform fees (Option A - investor fairness)
      v_ib_amount := v_fee * (v_ib_pct / 100.0);
      v_ib_source := 'from_platform_fees';
      
      -- Deduct from total fees going to INDIGO
      v_total_fees := v_total_fees - v_ib_amount;
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- FIX 2: Record IB allocation with source field
      INSERT INTO ib_allocations (
        id, ib_investor_id, source_investor_id, fund_id, source_net_income, 
        ib_percentage, ib_fee_amount, effective_date, created_by, created_at, 
        purpose, source, distribution_id, period_start, period_end
      ) VALUES (
        gen_random_uuid(), v_ib_parent_id, rec.investor_id, p_fund_id, v_net,
        v_ib_pct, v_ib_amount, p_date, p_admin_id, now(),
        v_purpose_enum, v_ib_source, v_distribution_id,
        date_trunc('month', p_date)::date, p_date
      )
      ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING;
      
      -- Credit IB parent with IB_CREDIT transaction
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount,
        tx_date, reference_id, notes, created_by, created_at, purpose
      ) VALUES (
        gen_random_uuid(), v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_asset,
        rec.fund_class, v_ib_amount, p_date,
        format('ib:%s:%s:%s:%s', p_fund_id, rec.investor_id, p_date, v_purpose_enum),
        format('IB commission from investor %s (%s%% of fee)', 
          LEFT(rec.investor_id::text, 8), v_ib_pct),
        p_admin_id, now(), v_purpose_enum
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      -- Update or create IB parent position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount, updated_at = now()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;
      
      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, cost_basis, shares)
        VALUES (v_ib_parent_id, p_fund_id, v_fund.fund_class, v_ib_amount, 0, 0);
      END IF;
    END IF;
    
    -- Update investor position with net yield
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
    
    v_investors_updated := v_investors_updated + 1;
  END LOOP;
  
  -- Credit remaining platform fees to INDIGO FEES account
  IF v_total_fees > 0 THEN
    v_fee_ref := format('fee_credit:%s:%s:%s', p_fund_id, p_date, v_purpose_enum);
    
    -- Check idempotency
    IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_fee_ref) THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount,
        tx_date, reference_id, notes, created_by, created_at, purpose
      ) VALUES (
        gen_random_uuid(), v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_asset,
        v_fund.fund_class, v_total_fees, p_date, v_fee_ref,
        format('Platform fees collected (after IB: %s) - %s', 
          ROUND(v_total_ib_fees::numeric, 8), v_purpose_enum),
        p_admin_id, now(), v_purpose_enum
      );
      
      -- Update or create INDIGO FEES position
      UPDATE investor_positions
      SET current_value = current_value + v_total_fees, updated_at = now()
      WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
      
      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, cost_basis, shares)
        VALUES (v_indigo_fees_id, p_fund_id, v_fund.fund_class, v_total_fees, 0, 0);
      END IF;
    END IF;
  END IF;
  
  -- Record fund AUM
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by)
  VALUES (p_fund_id::text, p_date, v_total_aum + p_gross_amount, v_purpose_enum, v_is_month_end, 'yield_distribution', p_admin_id)
  ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
    total_aum = EXCLUDED.total_aum,
    is_month_end = EXCLUDED.is_month_end,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investors_updated', v_investors_updated,
    'gross_amount', p_gross_amount,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'purpose', v_purpose_enum,
    'is_month_end', v_is_month_end
  );
END;
$$;

-- ============================================
-- Fix 3: Token Conservation Verification Function
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_yield_distribution_balance(
  p_fund_id UUID,
  p_date DATE,
  p_purpose TEXT DEFAULT 'reporting'
)
RETURNS TABLE (
  check_name TEXT,
  expected NUMERIC,
  actual NUMERIC,
  difference NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gross_yields NUMERIC;
  v_fees NUMERIC;
  v_ib_credits NUMERIC;
  v_fee_credits NUMERIC;
  v_purpose_enum aum_purpose;
BEGIN
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Get transaction totals for the date
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'IB_CREDIT' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'FEE_CREDIT' THEN amount ELSE 0 END), 0)
  INTO v_gross_yields, v_fees, v_ib_credits, v_fee_credits
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date = p_date
    AND purpose = v_purpose_enum;
  
  -- Check 1: Fees = IB Credits + INDIGO Credit
  check_name := 'Fees = IB + INDIGO';
  expected := v_fees;
  actual := v_ib_credits + v_fee_credits;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  -- Check 2: Fee allocations match FEE transactions
  check_name := 'Fee Allocations = Fees';
  SELECT COALESCE(SUM(fee_amount), 0) INTO expected
  FROM fee_allocations
  WHERE fund_id = p_fund_id
    AND period_end = p_date
    AND purpose = v_purpose_enum;
  actual := v_fees;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  -- Check 3: IB allocations match IB_CREDIT transactions
  check_name := 'IB Allocations = IB Credits';
  SELECT COALESCE(SUM(ib_fee_amount), 0) INTO expected
  FROM ib_allocations
  WHERE fund_id = p_fund_id
    AND effective_date = p_date
    AND purpose = v_purpose_enum;
  actual := v_ib_credits;
  difference := expected - actual;
  status := CASE WHEN ABS(difference) < 0.00000001 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;
  
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_yield_distribution_balance(UUID, DATE, TEXT) TO authenticated;