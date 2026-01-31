-- =============================================================================
-- Phase 7: Eliminate Dust -- Exact Yield Allocation
-- =============================================================================
-- This migration:
-- 1. Zeros out all existing dust_amount values
-- 2. Adds a CHECK constraint to prevent future dust
-- 3. Does NOT drop columns yet (backward compatibility)
--
-- The yield RPCs will be updated separately to use the
-- "last-investor-absorbs-residual" pattern for exact conservation.
-- =============================================================================

-- Step 1: Zero out all existing dust amounts
UPDATE yield_distributions
SET dust_amount = 0
WHERE dust_amount IS NOT NULL AND dust_amount != 0;

-- Step 2: Add CHECK constraint to prevent future non-zero dust
-- (uses a soft constraint that allows NULL or 0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_yield_distributions_no_dust'
  ) THEN
    ALTER TABLE yield_distributions
    ADD CONSTRAINT chk_yield_distributions_no_dust
    CHECK (dust_amount IS NULL OR dust_amount = 0);
  END IF;
END $$;

-- Step 3: Add comment documenting the deprecation
COMMENT ON COLUMN yield_distributions.dust_amount IS
  'DEPRECATED: Always 0. Exact allocation eliminates dust. Will be dropped in future migration.';
COMMENT ON COLUMN yield_distributions.dust_receiver_id IS
  'DEPRECATED: No longer used. Exact allocation eliminates dust. Will be dropped in future migration.';

-- Step 4: Create a view for monitoring dust violations (should always be empty)
CREATE OR REPLACE VIEW v_dust_violations AS
SELECT
  id,
  fund_id,
  effective_date,
  gross_yield,
  total_net_amount,
  total_fee_amount,
  dust_amount,
  dust_receiver_id,
  status
FROM yield_distributions
WHERE COALESCE(dust_amount, 0) != 0
  AND COALESCE(is_voided, false) = false;

COMMENT ON VIEW v_dust_violations IS
  'Should always be empty. Any rows indicate a dust violation after Phase 7 migration.';
