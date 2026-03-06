-- Platform Hardening Migration: Fund Uniqueness + Data Cleanup (Fixed)
-- This migration ensures data integrity across all assets and funds

-- ============================================
-- PART 1: Enforce single active fund per asset
-- ============================================

-- Add unique partial index to prevent future duplicates
-- Only one fund per asset can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_funds_active_asset_unique 
ON public.funds (LOWER(asset)) 
WHERE status = 'active';

-- ============================================
-- PART 2: Cleanup corrupted BTC data
-- ============================================

-- Canonical BTC fund mapping:
-- Active: IND-BTC (0a048d9b-c4cf-46eb-b428-59e10307df93)
-- Deprecated: BTCYF (6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5)

-- 2.1 Merge positions from deprecated BTC fund into active fund
-- First, update positions that don't have a conflict
UPDATE public.investor_positions
SET fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93',
    updated_at = NOW()
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5'
  AND investor_id NOT IN (
    SELECT investor_id FROM public.investor_positions 
    WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
  );

-- For investors who have BOTH deprecated and active positions, merge by adding values
UPDATE public.investor_positions active_pos
SET 
  shares = active_pos.shares + COALESCE(dep_pos.shares, 0),
  current_value = active_pos.current_value + COALESCE(dep_pos.current_value, 0),
  cost_basis = active_pos.cost_basis + COALESCE(dep_pos.cost_basis, 0),
  updated_at = NOW()
FROM public.investor_positions dep_pos
WHERE active_pos.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
  AND dep_pos.fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5'
  AND active_pos.investor_id = dep_pos.investor_id;

-- Delete the deprecated positions that were merged
DELETE FROM public.investor_positions
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5';

-- 2.2 Repoint transactions from deprecated BTC fund to active
UPDATE public.transactions_v2
SET fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5';

-- 2.3 Repoint fee_allocations from deprecated BTC fund to active
UPDATE public.fee_allocations
SET fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5';

-- 2.4 Repoint ib_allocations from deprecated BTC fund to active
UPDATE public.ib_allocations
SET fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5';

-- 2.5 Repoint fund_daily_aum from deprecated BTC fund to active
UPDATE public.fund_daily_aum
SET fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
WHERE fund_id = '6d8c3c38-3a2a-4d19-8c1b-c0f6af67c8d5';

-- ============================================
-- PART 3: Add CHECK constraint on fee_pct
-- ============================================

-- Fee percentage is stored as 0-100 (e.g., 18 = 18%)
-- Display directly as X%, no multiplication needed
ALTER TABLE public.investor_fee_schedule 
DROP CONSTRAINT IF EXISTS chk_fee_pct_range;

ALTER TABLE public.investor_fee_schedule 
ADD CONSTRAINT chk_fee_pct_range CHECK (fee_pct >= 0 AND fee_pct <= 100);

-- Add documentation comment
COMMENT ON COLUMN public.investor_fee_schedule.fee_pct IS 'Fee percentage stored as 0-100 (e.g., 18 = 18%). Display directly as X% without multiplication.';

-- ============================================
-- PART 4: Add trigger to prevent positions on non-active funds
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_position_fund_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the fund is active
  IF NOT EXISTS (
    SELECT 1 FROM public.funds 
    WHERE id = NEW.fund_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot create position on non-active fund. Fund ID: %, Status must be active.', NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_validate_position_fund_status ON public.investor_positions;

-- Create trigger for INSERT only (allow updates to existing positions)
CREATE TRIGGER trg_validate_position_fund_status
  BEFORE INSERT ON public.investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_position_fund_status();

-- ============================================
-- PART 5: Add trigger to prevent transactions on non-active funds
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_transaction_fund_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the fund is active
  IF NOT EXISTS (
    SELECT 1 FROM public.funds 
    WHERE id = NEW.fund_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot create transaction on non-active fund. Fund ID: %, Status must be active.', NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_validate_transaction_fund_status ON public.transactions_v2;

-- Create trigger for INSERT only
CREATE TRIGGER trg_validate_transaction_fund_status
  BEFORE INSERT ON public.transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_fund_status();