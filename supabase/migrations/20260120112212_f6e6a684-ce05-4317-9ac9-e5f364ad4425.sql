-- ============================================================================
-- A4: Add voided_by_profile_id columns to transactions_v2, fee_allocations, ib_allocations
-- Release: A (Additive)
-- ============================================================================

-- Add voided_by_profile_id columns for canonical identity model
ALTER TABLE transactions_v2 
  ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

ALTER TABLE transactions_v2 
  ADD CONSTRAINT fk_transactions_v2_voided_by_profile 
  FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id) NOT VALID;

-- fee_allocations voided_by needs profile reference
ALTER TABLE fee_allocations
  ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

ALTER TABLE fee_allocations
  ADD CONSTRAINT fk_fee_allocations_voided_by_profile 
  FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id) NOT VALID;

-- ib_allocations voided_by needs profile reference  
ALTER TABLE ib_allocations
  ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

ALTER TABLE ib_allocations
  ADD CONSTRAINT fk_ib_allocations_voided_by_profile 
  FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id) NOT VALID;

-- Sync trigger for transactions_v2
CREATE OR REPLACE FUNCTION sync_transactions_v2_voided_by_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_transactions_v2_sync_voided_by ON transactions_v2;
CREATE TRIGGER trg_transactions_v2_sync_voided_by
  BEFORE INSERT OR UPDATE ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION sync_transactions_v2_voided_by_profile();

-- Sync trigger for fee_allocations
CREATE OR REPLACE FUNCTION sync_fee_allocations_voided_by_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fee_allocations_sync_voided_by ON fee_allocations;
CREATE TRIGGER trg_fee_allocations_sync_voided_by
  BEFORE INSERT OR UPDATE ON fee_allocations
  FOR EACH ROW EXECUTE FUNCTION sync_fee_allocations_voided_by_profile();

-- Sync trigger for ib_allocations
CREATE OR REPLACE FUNCTION sync_ib_allocations_voided_by_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_ib_allocations_sync_voided_by ON ib_allocations;
CREATE TRIGGER trg_ib_allocations_sync_voided_by
  BEFORE INSERT OR UPDATE ON ib_allocations
  FOR EACH ROW EXECUTE FUNCTION sync_ib_allocations_voided_by_profile();