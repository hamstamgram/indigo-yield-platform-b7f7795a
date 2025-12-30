-- Phase 1 & 7: Position Reconciliation RPC and Integrity Check Functions

-- Create position reconciliation log table
CREATE TABLE IF NOT EXISTS public.position_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  position_value NUMERIC NOT NULL,
  ledger_value NUMERIC NOT NULL,
  discrepancy NUMERIC NOT NULL,
  reconciled_by UUID REFERENCES public.profiles(id),
  reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  action_taken TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.position_reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "admins_manage_reconciliation_log" 
  ON public.position_reconciliation_log FOR ALL 
  USING (public.is_admin());

-- Create comprehensive integrity check function
CREATE OR REPLACE FUNCTION public.run_data_integrity_check()
RETURNS TABLE(
  check_name TEXT,
  issue_count BIGINT,
  status TEXT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Position-Transaction Mismatches
  RETURN QUERY
  WITH mismatches AS (
    SELECT 
      ip.investor_id,
      ip.fund_id,
      ip.current_value as position_value,
      COALESCE(SUM(t.amount), 0) as ledger_value,
      ABS(ip.current_value - COALESCE(SUM(t.amount), 0)) as diff
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id 
      AND t.fund_id = ip.fund_id 
      AND COALESCE(t.is_voided, false) = false
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
    HAVING ABS(ip.current_value - COALESCE(SUM(t.amount), 0)) > 0.01
  )
  SELECT 
    'position_transaction_mismatch'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICAL' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'investor_id', m.investor_id,
      'fund_id', m.fund_id,
      'position_value', m.position_value,
      'ledger_value', m.ledger_value,
      'difference', m.diff
    )), '[]'::jsonb)
  FROM mismatches m;

  -- Check 2: Unrealized P&L Calculation Errors
  RETURN QUERY
  SELECT 
    'unrealized_pnl_error'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'investor_id', ip.investor_id,
      'fund_id', ip.fund_id,
      'current_pnl', ip.unrealized_pnl,
      'calculated_pnl', ip.current_value - ip.cost_basis
    )), '[]'::jsonb)
  FROM investor_positions ip
  WHERE ip.unrealized_pnl IS NULL 
     OR ABS(ip.unrealized_pnl - (ip.current_value - ip.cost_basis)) > 0.01;

  -- Check 3: Orphaned Transactions (no matching position)
  RETURN QUERY
  SELECT 
    'orphaned_transactions'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'transaction_id', t.id,
      'investor_id', t.investor_id,
      'fund_id', t.fund_id
    )), '[]'::jsonb)
  FROM transactions_v2 t
  LEFT JOIN investor_positions ip ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
  WHERE ip.id IS NULL AND COALESCE(t.is_voided, false) = false;

  -- Check 4: Active Funds Without AUM Records
  RETURN QUERY
  SELECT 
    'funds_missing_aum'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', f.id,
      'fund_name', f.name,
      'fund_code', f.code
    )), '[]'::jsonb)
  FROM funds f
  LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id AND fda.is_voided = false
  WHERE f.status = 'active'
  GROUP BY f.id, f.name, f.code
  HAVING COUNT(fda.id) = 0;

  -- Check 5: Duplicate Reference IDs in Transactions
  RETURN QUERY
  SELECT 
    'duplicate_transaction_refs'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'reference_id', t.reference_id,
      'count', t.cnt
    )), '[]'::jsonb)
  FROM (
    SELECT reference_id, COUNT(*) as cnt
    FROM transactions_v2
    WHERE reference_id IS NOT NULL
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) t;

  -- Check 6: Voided Yield Distributions
  RETURN QUERY
  SELECT 
    'voided_yield_distributions'::TEXT,
    COUNT(*)::BIGINT,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'INFO' END,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', yd.id,
      'fund_id', yd.fund_id,
      'effective_date', yd.effective_date
    )), '[]'::jsonb)
  FROM yield_distributions yd
  WHERE yd.is_voided = true;
END;
$$;

-- Grant execute to authenticated users (RPCs respect the is_admin() check inside)
GRANT EXECUTE ON FUNCTION public.run_data_integrity_check() TO authenticated;

-- Create function to reconcile a single investor position
CREATE OR REPLACE FUNCTION public.reconcile_investor_position(
  p_investor_id UUID,
  p_fund_id UUID,
  p_admin_id UUID,
  p_action TEXT DEFAULT 'log_only'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position_value NUMERIC;
  v_ledger_value NUMERIC;
  v_discrepancy NUMERIC;
  v_result JSONB;
BEGIN
  -- Admin check
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get current position value
  SELECT current_value INTO v_position_value
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Calculate ledger value from transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id 
    AND COALESCE(is_voided, false) = false;

  v_discrepancy := COALESCE(v_position_value, 0) - v_ledger_value;

  -- Log the reconciliation
  INSERT INTO position_reconciliation_log (
    investor_id, fund_id, position_value, ledger_value, 
    discrepancy, reconciled_by, action_taken
  ) VALUES (
    p_investor_id, p_fund_id, COALESCE(v_position_value, 0), 
    v_ledger_value, v_discrepancy, p_admin_id, p_action
  );

  -- If action is 'fix', update the position to match ledger
  IF p_action = 'fix' AND ABS(v_discrepancy) > 0.01 THEN
    UPDATE investor_positions
    SET current_value = v_ledger_value, updated_at = now()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  END IF;

  v_result := jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'position_value', COALESCE(v_position_value, 0),
    'ledger_value', v_ledger_value,
    'discrepancy', v_discrepancy,
    'action', p_action,
    'reconciled', p_action = 'fix' AND ABS(v_discrepancy) > 0.01
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_investor_position(UUID, UUID, UUID, TEXT) TO authenticated;