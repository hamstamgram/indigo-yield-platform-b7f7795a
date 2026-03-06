-- ============================================================================
-- A2: Add investor_profile_id to statements table
-- Release: A (Additive)
-- ============================================================================

-- Add investor_profile_id column for canonical identity model
ALTER TABLE statements 
  ADD COLUMN IF NOT EXISTS investor_profile_id uuid;

-- Add FK constraint (NOT VALID first for safety)
ALTER TABLE statements 
  ADD CONSTRAINT fk_statements_investor_profile 
  FOREIGN KEY (investor_profile_id) REFERENCES profiles(id) NOT VALID;

-- Create sync trigger to keep both columns in sync during transition
CREATE OR REPLACE FUNCTION sync_statements_investor_profile_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If investor_profile_id is not set, copy from investor_id
  IF NEW.investor_profile_id IS NULL AND NEW.investor_id IS NOT NULL THEN
    NEW.investor_profile_id := NEW.investor_id;
  END IF;
  -- If investor_id is not set but investor_profile_id is, copy back
  IF NEW.investor_id IS NULL AND NEW.investor_profile_id IS NOT NULL THEN
    NEW.investor_id := NEW.investor_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_statements_sync_profile_id ON statements;
CREATE TRIGGER trg_statements_sync_profile_id
  BEFORE INSERT OR UPDATE ON statements
  FOR EACH ROW EXECUTE FUNCTION sync_statements_investor_profile_id();