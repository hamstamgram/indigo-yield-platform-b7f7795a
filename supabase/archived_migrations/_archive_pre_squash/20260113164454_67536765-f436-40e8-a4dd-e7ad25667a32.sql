-- Update get_void_yield_impact to use fee_allocations as primary source
-- This avoids the need to backfill transactions_v2.distribution_id
CREATE OR REPLACE FUNCTION public.get_void_yield_impact(p_distribution_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_distribution RECORD;
  v_affected_count INTEGER;
  v_total_yield NUMERIC;
  v_total_fees NUMERIC;
  v_total_ib NUMERIC;
  v_tx_count INTEGER;
BEGIN
  -- Get distribution details
  SELECT id, fund_id, gross_yield, period_start, period_end, status
  INTO v_distribution
  FROM yield_distributions WHERE id = p_distribution_id;
  
  IF v_distribution.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Distribution not found');
  END IF;
  
  IF v_distribution.status = 'VOIDED' THEN
    RETURN json_build_object('success', false, 'error', 'Distribution is already voided');
  END IF;
  
  -- Count affected investors from fee_allocations (reliable distribution_id linkage)
  SELECT COUNT(DISTINCT investor_id), COALESCE(SUM(base_net_income), 0)
  INTO v_affected_count, v_total_yield
  FROM fee_allocations
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Count transactions linked to distribution (may be 0 for old data)
  SELECT COUNT(*) INTO v_tx_count
  FROM transactions_v2 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Sum fees
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_total_fees
  FROM fee_allocations 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Sum IB commissions
  SELECT COALESCE(SUM(ib_fee_amount), 0) INTO v_total_ib
  FROM ib_allocations 
  WHERE distribution_id = p_distribution_id 
    AND is_voided = false;
  
  -- Build result JSON using fee_allocations as primary source
  SELECT json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_distribution.fund_id,
    'gross_yield_amount', v_distribution.gross_yield,
    'period_start', v_distribution.period_start,
    'period_end', v_distribution.period_end,
    'affected_investors', v_affected_count,
    'total_investor_yield', v_total_yield,
    'total_fees', v_total_fees,
    'total_ib_commissions', v_total_ib,
    'transaction_count', v_tx_count,
    'investors', COALESCE((
      SELECT json_agg(json_build_object(
        'investor_id', fa.investor_id,
        'investor_name', COALESCE(p.first_name || ' ' || p.last_name, p.email),
        'yield_amount', fa.base_net_income,
        'fee_amount', fa.fee_amount
      ))
      FROM fee_allocations fa
      LEFT JOIN profiles p ON p.id = fa.investor_id
      WHERE fa.distribution_id = p_distribution_id 
        AND fa.is_voided = false
    ), '[]'::json)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;