-- ============================================================
-- Fix missing tables and broken functions - Phase 2
-- ============================================================

-- 1. Create missing position_reconciliation_log table
CREATE TABLE IF NOT EXISTS public.position_reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  position_value NUMERIC(28,10) NOT NULL,
  ledger_value NUMERIC(28,10) NOT NULL,
  discrepancy NUMERIC(28,10) NOT NULL,
  reconciled_by UUID REFERENCES profiles(id),
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.position_reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policy
CREATE POLICY "admin_access_reconciliation_log" ON public.position_reconciliation_log
  FOR ALL USING (public.is_admin());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_position_reconciliation_log_investor 
  ON public.position_reconciliation_log(investor_id);
CREATE INDEX IF NOT EXISTS idx_position_reconciliation_log_fund 
  ON public.position_reconciliation_log(fund_id);

-- 2. Fix get_void_yield_impact - use existing tables instead of yield_allocations
CREATE OR REPLACE FUNCTION public.get_void_yield_impact(p_distribution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_distribution_exists boolean;
  v_is_voided boolean;
BEGIN
  -- Check if distribution exists
  SELECT EXISTS(SELECT 1 FROM yield_distributions WHERE id = p_distribution_id)
  INTO v_distribution_exists;
  
  IF NOT v_distribution_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution not found');
  END IF;
  
  -- Check if already voided
  SELECT is_voided INTO v_is_voided FROM yield_distributions WHERE id = p_distribution_id;
  
  IF v_is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution is already voided');
  END IF;
  
  -- Get impact summary using transactions_v2 and fee_allocations (tables that exist)
  SELECT jsonb_build_object(
    'success', true,
    'distribution', jsonb_build_object(
      'id', yd.id,
      'fund_id', yd.fund_id,
      'fund_name', f.name,
      'period_start', yd.period_start,
      'period_end', yd.period_end,
      'gross_yield_amount', yd.gross_yield_amount,
      'gross_yield_pct', yd.gross_yield_pct,
      'total_fees', yd.total_fees,
      'net_yield_amount', yd.net_yield_amount,
      'created_at', yd.created_at
    ),
    'affected_transactions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'investor_id', t.investor_id,
        'investor_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'type', t.type,
        'amount', t.amount
      )), '[]'::jsonb)
      FROM transactions_v2 t
      JOIN profiles p ON p.id = t.investor_id
      WHERE t.distribution_id = p_distribution_id
        AND t.is_voided = false
    ),
    'affected_fee_allocations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'investor_id', fa.investor_id,
        'investor_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'fee_amount', fa.fee_amount
      )), '[]'::jsonb)
      FROM fee_allocations fa
      JOIN profiles p ON p.id = fa.investor_id
      WHERE fa.distribution_id = p_distribution_id
        AND fa.is_voided = false
    ),
    'affected_transactions_count', (
      SELECT COUNT(*) FROM transactions_v2 t
      WHERE t.distribution_id = p_distribution_id AND t.is_voided = false
    )
  ) INTO v_result
  FROM yield_distributions yd
  JOIN funds f ON f.id = yd.fund_id
  WHERE yd.id = p_distribution_id;
  
  RETURN v_result;
END;
$$;