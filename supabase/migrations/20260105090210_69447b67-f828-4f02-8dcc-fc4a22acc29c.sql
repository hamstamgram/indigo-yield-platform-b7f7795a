-- =============================================================================
-- SCHEMA CLEANUP: Drop Duplicate FK Constraints & Unused Function
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PHASE 1: transactions_v2 - Keep RESTRICT for fund, CASCADE for investor
-- -----------------------------------------------------------------------------
ALTER TABLE transactions_v2 DROP CONSTRAINT IF EXISTS transactions_v2_fund_id_fkey;
-- Keep: fk_transactions_v2_fund (RESTRICT)

ALTER TABLE transactions_v2 DROP CONSTRAINT IF EXISTS fk_transactions_v2_investor;
ALTER TABLE transactions_v2 DROP CONSTRAINT IF EXISTS fk_transactions_v2_profile;
-- Keep: transactions_v2_investor_id_fkey (CASCADE)

-- -----------------------------------------------------------------------------
-- PHASE 2: investor_positions - Keep RESTRICT for fund
-- -----------------------------------------------------------------------------
ALTER TABLE investor_positions DROP CONSTRAINT IF EXISTS investor_positions_fund_id_fkey;
-- Keep: fk_investor_positions_fund (RESTRICT)

-- -----------------------------------------------------------------------------
-- PHASE 3: investor_emails - Keep one CASCADE
-- -----------------------------------------------------------------------------
ALTER TABLE investor_emails DROP CONSTRAINT IF EXISTS fk_investor_emails_profile;
-- Keep: fk_investor_emails_investor (CASCADE)

-- -----------------------------------------------------------------------------
-- PHASE 4: ib_allocations - Remove duplicates, keep originals with NO ACTION
-- -----------------------------------------------------------------------------
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_alloc_distribution;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_allocations_fund_v2;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_alloc_fund;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_alloc_ib;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_allocations_ib_investor;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_allocations_ib_investor_v2;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_alloc_source;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_allocations_source_investor;
ALTER TABLE ib_allocations DROP CONSTRAINT IF EXISTS fk_ib_allocations_source_investor_v2;
-- Keep: ib_allocations_*_fkey originals

-- -----------------------------------------------------------------------------
-- PHASE 5: fee_allocations - Standardize constraints
-- -----------------------------------------------------------------------------
-- Distribution: keep one CASCADE
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fee_allocations_distribution_id_fkey;
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fk_fee_alloc_distribution;
-- Keep: fk_fee_allocations_distribution (CASCADE)

-- Fund: keep one RESTRICT
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fee_allocations_fund_id_fkey;
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fk_fee_alloc_fund;
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fk_fee_allocations_fund_new;
-- Keep: fk_fee_allocations_fund_v2 (RESTRICT)

-- Investor: keep one RESTRICT  
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fee_allocations_investor_id_fkey;
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fk_fee_alloc_investor;
ALTER TABLE fee_allocations DROP CONSTRAINT IF EXISTS fk_fee_allocations_investor_new;
-- Keep: fk_fee_allocations_investor_v2 (RESTRICT)

-- -----------------------------------------------------------------------------
-- PHASE 6: yield_distributions - Keep RESTRICT for fund
-- -----------------------------------------------------------------------------
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS yield_distributions_fund_id_fkey;
-- Keep: fk_yield_distributions_fund_new (RESTRICT)

-- -----------------------------------------------------------------------------
-- PHASE 7: Drop unused force_delete_investor(uuid) overload
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.force_delete_investor(uuid);
-- Keep: force_delete_investor(uuid, uuid) used by edge function