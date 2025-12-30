-- ============================================================================
-- Migration: Fee Percentage Standardization + IB Commission Source
-- P0-1: Add profiles.fee_pct (0-100 range), P0-3: Add ib_commission_source
-- ============================================================================

-- Step 1: Add new fee_pct column to profiles (canonical 0-100 range)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fee_pct numeric(6,3) DEFAULT 20.000;

-- Make NOT NULL after backfill
-- Step 2: Backfill from existing fee_percentage 
-- If old value <= 1: multiply by 100 (decimal format)
-- If old value > 1: keep as-is (already percent format)
UPDATE profiles
SET fee_pct = CASE 
  WHEN fee_percentage IS NOT NULL AND fee_percentage <= 1 THEN fee_percentage * 100
  WHEN fee_percentage IS NOT NULL AND fee_percentage > 1 THEN fee_percentage
  ELSE 20.000
END
WHERE fee_pct IS NULL OR fee_pct = 20.000;

-- Step 3: Add NOT NULL constraint and CHECK constraint
ALTER TABLE profiles 
ALTER COLUMN fee_pct SET NOT NULL;

ALTER TABLE profiles
ADD CONSTRAINT profiles_fee_pct_range_check CHECK (fee_pct >= 0 AND fee_pct <= 100);

-- Step 4: Ensure investor_fee_schedule.fee_pct has proper precision and constraint
ALTER TABLE investor_fee_schedule
ALTER COLUMN fee_pct TYPE numeric(6,3);

-- Add check constraint if not exists (safe - will error if exists, so use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_fee_schedule_fee_pct_range_check'
  ) THEN
    ALTER TABLE investor_fee_schedule
    ADD CONSTRAINT investor_fee_schedule_fee_pct_range_check 
    CHECK (fee_pct >= 0 AND fee_pct <= 100);
  END IF;
END $$;

-- Step 5: Add ib_commission_source column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ib_commission_source text DEFAULT 'platform_fees';

ALTER TABLE profiles
ALTER COLUMN ib_commission_source SET NOT NULL;

-- Add check constraint for allowed values
ALTER TABLE profiles
ADD CONSTRAINT profiles_ib_commission_source_check 
CHECK (ib_commission_source IN ('platform_fees', 'investor_yield'));

-- Step 6: Add comment to clarify usage
COMMENT ON COLUMN profiles.fee_pct IS 'Investor fee percentage in 0-100 range (canonical). Use instead of fee_percentage.';
COMMENT ON COLUMN profiles.ib_commission_source IS 'platform_fees: IB reduces INDIGO credit. investor_yield: IB reduces investor net yield.';
COMMENT ON COLUMN profiles.fee_percentage IS 'DEPRECATED: Use fee_pct instead. Kept for backwards compatibility.';