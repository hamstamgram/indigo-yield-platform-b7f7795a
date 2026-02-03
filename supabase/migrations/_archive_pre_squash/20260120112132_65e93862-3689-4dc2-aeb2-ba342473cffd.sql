-- ============================================================================
-- A3: Add profile reference columns to documents table
-- Release: A (Additive)
-- ============================================================================

-- Add profile reference columns for canonical identity model
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS user_profile_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_profile_id uuid;

-- Add FK constraints (NOT VALID first)
ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_user_profile 
  FOREIGN KEY (user_profile_id) REFERENCES profiles(id) NOT VALID;

ALTER TABLE documents 
  ADD CONSTRAINT fk_documents_created_by_profile 
  FOREIGN KEY (created_by_profile_id) REFERENCES profiles(id) NOT VALID;

-- Create sync trigger
CREATE OR REPLACE FUNCTION sync_documents_profile_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.user_profile_id := NEW.user_id;
  END IF;
  IF NEW.created_by_profile_id IS NULL AND NEW.created_by IS NOT NULL THEN
    NEW.created_by_profile_id := NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_documents_sync_profile_ids ON documents;
CREATE TRIGGER trg_documents_sync_profile_ids
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION sync_documents_profile_ids();