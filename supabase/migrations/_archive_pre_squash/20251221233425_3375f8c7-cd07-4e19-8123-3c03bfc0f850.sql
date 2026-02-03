-- Add tx_subtype column for explicit transaction categorization
-- This eliminates heuristic-based labeling (e.g., inferring "First Investment" from order)

-- Add tx_subtype column as text (simpler than enum, allows flexibility)
ALTER TABLE transactions_v2 
  ADD COLUMN IF NOT EXISTS tx_subtype text DEFAULT NULL;

-- Add check constraint for valid values
ALTER TABLE transactions_v2 
  ADD CONSTRAINT chk_tx_subtype CHECK (
    tx_subtype IS NULL OR tx_subtype IN (
      'first_investment',   -- True initial investment from onboarding/wizard
      'deposit',            -- Regular deposit/top-up
      'redemption',         -- Regular withdrawal
      'full_redemption',    -- Full exit/withdrawal all
      'fee_charge',         -- Fee deduction
      'yield_credit',       -- Interest/yield credit
      'adjustment'          -- Manual adjustment
    )
  );

-- Backfill: First investments (from investor_wizard source only)
UPDATE transactions_v2
SET tx_subtype = 'first_investment'
WHERE type = 'DEPOSIT' 
  AND source = 'investor_wizard'
  AND tx_subtype IS NULL;

-- Backfill: Regular deposits (all other deposits including manual_admin)
UPDATE transactions_v2
SET tx_subtype = 'deposit'
WHERE type = 'DEPOSIT' 
  AND tx_subtype IS NULL;

-- Backfill: Withdrawals - check notes for "full" indicator
UPDATE transactions_v2
SET tx_subtype = 'full_redemption'
WHERE type = 'WITHDRAWAL' 
  AND (notes ILIKE '%full%' OR notes ILIKE '%all%' OR notes ILIKE '%complete%')
  AND tx_subtype IS NULL;

-- Backfill: Regular withdrawals
UPDATE transactions_v2
SET tx_subtype = 'redemption'
WHERE type = 'WITHDRAWAL' 
  AND tx_subtype IS NULL;

-- Backfill: Fees
UPDATE transactions_v2
SET tx_subtype = 'fee_charge'
WHERE type = 'FEE' 
  AND tx_subtype IS NULL;

-- Backfill: Interest/Yield
UPDATE transactions_v2
SET tx_subtype = 'yield_credit'
WHERE type IN ('INTEREST', 'YIELD') 
  AND tx_subtype IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN transactions_v2.tx_subtype IS 'Explicit transaction sub-classification for UI display. First Investment must only appear when tx_subtype = first_investment. Never infer from ordering.';