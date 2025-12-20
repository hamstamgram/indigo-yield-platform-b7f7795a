-- ============================================
-- Position Reset System: Archive Tables & Stored Procedure
-- ============================================

-- Archive table for investor_positions
CREATE TABLE IF NOT EXISTS public.investor_positions_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_batch_id UUID NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID,
  -- Original columns
  investor_id UUID,
  fund_id UUID,
  fund_class TEXT,
  shares NUMERIC,
  cost_basis NUMERIC,
  current_value NUMERIC,
  unrealized_pnl NUMERIC,
  realized_pnl NUMERIC,
  last_transaction_date DATE,
  lock_until_date DATE,
  high_water_mark NUMERIC,
  mgmt_fees_paid NUMERIC,
  perf_fees_paid NUMERIC,
  aum_percentage NUMERIC,
  original_updated_at TIMESTAMPTZ
);

-- Archive for fund_daily_aum
CREATE TABLE IF NOT EXISTS public.fund_daily_aum_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_batch_id UUID NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID,
  -- Original columns
  id UUID,
  fund_id TEXT,
  aum_date DATE,
  total_aum NUMERIC,
  nav_per_share NUMERIC,
  total_shares NUMERIC,
  as_of_date DATE,
  source TEXT,
  original_created_at TIMESTAMPTZ
);

-- Archive for investor_fund_performance
CREATE TABLE IF NOT EXISTS public.investor_fund_performance_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_batch_id UUID NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID,
  -- All original columns from investor_fund_performance
  id UUID,
  period_id UUID,
  investor_id UUID,
  fund_name TEXT,
  mtd_beginning_balance NUMERIC,
  mtd_additions NUMERIC,
  mtd_redemptions NUMERIC,
  mtd_net_income NUMERIC,
  mtd_ending_balance NUMERIC,
  mtd_rate_of_return NUMERIC,
  qtd_beginning_balance NUMERIC,
  qtd_additions NUMERIC,
  qtd_redemptions NUMERIC,
  qtd_net_income NUMERIC,
  qtd_ending_balance NUMERIC,
  qtd_rate_of_return NUMERIC,
  ytd_beginning_balance NUMERIC,
  ytd_additions NUMERIC,
  ytd_redemptions NUMERIC,
  ytd_net_income NUMERIC,
  ytd_ending_balance NUMERIC,
  ytd_rate_of_return NUMERIC,
  itd_beginning_balance NUMERIC,
  itd_additions NUMERIC,
  itd_redemptions NUMERIC,
  itd_net_income NUMERIC,
  itd_ending_balance NUMERIC,
  itd_rate_of_return NUMERIC,
  original_created_at TIMESTAMPTZ,
  original_updated_at TIMESTAMPTZ
);

-- Archive for transactions_v2
CREATE TABLE IF NOT EXISTS public.transactions_v2_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_batch_id UUID NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_by UUID,
  -- Original columns
  id UUID,
  investor_id UUID,
  fund_id UUID,
  type TEXT,
  asset TEXT,
  amount NUMERIC,
  tx_date DATE,
  reference_id TEXT,
  notes TEXT,
  created_by UUID,
  original_created_at TIMESTAMPTZ
);

-- Position reset audit log
CREATE TABLE IF NOT EXISTS public.position_reset_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_batch_id UUID NOT NULL UNIQUE,
  admin_user_id UUID NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  affected_counts JSONB,
  error_message TEXT,
  confirmation_code TEXT NOT NULL
);

-- Create indexes for archive tables
CREATE INDEX IF NOT EXISTS idx_positions_archive_batch ON public.investor_positions_archive(reset_batch_id);
CREATE INDEX IF NOT EXISTS idx_positions_archive_investor ON public.investor_positions_archive(investor_id);
CREATE INDEX IF NOT EXISTS idx_aum_archive_batch ON public.fund_daily_aum_archive(reset_batch_id);
CREATE INDEX IF NOT EXISTS idx_performance_archive_batch ON public.investor_fund_performance_archive(reset_batch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_archive_batch ON public.transactions_v2_archive(reset_batch_id);
CREATE INDEX IF NOT EXISTS idx_reset_log_admin ON public.position_reset_log(admin_user_id);

-- RLS Policies for archive tables (admin only)
ALTER TABLE public.investor_positions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_daily_aum_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_fund_performance_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_v2_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_reset_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admin only access positions archive" ON public.investor_positions_archive;
DROP POLICY IF EXISTS "Admin only access aum archive" ON public.fund_daily_aum_archive;
DROP POLICY IF EXISTS "Admin only access performance archive" ON public.investor_fund_performance_archive;
DROP POLICY IF EXISTS "Admin only access transactions archive" ON public.transactions_v2_archive;
DROP POLICY IF EXISTS "Admin only access reset log" ON public.position_reset_log;

CREATE POLICY "Admin only access positions archive" ON public.investor_positions_archive
  FOR ALL USING (is_admin());
CREATE POLICY "Admin only access aum archive" ON public.fund_daily_aum_archive
  FOR ALL USING (is_admin());
CREATE POLICY "Admin only access performance archive" ON public.investor_fund_performance_archive
  FOR ALL USING (is_admin());
CREATE POLICY "Admin only access transactions archive" ON public.transactions_v2_archive
  FOR ALL USING (is_admin());
CREATE POLICY "Admin only access reset log" ON public.position_reset_log
  FOR ALL USING (is_admin());

-- ============================================
-- Reset Stored Procedure
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_all_investor_positions(
  p_admin_id UUID,
  p_confirmation_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_positions_count INTEGER;
  v_performance_count INTEGER;
  v_aum_count INTEGER;
  v_transactions_count INTEGER;
  v_total_aum_before NUMERIC;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Verify confirmation code matches expected pattern
  IF p_confirmation_code != 'RESET POSITIONS' THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;
  
  -- Get total AUM before reset for logging
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum_before
  FROM investor_positions;
  
  -- Create reset log entry
  INSERT INTO position_reset_log (reset_batch_id, admin_user_id, confirmation_code, status)
  VALUES (v_batch_id, p_admin_id, p_confirmation_code, 'in_progress');
  
  -- Archive investor_positions
  INSERT INTO investor_positions_archive (
    reset_batch_id, archived_by, investor_id, fund_id, fund_class,
    shares, cost_basis, current_value, unrealized_pnl, realized_pnl,
    last_transaction_date, lock_until_date, high_water_mark,
    mgmt_fees_paid, perf_fees_paid, aum_percentage, original_updated_at
  )
  SELECT 
    v_batch_id, p_admin_id, investor_id, fund_id, fund_class,
    shares, cost_basis, current_value, unrealized_pnl, realized_pnl,
    last_transaction_date, lock_until_date, high_water_mark,
    mgmt_fees_paid, perf_fees_paid, aum_percentage, updated_at
  FROM investor_positions;
  
  GET DIAGNOSTICS v_positions_count = ROW_COUNT;
  
  -- Archive investor_fund_performance
  INSERT INTO investor_fund_performance_archive (
    reset_batch_id, archived_by, id, period_id, investor_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income,
    mtd_ending_balance, mtd_rate_of_return, qtd_beginning_balance, qtd_additions,
    qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income,
    ytd_ending_balance, ytd_rate_of_return, itd_beginning_balance, itd_additions,
    itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
    original_created_at, original_updated_at
  )
  SELECT 
    v_batch_id, p_admin_id, id, period_id, investor_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income,
    mtd_ending_balance, mtd_rate_of_return, qtd_beginning_balance, qtd_additions,
    qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income,
    ytd_ending_balance, ytd_rate_of_return, itd_beginning_balance, itd_additions,
    itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
    created_at, updated_at
  FROM investor_fund_performance;
  
  GET DIAGNOSTICS v_performance_count = ROW_COUNT;
  
  -- Archive fund_daily_aum
  INSERT INTO fund_daily_aum_archive (
    reset_batch_id, archived_by, id, fund_id, aum_date, total_aum,
    nav_per_share, total_shares, as_of_date, source, original_created_at
  )
  SELECT 
    v_batch_id, p_admin_id, id, fund_id, aum_date, total_aum,
    nav_per_share, total_shares, as_of_date, source, created_at
  FROM fund_daily_aum;
  
  GET DIAGNOSTICS v_aum_count = ROW_COUNT;
  
  -- Archive transactions_v2
  INSERT INTO transactions_v2_archive (
    reset_batch_id, archived_by, id, investor_id, fund_id, type, asset,
    amount, tx_date, reference_id, notes, created_by, original_created_at
  )
  SELECT 
    v_batch_id, p_admin_id, id, investor_id, fund_id, type, asset,
    amount, tx_date, reference_id, notes, created_by, created_at
  FROM transactions_v2;
  
  GET DIAGNOSTICS v_transactions_count = ROW_COUNT;
  
  -- RESET: Update all positions to zero (keep rows for structure)
  UPDATE investor_positions SET
    shares = 0,
    cost_basis = 0,
    current_value = 0,
    unrealized_pnl = 0,
    realized_pnl = 0,
    high_water_mark = 0,
    mgmt_fees_paid = 0,
    perf_fees_paid = 0,
    aum_percentage = 0,
    updated_at = now();
  
  -- DELETE derived tables
  DELETE FROM investor_fund_performance;
  DELETE FROM fund_daily_aum;
  DELETE FROM transactions_v2;
  
  -- Also clear related caches/snapshots
  DELETE FROM fund_period_snapshot;
  DELETE FROM investor_period_snapshot;
  DELETE FROM investment_summary;
  
  -- Update reset log with success
  UPDATE position_reset_log SET
    status = 'completed',
    completed_at = now(),
    affected_counts = jsonb_build_object(
      'positions_reset', v_positions_count,
      'performance_archived', v_performance_count,
      'aum_archived', v_aum_count,
      'transactions_archived', v_transactions_count,
      'total_aum_before', v_total_aum_before
    )
  WHERE reset_batch_id = v_batch_id;
  
  -- Log to audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'RESET_ALL_POSITIONS',
    'system',
    v_batch_id::text,
    p_admin_id,
    jsonb_build_object(
      'positions_reset', v_positions_count,
      'performance_archived', v_performance_count,
      'aum_archived', v_aum_count,
      'transactions_archived', v_transactions_count,
      'total_aum_before', v_total_aum_before
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'positions_reset', v_positions_count,
    'performance_archived', v_performance_count,
    'aum_archived', v_aum_count,
    'transactions_archived', v_transactions_count,
    'total_aum_before', v_total_aum_before
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log failure
  UPDATE position_reset_log SET
    status = 'failed',
    completed_at = now(),
    error_message = SQLERRM
  WHERE reset_batch_id = v_batch_id;
  
  RAISE;
END;
$$;