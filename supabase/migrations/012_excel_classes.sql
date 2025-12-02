-- Migration: 005_excel_classes.sql
-- Date: 2025-09-03
-- Description: Add fund class support to Excel imports and position tracking

-- ========================================
-- Add fund_class column to funds table
-- ========================================
ALTER TABLE public.funds
ADD COLUMN IF NOT EXISTS fund_class TEXT 
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));
-- Update existing funds with class based on asset
UPDATE public.funds 
SET fund_class = asset 
WHERE fund_class IS NULL;
-- Make fund_class NOT NULL after backfill
ALTER TABLE public.funds
ALTER COLUMN fund_class SET NOT NULL;
-- ========================================
-- Add fund_class to transactions_v2
-- ========================================
ALTER TABLE public.transactions_v2
ADD COLUMN IF NOT EXISTS fund_class TEXT
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));
-- Backfill fund_class from related fund
UPDATE public.transactions_v2 t
SET fund_class = f.fund_class
FROM public.funds f
WHERE t.fund_id = f.id AND t.fund_class IS NULL;
-- ========================================
-- Add fund_class to investor_positions
-- ========================================
ALTER TABLE public.investor_positions
ADD COLUMN IF NOT EXISTS fund_class TEXT
CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL'));
-- Backfill fund_class from related fund
UPDATE public.investor_positions p
SET fund_class = f.fund_class
FROM public.funds f
WHERE p.fund_id = f.id AND p.fund_class IS NULL;
-- ========================================
-- Create aggregated positions view by class
-- ========================================
CREATE OR REPLACE VIEW public.investor_positions_by_class AS
SELECT 
  investor_id,
  fund_class,
  COUNT(DISTINCT fund_id) as fund_count,
  SUM(shares) as total_shares,
  SUM(cost_basis) as total_cost_basis,
  SUM(current_value) as total_current_value,
  SUM(unrealized_pnl) as total_unrealized_pnl,
  SUM(realized_pnl) as total_realized_pnl,
  MAX(last_transaction_date) as latest_transaction,
  SUM(mgmt_fees_paid) as total_mgmt_fees,
  SUM(perf_fees_paid) as total_perf_fees
FROM public.investor_positions
WHERE fund_class IS NOT NULL
GROUP BY investor_id, fund_class;
-- ========================================
-- Create function to get positions by class
-- ========================================
CREATE OR REPLACE FUNCTION public.get_investor_positions_by_class(p_investor_id UUID)
RETURNS TABLE (
  fund_class TEXT,
  total_value NUMERIC(28,10),
  total_pnl NUMERIC(28,10),
  allocation_pct NUMERIC(12,2)
) AS $$
DECLARE
  v_total_value NUMERIC(28,10);
BEGIN
  -- Get total portfolio value
  SELECT SUM(current_value) INTO v_total_value
  FROM public.investor_positions
  WHERE investor_id = p_investor_id;

  -- Return positions by class with allocation percentages
  RETURN QUERY
  SELECT 
    p.fund_class,
    SUM(p.current_value) as total_value,
    SUM(p.unrealized_pnl + p.realized_pnl) as total_pnl,
    CASE 
      WHEN v_total_value > 0 
      THEN ROUND((SUM(p.current_value) / v_total_value * 100)::NUMERIC, 2)
      ELSE 0
    END as allocation_pct
  FROM public.investor_positions p
  WHERE p.investor_id = p_investor_id 
    AND p.fund_class IS NOT NULL
  GROUP BY p.fund_class
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ========================================
-- Update Excel import log for class tracking
-- ========================================
ALTER TABLE public.excel_import_log
ADD COLUMN IF NOT EXISTS fund_classes JSONB,
ADD COLUMN IF NOT EXISTS class_summary JSONB;
-- ========================================
-- Create helper function for Excel imports with class awareness
-- ========================================
CREATE OR REPLACE FUNCTION public.process_excel_import_with_classes(
  p_data JSONB,
  p_import_type TEXT DEFAULT 'full'
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_class_counts JSONB = '{}'::JSONB;
  v_fund_class TEXT;
  v_count INTEGER;
BEGIN
  -- Initialize result
  v_result = jsonb_build_object(
    'success', true,
    'processed', 0,
    'errors', '[]'::JSONB,
    'class_summary', '{}'::JSONB
  );

  -- Process by fund class
  FOR v_fund_class IN 
    SELECT DISTINCT fund_class 
    FROM public.funds 
    WHERE status = 'active'
  LOOP
    -- Count transactions per class
    SELECT COUNT(*) INTO v_count
    FROM jsonb_array_elements(p_data -> 'transactions') t
    WHERE t ->> 'fund_class' = v_fund_class;
    
    v_class_counts = v_class_counts || 
      jsonb_build_object(v_fund_class, v_count);
  END LOOP;

  -- Update result with class summary
  v_result = v_result || jsonb_build_object('class_summary', v_class_counts);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ========================================
-- Create index for class-based queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_funds_fund_class ON public.funds(fund_class);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_class ON public.transactions_v2(fund_class);
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund_class ON public.investor_positions(fund_class);
-- ========================================
-- Grant necessary permissions
-- ========================================
GRANT SELECT ON public.investor_positions_by_class TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investor_positions_by_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_excel_import_with_classes(JSONB, TEXT) TO authenticated;
COMMENT ON COLUMN public.funds.fund_class IS 'Asset class categorization for the fund';
COMMENT ON VIEW public.investor_positions_by_class IS 'Aggregated investor positions grouped by fund class';
COMMENT ON FUNCTION public.get_investor_positions_by_class IS 'Returns investor positions summarized by fund class with allocation percentages';
