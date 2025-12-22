-- First, drop ALL existing versions of the functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID, aum_purpose);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID);
DROP FUNCTION IF EXISTS public.preview_investor_balances(UUID);
DROP FUNCTION IF EXISTS public.preview_investor_balances();
DROP FUNCTION IF EXISTS public.update_withdrawal(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.delete_withdrawal(UUID, TEXT, UUID);

-- ============================================================================
-- FIX 1: apply_daily_yield_to_fund_v2 - Replace full_name references
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id UUID,
  p_date DATE,
  p_gross_amount NUMERIC,
  p_admin_id UUID,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_total_current_value NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investors_updated INT := 0;
  v_distribution_id UUID;
  v_is_month_end BOOLEAN;
  v_period_id UUID;
  v_result JSONB;
  v_indigo_fees_id UUID;
  rec RECORD;
  v_fee_pct NUMERIC;
  v_gross_yield NUMERIC;
  v_fee_amount NUMERIC;
  v_net_yield NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_txn_id UUID;
BEGIN
  -- Get fund details
  SELECT id, code, asset, fund_class INTO v_fund
  FROM funds WHERE id = p_fund_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  
  -- Check if this is month-end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  
  -- Get period ID for the date
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE year = EXTRACT(YEAR FROM p_date)::INT
    AND month = EXTRACT(MONTH FROM p_date)::INT;
  
  -- Get INDIGO FEES account (using account_type, not full_name which doesn't exist)
  SELECT id INTO v_indigo_fees_id
  FROM profiles
  WHERE account_type = 'fees'
  LIMIT 1;
  
  -- Calculate total current value for allocation percentages
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_current_value
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;
  
  IF v_total_current_value <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No investor positions found');
  END IF;
  
  -- Create distribution record
  INSERT INTO yield_distributions (
    fund_id, effective_date, gross_amount, purpose, 
    created_by, status, is_month_end, period_id
  ) VALUES (
    p_fund_id, p_date, p_gross_amount, p_purpose,
    p_admin_id, 'applied', v_is_month_end, v_period_id
  ) RETURNING id INTO v_distribution_id;
  
  -- Process each investor with positive balance
  FOR rec IN
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage,
      TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Skip INDIGO FEES account
    IF rec.investor_id = v_indigo_fees_id OR rec.account_type = 'fees' THEN
      CONTINUE;
    END IF;
    
    -- Get fee percentage for this investor
    SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
    FROM investor_fee_schedule
    WHERE investor_id = rec.investor_id
      AND (fund_id = p_fund_id OR fund_id IS NULL)
      AND effective_date <= p_date
      AND (end_date IS NULL OR end_date >= p_date)
    ORDER BY fund_id NULLS LAST, effective_date DESC
    LIMIT 1;
    
    -- Default to 20% if no schedule found
    v_fee_pct := COALESCE(v_fee_pct, 20);
    
    -- Calculate yields
    v_gross_yield := p_gross_amount * (rec.current_value / v_total_current_value);
    v_fee_amount := v_gross_yield * (v_fee_pct / 100);
    v_net_yield := v_gross_yield - v_fee_amount;
    
    -- Handle IB commission if applicable
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    v_ib_amount := 0;
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      v_ib_amount := v_net_yield * (v_ib_pct / 100);
      v_net_yield := v_net_yield - v_ib_amount;
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- Credit IB parent
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount,
          updated_at = NOW()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;
      
      -- Create IB credit transaction
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, 
        effective_date, description, created_by, purpose
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'ib_commission', v_ib_amount,
        p_date, 
        'IB commission from ' || rec.investor_name,
        p_admin_id, p_purpose
      );
      
      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, ib_investor_id, source_investor_id,
        ib_percentage, ib_fee_amount, source_net_income,
        fund_id, effective_date, period_id, purpose, created_by
      ) VALUES (
        v_distribution_id, v_ib_parent_id, rec.investor_id,
        v_ib_pct, v_ib_amount, v_net_yield + v_ib_amount,
        p_fund_id, p_date, v_period_id, p_purpose, p_admin_id
      );
    END IF;
    
    -- Update investor position
    UPDATE investor_positions
    SET current_value = current_value + v_net_yield,
        updated_at = NOW()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
    
    -- Create yield transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount,
      effective_date, description, created_by, purpose
    ) VALUES (
      rec.investor_id, p_fund_id, 'yield', v_net_yield,
      p_date, 'Daily yield distribution', p_admin_id, p_purpose
    ) RETURNING id INTO v_txn_id;
    
    -- Record fee allocation
    INSERT INTO fee_allocations (
      distribution_id, investor_id, fund_id,
      fee_percentage, fee_amount, base_net_income,
      fees_account_id, period_start, period_end, purpose, created_by
    ) VALUES (
      v_distribution_id, rec.investor_id, p_fund_id,
      v_fee_pct, v_fee_amount, v_gross_yield,
      v_indigo_fees_id, p_date, p_date, p_purpose, p_admin_id
    );
    
    v_total_fees := v_total_fees + v_fee_amount;
    v_investors_updated := v_investors_updated + 1;
  END LOOP;
  
  -- Credit INDIGO FEES account with total fees
  IF v_indigo_fees_id IS NOT NULL AND v_total_fees > 0 THEN
    UPDATE investor_positions
    SET current_value = current_value + v_total_fees,
        updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
    
    -- Create fee credit transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount,
      effective_date, description, created_by, purpose
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'fee_credit', v_total_fees,
      p_date, 'Platform fees from yield distribution', p_admin_id, p_purpose
    );
  END IF;
  
  -- Update distribution record with totals
  UPDATE yield_distributions
  SET net_amount = p_gross_amount - v_total_fees - v_total_ib_fees,
      total_fees = v_total_fees,
      total_ib_fees = v_total_ib_fees,
      investors_count = v_investors_updated
  WHERE id = v_distribution_id;
  
  -- Record in fund_daily_aum
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, created_by
  ) VALUES (
    p_fund_id, p_date, v_total_current_value + p_gross_amount, 
    p_purpose, v_is_month_end, p_admin_id
  ) ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE
  SET total_aum = EXCLUDED.total_aum,
      is_month_end = EXCLUDED.is_month_end,
      updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investors_updated', v_investors_updated,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'net_distributed', p_gross_amount - v_total_fees - v_total_ib_fees
  );
END;
$$;

-- ============================================================================
-- FIX 2: preview_investor_balances - Replace full_name references
-- ============================================================================

CREATE OR REPLACE FUNCTION public.preview_investor_balances(
  p_fund_id UUID DEFAULT NULL
)
RETURNS TABLE (
  investor_id UUID,
  investor_name TEXT,
  account_type TEXT,
  fund_id UUID,
  fund_code TEXT,
  current_value NUMERIC,
  cost_basis NUMERIC,
  unrealized_pnl NUMERIC,
  allocation_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aum NUMERIC;
BEGIN
  -- Calculate total AUM for allocation percentages
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_total_aum
  FROM investor_positions ip
  WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
    AND ip.current_value > 0;
  
  RETURN QUERY
  SELECT 
    ip.investor_id,
    TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
    p.account_type::TEXT,
    ip.fund_id,
    f.code AS fund_code,
    ip.current_value,
    ip.cost_basis,
    (ip.current_value - ip.cost_basis) AS unrealized_pnl,
    CASE WHEN v_total_aum > 0 
      THEN ROUND((ip.current_value / v_total_aum) * 100, 4)
      ELSE 0 
    END AS allocation_pct
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  JOIN funds f ON f.id = ip.fund_id
  WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
    AND ip.current_value > 0
  ORDER BY ip.current_value DESC;
END;
$$;

-- ============================================================================
-- FIX 3: update_withdrawal - Fix table name and column names
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_withdrawal(
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_result JSONB;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM withdrawal_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;
  
  -- Update the withdrawal request
  UPDATE withdrawal_requests
  SET status = p_status,
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      reviewed_by = p_admin_id,
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Log to audit table (using correct table and column names)
  INSERT INTO withdrawal_audit_logs (
    request_id, action, old_status, new_status, 
    details, performed_by
  ) VALUES (
    p_request_id, 'status_update', v_old_status, p_status,
    jsonb_build_object('admin_notes', p_admin_notes),
    p_admin_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'old_status', v_old_status,
    'new_status', p_status
  );
END;
$$;

-- ============================================================================
-- FIX 4: delete_withdrawal - Fix table name and column names
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_withdrawal(
  p_request_id UUID,
  p_reason TEXT DEFAULT 'Deleted by admin',
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Get withdrawal details before deletion
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Withdrawal request not found');
  END IF;
  
  -- Only allow deletion of pending withdrawals
  IF v_withdrawal.status NOT IN ('pending', 'draft') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Only pending or draft withdrawals can be deleted'
    );
  END IF;
  
  -- Log to audit table before deletion (using correct table and column names)
  INSERT INTO withdrawal_audit_logs (
    request_id, action, old_status, new_status,
    details, performed_by
  ) VALUES (
    p_request_id, 'deleted', v_withdrawal.status, 'deleted',
    jsonb_build_object(
      'reason', p_reason,
      'original_amount', v_withdrawal.amount,
      'investor_id', v_withdrawal.investor_id
    ),
    p_admin_id
  );
  
  -- Delete the withdrawal request
  DELETE FROM withdrawal_requests WHERE id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'deleted', true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v2(UUID, DATE, NUMERIC, UUID, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_investor_balances(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_withdrawal(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_withdrawal(UUID, TEXT, UUID) TO authenticated;