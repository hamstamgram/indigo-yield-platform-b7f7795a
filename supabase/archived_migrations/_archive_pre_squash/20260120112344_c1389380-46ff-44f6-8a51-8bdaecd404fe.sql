-- ============================================================================
-- C1: Remove duplicate foreign key constraints
-- Release: C (Cleanup)
-- ============================================================================

-- Remove duplicate investor_id FK on transactions_v2
-- Keep: fk_transactions_v2_investor (ON DELETE RESTRICT)
-- Drop: transactions_v2_investor_id_fkey (ON DELETE CASCADE - less safe)
ALTER TABLE transactions_v2 
  DROP CONSTRAINT IF EXISTS transactions_v2_investor_id_fkey;

-- Remove duplicate fund_id FK on yield_distributions
-- Keep: fk_yield_distributions_fund_new (newer, standardized name)
-- Drop: fk_yield_distributions_fund (duplicate)
ALTER TABLE yield_distributions 
  DROP CONSTRAINT IF EXISTS fk_yield_distributions_fund;