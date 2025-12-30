-- Phase 2: Fix Unrealized P&L Calculation
-- Create trigger to auto-calculate unrealized_pnl on investor_positions

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.calculate_unrealized_pnl()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.unrealized_pnl := COALESCE(NEW.current_value, 0) - COALESCE(NEW.cost_basis, 0);
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_calculate_unrealized_pnl ON public.investor_positions;

CREATE TRIGGER trg_calculate_unrealized_pnl
  BEFORE INSERT OR UPDATE OF current_value, cost_basis
  ON public.investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_unrealized_pnl();

-- One-time fix: Update all existing positions with correct unrealized_pnl
UPDATE public.investor_positions 
SET unrealized_pnl = COALESCE(current_value, 0) - COALESCE(cost_basis, 0)
WHERE unrealized_pnl IS NULL 
   OR unrealized_pnl != (COALESCE(current_value, 0) - COALESCE(cost_basis, 0));

-- Phase 5: Add Missing Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_fee_allocations_is_voided 
  ON public.fee_allocations(is_voided);
  
CREATE INDEX IF NOT EXISTS idx_ib_allocations_is_voided 
  ON public.ib_allocations(is_voided);
  
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_is_voided 
  ON public.fund_daily_aum(is_voided);
  
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_fund_id 
  ON public.balance_adjustments(fund_id);

-- Phase 8: Fix Duplicate User Role Entry
-- Delete duplicate admin role for testadmin, keep super_admin
DELETE FROM public.user_roles 
WHERE user_id = '55586442-641c-4d9e-939a-85f09b816073' 
AND role = 'admin';

-- Phase 4: Mark deposits table as deprecated
COMMENT ON TABLE public.deposits IS 'DEPRECATED: Use transactions_v2 with type=DEPOSIT instead. This table is no longer used.';

-- Phase 6: Add RLS SELECT Policies for Critical Tables

-- transactions_v2 RLS policies
DROP POLICY IF EXISTS "investors_view_own_transactions" ON public.transactions_v2;
CREATE POLICY "investors_view_own_transactions" 
  ON public.transactions_v2 FOR SELECT 
  USING (investor_id = auth.uid() OR public.is_admin());

-- investor_positions RLS policies
DROP POLICY IF EXISTS "investors_view_own_positions" ON public.investor_positions;
CREATE POLICY "investors_view_own_positions" 
  ON public.investor_positions FOR SELECT 
  USING (investor_id = auth.uid() OR public.is_admin());

-- withdrawal_requests RLS policies
DROP POLICY IF EXISTS "investors_view_own_withdrawals" ON public.withdrawal_requests;
CREATE POLICY "investors_view_own_withdrawals" 
  ON public.withdrawal_requests FOR SELECT 
  USING (investor_id = auth.uid() OR public.is_admin());

-- yield_distributions RLS policies (admin only)
DROP POLICY IF EXISTS "admins_view_yield_distributions" ON public.yield_distributions;
CREATE POLICY "admins_view_yield_distributions" 
  ON public.yield_distributions FOR SELECT 
  USING (public.is_admin());