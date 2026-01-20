-- ============================================================================
-- C1: Remove duplicate foreign key constraints
-- Release: C (Cleanup)
-- ============================================================================

-- Remove duplicate investor_id FK on transactions_v2
-- Keep: fk_transactions_v2_investor (ON DELETE RESTRICT - safer)
-- Drop: transactions_v2_investor_id_fkey (ON DELETE CASCADE - less safe)
ALTER TABLE transactions_v2 
  DROP CONSTRAINT IF EXISTS transactions_v2_investor_id_fkey;

-- Remove duplicate fund_id FK on yield_distributions
-- Keep: fk_yield_distributions_fund_new (newer, standardized naming)
-- Drop: fk_yield_distributions_fund (older duplicate)
ALTER TABLE yield_distributions 
  DROP CONSTRAINT IF EXISTS fk_yield_distributions_fund;

-- ============================================================================
-- ROLLBACK (only if needed - these are duplicates so restoration unlikely):
-- ALTER TABLE transactions_v2 ADD CONSTRAINT transactions_v2_investor_id_fkey 
--   FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;
-- ALTER TABLE yield_distributions ADD CONSTRAINT fk_yield_distributions_fund 
--   FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
-- ============================================================================
