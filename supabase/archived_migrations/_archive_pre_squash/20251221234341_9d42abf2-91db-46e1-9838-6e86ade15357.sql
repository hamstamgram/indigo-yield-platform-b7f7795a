-- P1 Fix: Correct tx_subtype backfill
-- The original migration used 'onboarding' which doesn't exist in tx_source enum
-- The correct value for onboarding-created deposits is 'investor_wizard'

-- First, check if any records need fixing (those that may have been set based on 'onboarding' source)
-- Then ensure first_investment is only set for investor_wizard source

-- Re-run the correct backfill logic
UPDATE transactions_v2
SET tx_subtype = 'first_investment'
WHERE type = 'DEPOSIT' 
  AND source = 'investor_wizard'
  AND (tx_subtype IS NULL OR tx_subtype = 'deposit');

-- Ensure all other deposits without explicit subtype are set to 'deposit'
UPDATE transactions_v2
SET tx_subtype = 'deposit'
WHERE type = 'DEPOSIT' 
  AND tx_subtype IS NULL;

-- Ensure withdrawals have correct subtype  
UPDATE transactions_v2
SET tx_subtype = 'redemption'
WHERE type = 'WITHDRAWAL' 
  AND tx_subtype IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN transactions_v2.tx_subtype IS 'Transaction subtype for display labeling. first_investment ONLY for investor_wizard source deposits. Admin deposits always get deposit subtype.';