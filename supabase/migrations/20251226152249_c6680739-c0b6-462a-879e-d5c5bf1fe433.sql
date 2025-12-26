-- =====================================================
-- Financial Integrity: Foreign Key Constraints & Data Cleanup
-- =====================================================

-- PART 1: Clean up orphan yield distribution with voided transactions
-- This distribution has no valid transactions (all are voided)
UPDATE yield_distributions 
SET status = 'voided', 
    voided_at = now(), 
    void_reason = 'Cleanup: All related transactions were voided - integrity audit'
WHERE id = 'd4dc79bf-4b0a-4dc9-ba8f-f0ee91bb2e29'
  AND status != 'voided';

-- Void related IB allocations for orphan distribution
UPDATE ib_allocations 
SET is_voided = true, 
    voided_at = now()
WHERE distribution_id = 'd4dc79bf-4b0a-4dc9-ba8f-f0ee91bb2e29'
  AND (is_voided IS NULL OR is_voided = false);

-- Void related fee allocations for orphan distribution
UPDATE fee_allocations 
SET is_voided = true, 
    voided_at = now()
WHERE distribution_id = 'd4dc79bf-4b0a-4dc9-ba8f-f0ee91bb2e29'
  AND (is_voided IS NULL OR is_voided = false);

-- PART 2: Add Foreign Key Constraints (with ON DELETE RESTRICT for safety)
-- These prevent orphan records and ensure referential integrity

-- transactions_v2: investor_id -> profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_investor'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_investor 
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- transactions_v2: fund_id -> funds
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_fund 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- transactions_v2: distribution_id -> yield_distributions (SET NULL on delete)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_distribution'
  ) THEN
    ALTER TABLE transactions_v2 
      ADD CONSTRAINT fk_transactions_v2_distribution 
      FOREIGN KEY (distribution_id) REFERENCES yield_distributions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- fee_allocations: investor_id -> profiles  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_allocations_investor_v2'
  ) THEN
    ALTER TABLE fee_allocations 
      ADD CONSTRAINT fk_fee_allocations_investor_v2 
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- fee_allocations: fund_id -> funds
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fee_allocations_fund_v2'
  ) THEN
    ALTER TABLE fee_allocations 
      ADD CONSTRAINT fk_fee_allocations_fund_v2 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ib_allocations: ib_investor_id -> profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_allocations_ib_investor_v2'
  ) THEN
    ALTER TABLE ib_allocations 
      ADD CONSTRAINT fk_ib_allocations_ib_investor_v2 
      FOREIGN KEY (ib_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ib_allocations: source_investor_id -> profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_allocations_source_investor_v2'
  ) THEN
    ALTER TABLE ib_allocations 
      ADD CONSTRAINT fk_ib_allocations_source_investor_v2 
      FOREIGN KEY (source_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ib_allocations: fund_id -> funds
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ib_allocations_fund_v2'
  ) THEN
    ALTER TABLE ib_allocations 
      ADD CONSTRAINT fk_ib_allocations_fund_v2 
      FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;
  END IF;
END $$;