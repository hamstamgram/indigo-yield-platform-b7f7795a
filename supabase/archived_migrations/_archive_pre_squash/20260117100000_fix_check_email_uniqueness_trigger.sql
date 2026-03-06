-- ============================================================================
-- Fix: check_email_uniqueness trigger references non-existent is_active column
--
-- The original trigger from 20260116100004_duplicate_profile_handling.sql
-- referenced profiles.is_active which doesn't exist. The profiles table
-- uses a 'status' column instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_email_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'A profile with this email already exists (case-insensitive): %', NEW.email
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- Verify trigger exists and will use the fixed function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_email_uniqueness'
  ) THEN
    CREATE TRIGGER trg_check_email_uniqueness
      BEFORE INSERT OR UPDATE OF email ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION check_email_uniqueness();
  END IF;
END $$;

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed check_email_uniqueness to use status column instead of is_active';
END $$;
