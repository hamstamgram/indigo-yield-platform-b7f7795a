-- ============================================
-- PHASE 1: Consolidate Function Overloads
-- ============================================

-- 1. Drop the 7-param apply_daily_yield_to_fund_v3 (uses p_gross_yield_pct)
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(
  uuid, date, numeric, uuid, aum_purpose, date, date
);

-- 2. Drop the void_fund_daily_aum with wrong param order (uuid, uuid, text)
DROP FUNCTION IF EXISTS public.void_fund_daily_aum(uuid, uuid, text);

-- 3. Drop the 7-param apply_yield_correction_v2 (uses p_correction_pct)
DROP FUNCTION IF EXISTS public.apply_yield_correction_v2(
  uuid, date, numeric, text, uuid, aum_purpose, date, date
);

-- ============================================
-- PHASE 2: Add Missing Columns to yield_distributions
-- ============================================

-- Add missing columns that functions expect
ALTER TABLE public.yield_distributions 
  ADD COLUMN IF NOT EXISTS opening_aum numeric,
  ADD COLUMN IF NOT EXISTS closing_aum numeric,
  ADD COLUMN IF NOT EXISTS yield_percentage numeric,
  ADD COLUMN IF NOT EXISTS reference_id text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

-- Backfill opening_aum and closing_aum from existing data
UPDATE public.yield_distributions 
SET opening_aum = COALESCE(previous_aum, recorded_aum),
    closing_aum = recorded_aum,
    yield_percentage = CASE 
      WHEN COALESCE(previous_aum, recorded_aum) > 0 
      THEN ((recorded_aum - COALESCE(previous_aum, recorded_aum)) / COALESCE(previous_aum, recorded_aum)) * 100
      ELSE 0 
    END,
    period_start = effective_date,
    period_end = effective_date
WHERE opening_aum IS NULL OR closing_aum IS NULL;

-- ============================================
-- PHASE 3: Remove Dead/Unused Functions
-- ============================================

DROP FUNCTION IF EXISTS public.apply_daily_yield_with_fees(text, date, numeric, numeric);
DROP FUNCTION IF EXISTS public.apply_daily_yield_with_fees(uuid, date, numeric, numeric);
DROP FUNCTION IF EXISTS public.apply_yield_with_ib(uuid, date, numeric, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.distribute_monthly_yield(text, integer, integer, numeric);
DROP FUNCTION IF EXISTS public.handle_ledger_transaction(uuid, uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, text, date, uuid);

-- ============================================
-- PHASE 4: Add Comments for Clarity
-- ============================================

COMMENT ON TABLE public.yield_distributions IS 
  'Records of yield distributions to funds. opening_aum/closing_aum track AUM before/after distribution.';

COMMENT ON COLUMN public.yield_distributions.opening_aum IS 'AUM at start of yield period';
COMMENT ON COLUMN public.yield_distributions.closing_aum IS 'AUM at end of yield period (after distribution)';
COMMENT ON COLUMN public.yield_distributions.yield_percentage IS 'Yield as percentage of opening AUM';
COMMENT ON COLUMN public.yield_distributions.reference_id IS 'External reference for audit trail';
COMMENT ON COLUMN public.yield_distributions.period_start IS 'Start date of yield accrual period';
COMMENT ON COLUMN public.yield_distributions.period_end IS 'End date of yield accrual period';