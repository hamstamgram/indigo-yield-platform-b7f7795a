-- ============================================
-- FIX #2: Update complete_withdrawal RPC to also update shares and cost_basis
-- Must drop first due to parameter name change
-- ============================================
DROP FUNCTION IF EXISTS public.complete_withdrawal(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_request_id UUID,
  p_transaction_hash TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_asset TEXT;
  v_fund_class TEXT;
  v_withdrawal_tx_id UUID;
BEGIN
  -- Admin check
  PERFORM public.ensure_admin();
  
  -- Get the withdrawal request
  SELECT * INTO v_request FROM public.withdrawal_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  IF v_request.status != 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals that are in processing status. Current status: %', v_request.status;
  END IF;
  
  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;
  
  -- Get fund asset and class
  SELECT asset, fund_class INTO v_asset, v_fund_class
  FROM funds WHERE id = v_request.fund_id;
  
  -- Create WITHDRAWAL transaction in transactions_v2
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    asset,
    fund_class,
    amount,
    type,
    tx_date,
    value_date,
    source,
    reference_id,
    notes,
    created_by,
    purpose
  ) VALUES (
    v_request.investor_id,
    v_request.fund_id,
    COALESCE(v_asset, 'UNKNOWN'),
    COALESCE(v_fund_class, 'UNKNOWN'),
    -ABS(v_request.processed_amount), -- Negative amount for withdrawal
    'WITHDRAWAL',
    CURRENT_DATE,
    CURRENT_DATE,
    'withdrawal_completion',
    'WD-' || p_request_id::text,
    COALESCE(p_admin_notes, 'Withdrawal completed'),
    auth.uid(),
    'transaction'
  ) RETURNING id INTO v_withdrawal_tx_id;
  
  -- Update investor position: deduct current_value, shares, AND cost_basis
  UPDATE public.investor_positions 
  SET 
    current_value = current_value - ABS(v_request.processed_amount),
    shares = shares - ABS(v_request.processed_amount),
    cost_basis = GREATEST(0, cost_basis - ABS(v_request.processed_amount)),
    last_transaction_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE investor_id = v_request.investor_id 
    AND fund_id = v_request.fund_id;
  
  -- Update the withdrawal request status to completed
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    completed_at = NOW(),
    completed_by = auth.uid(),
    transaction_hash = COALESCE(p_transaction_hash, transaction_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;
  
  -- Log the action
  PERFORM public.log_withdrawal_action(p_request_id, 'complete', jsonb_build_object(
    'processed_amount', v_request.processed_amount,
    'transaction_hash', p_transaction_hash,
    'withdrawal_tx_id', v_withdrawal_tx_id,
    'shares_deducted', true,
    'cost_basis_deducted', true
  ));
  
  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.complete_withdrawal(UUID, TEXT, TEXT) TO authenticated;

-- ============================================
-- FIX #3: Rename duplicate get_historical_nav function 
-- ============================================
DROP FUNCTION IF EXISTS public.get_historical_nav(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.get_fund_nav_history(
  p_fund_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  nav_date DATE,
  aum NUMERIC,
  nav_per_share NUMERIC,
  gross_return_pct NUMERIC,
  net_return_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dn.nav_date,
    dn.aum,
    dn.nav_per_share,
    dn.gross_return_pct,
    dn.net_return_pct
  FROM daily_nav dn
  WHERE dn.fund_id = p_fund_id
    AND dn.nav_date >= p_start_date
    AND dn.nav_date <= p_end_date
    AND dn.purpose = 'reporting'
  ORDER BY dn.nav_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_fund_nav_history(UUID, DATE, DATE) TO authenticated;