-- Phase 1B: December 20 Updates - Remaining Schema Changes
-- =========================================================

-- 1.2 Add IB (Introducing Broker) fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ib_parent_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS ib_percentage NUMERIC(5,2) DEFAULT 0;

-- Add constraint for ib_percentage range (0-100)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_ib_percentage_range'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_ib_percentage_range 
    CHECK (ib_percentage >= 0 AND ib_percentage <= 100);
  END IF;
END $$;

-- 1.3 Add is_month_end flag to daily_nav table
ALTER TABLE public.daily_nav 
ADD COLUMN IF NOT EXISTS is_month_end BOOLEAN DEFAULT FALSE;

-- 1.4 Add is_month_end flag to fund_daily_aum table
ALTER TABLE public.fund_daily_aum 
ADD COLUMN IF NOT EXISTS is_month_end BOOLEAN DEFAULT FALSE;

-- 1.5 Create IB Allocations table to track IB fee allocations
CREATE TABLE IF NOT EXISTS public.ib_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES public.statement_periods(id),
  ib_investor_id UUID NOT NULL REFERENCES public.profiles(id),
  source_investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id UUID REFERENCES public.funds(id),
  source_net_income NUMERIC(28,10) NOT NULL,
  ib_percentage NUMERIC(5,2) NOT NULL,
  ib_fee_amount NUMERIC(28,10) NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on ib_allocations
ALTER TABLE public.ib_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ib_allocations (drop if exists first to avoid conflicts)
DROP POLICY IF EXISTS "ib_allocations_select_admin" ON public.ib_allocations;
DROP POLICY IF EXISTS "ib_allocations_insert_admin" ON public.ib_allocations;
DROP POLICY IF EXISTS "ib_allocations_update_admin" ON public.ib_allocations;
DROP POLICY IF EXISTS "ib_allocations_delete_admin" ON public.ib_allocations;

CREATE POLICY "ib_allocations_select_admin"
ON public.ib_allocations FOR SELECT
USING (public.is_admin());

CREATE POLICY "ib_allocations_insert_admin"
ON public.ib_allocations FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "ib_allocations_update_admin"
ON public.ib_allocations FOR UPDATE
USING (public.is_admin());

CREATE POLICY "ib_allocations_delete_admin"
ON public.ib_allocations FOR DELETE
USING (public.is_admin());

-- 1.6 Create function to check if user has super_admin role
CREATE OR REPLACE FUNCTION public.has_super_admin_role(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = 'super_admin'
  )
$$;

-- 1.7 Create function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_super_admin_role(auth.uid())
$$;

-- 1.8 Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_ib_parent_id ON public.profiles(ib_parent_id) WHERE ib_parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ib_allocations_ib_investor ON public.ib_allocations(ib_investor_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_source_investor ON public.ib_allocations(source_investor_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_period ON public.ib_allocations(period_id);
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_is_month_end ON public.fund_daily_aum(fund_id, aum_date) WHERE is_month_end = TRUE;