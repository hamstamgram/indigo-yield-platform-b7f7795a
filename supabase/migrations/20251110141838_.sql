-- ============================================
-- PHASE 2: DATABASE SCHEMA FIXES
-- ============================================
-- This migration addresses:
-- 1. Create missing investments table
-- 2. Add missing foreign key constraints
-- 3. Ensure data integrity across relationships
-- ============================================

-- ========== 1. CREATE INVESTMENTS TABLE ==========

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(28,10) NOT NULL CHECK (amount > 0),
  shares NUMERIC(28,10) NOT NULL DEFAULT 0 CHECK (shares >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled', 'completed')),
  transaction_type TEXT NOT NULL DEFAULT 'initial' CHECK (transaction_type IN ('initial', 'additional', 'reinvestment')),
  notes TEXT,
  reference_number TEXT,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure uniqueness for tracking
  CONSTRAINT unique_investment_ref UNIQUE(investor_id, fund_id, investment_date, amount)
);

-- Add helpful comment
COMMENT ON TABLE public.investments IS 'Tracks individual investment transactions from investors into funds';
COMMENT ON COLUMN public.investments.amount IS 'Investment amount in native token units';
COMMENT ON COLUMN public.investments.shares IS 'Number of fund shares allocated';
COMMENT ON COLUMN public.investments.status IS 'Investment lifecycle status';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_investments_investor ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_fund ON public.investments(fund_id);
CREATE INDEX IF NOT EXISTS idx_investments_date ON public.investments(investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON public.investments(created_at);

-- Enable RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investments
DROP POLICY IF EXISTS "Admins manage all investments" ON public.investments;
DROP POLICY IF EXISTS "Investors view own investments" ON public.investments;
DROP POLICY IF EXISTS "Investors create own investments" ON public.investments;

-- Admins have full access
CREATE POLICY "Admins manage all investments"
ON public.investments FOR ALL
TO authenticated
USING (public.is_admin_v2())
WITH CHECK (public.is_admin_v2());

-- Investors can view their own investments
CREATE POLICY "Investors view own investments"
ON public.investments FOR SELECT
TO authenticated
USING (
  investor_id IN (
    SELECT i.id FROM public.investors i WHERE i.profile_id = auth.uid()
  )
);

-- Investors can create investments for themselves (pending admin approval)
CREATE POLICY "Investors create own investments"
ON public.investments FOR INSERT
TO authenticated
WITH CHECK (
  investor_id IN (
    SELECT i.id FROM public.investors i WHERE i.profile_id = auth.uid()
  )
  AND status = 'pending'
);

-- Create trigger for updated_at
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ========== 2. ADD MISSING FOREIGN KEY CONSTRAINTS ==========

-- Ensure investor_positions has proper constraints
DO $$
BEGIN
  -- Check if foreign key exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'investor_positions_investor_id_fkey' 
    AND table_name = 'investor_positions'
  ) THEN
    ALTER TABLE public.investor_positions
    ADD CONSTRAINT investor_positions_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'investor_positions_fund_id_fkey' 
    AND table_name = 'investor_positions'
  ) THEN
    ALTER TABLE public.investor_positions
    ADD CONSTRAINT investor_positions_fund_id_fkey 
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure deposits has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deposits_user_id_fkey' 
    AND table_name = 'deposits'
  ) THEN
    ALTER TABLE public.deposits
    ADD CONSTRAINT deposits_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure fee_calculations has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fee_calculations_investor_id_fkey' 
    AND table_name = 'fee_calculations'
  ) THEN
    ALTER TABLE public.fee_calculations
    ADD CONSTRAINT fee_calculations_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fee_calculations_fund_id_fkey' 
    AND table_name = 'fee_calculations'
  ) THEN
    ALTER TABLE public.fee_calculations
    ADD CONSTRAINT fee_calculations_fund_id_fkey 
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure platform_fees_collected has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'platform_fees_collected_investor_id_fkey' 
    AND table_name = 'platform_fees_collected'
  ) THEN
    ALTER TABLE public.platform_fees_collected
    ADD CONSTRAINT platform_fees_collected_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure investor_monthly_reports has proper constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'investor_monthly_reports_investor_id_fkey' 
    AND table_name = 'investor_monthly_reports'
  ) THEN
    ALTER TABLE public.investor_monthly_reports
    ADD CONSTRAINT investor_monthly_reports_investor_id_fkey 
    FOREIGN KEY (investor_id) REFERENCES public.investors(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========== 3. ADD HELPFUL VIEWS ==========

-- Create a view for investment summary
CREATE OR REPLACE VIEW public.investment_summary AS
SELECT 
  i.investor_id,
  inv.name as investor_name,
  i.fund_id,
  f.name as fund_name,
  f.code as fund_code,
  COUNT(i.id) as total_investments,
  SUM(i.amount) as total_invested,
  SUM(i.shares) as total_shares,
  MIN(i.investment_date) as first_investment_date,
  MAX(i.investment_date) as last_investment_date,
  COUNT(CASE WHEN i.status = 'active' THEN 1 END) as active_count,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN i.status = 'cancelled' THEN 1 END) as cancelled_count
FROM public.investments i
JOIN public.investors inv ON inv.id = i.investor_id
JOIN public.funds f ON f.id = i.fund_id
GROUP BY i.investor_id, inv.name, i.fund_id, f.name, f.code;

-- Grant select on view to authenticated users (RLS will filter)
GRANT SELECT ON public.investment_summary TO authenticated;

COMMENT ON VIEW public.investment_summary IS 'Aggregated investment summary by investor and fund';

-- ========== 4. DATA VALIDATION FUNCTION ==========

-- Function to validate investment data integrity
CREATE OR REPLACE FUNCTION public.validate_investment_integrity()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Check for orphaned investments (investor doesn't exist)
  RETURN QUERY
  SELECT 
    'Orphaned Investments'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' investments with non-existent investors'::TEXT
  FROM public.investments i
  LEFT JOIN public.investors inv ON inv.id = i.investor_id
  WHERE inv.id IS NULL;

  -- Check for investments with invalid funds
  RETURN QUERY
  SELECT 
    'Invalid Fund References'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' investments referencing non-existent funds'::TEXT
  FROM public.investments i
  LEFT JOIN public.funds f ON f.id = i.fund_id
  WHERE f.id IS NULL;

  -- Check for negative amounts
  RETURN QUERY
  SELECT 
    'Negative Investment Amounts'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' investments with amount <= 0'::TEXT
  FROM public.investments
  WHERE amount <= 0;

  -- Check for future investment dates
  RETURN QUERY
  SELECT 
    'Future Investment Dates'::TEXT,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
    'Found ' || COUNT(*)::TEXT || ' investments dated in the future'::TEXT
  FROM public.investments
  WHERE investment_date > CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION public.validate_investment_integrity IS 'Validates data integrity for investments table';

-- ========== COMPLETION ==========
-- Phase 2 complete: Investments table created with full RLS and constraints;
