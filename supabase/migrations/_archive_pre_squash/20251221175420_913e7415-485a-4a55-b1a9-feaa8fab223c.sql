-- ============================================
-- P0: Auto-close previous fee schedule trigger
-- P1: IB parent role validation trigger
-- P2: Last activity trigger for generated_statements
-- ============================================

-- ============================================
-- 1. AUTO-CLOSE PREVIOUS FEE SCHEDULE (P0)
-- When a new fee schedule is inserted, auto-set end_date on previous schedules
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_close_previous_fee_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Close any existing schedules for the same investor+fund scope
  -- that don't have an end_date and have an effective_date before the new schedule
  UPDATE investor_fee_schedule
  SET 
    end_date = NEW.effective_date - INTERVAL '1 day',
    updated_at = NOW()
  WHERE investor_id = NEW.investor_id
    AND COALESCE(fund_id::text, 'ALL') = COALESCE(NEW.fund_id::text, 'ALL')
    AND id != NEW.id
    AND end_date IS NULL
    AND effective_date < NEW.effective_date;
  
  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_close_previous_fee_schedule ON investor_fee_schedule;

CREATE TRIGGER trg_auto_close_previous_fee_schedule
  AFTER INSERT ON investor_fee_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_previous_fee_schedule();

-- ============================================
-- 2. IB PARENT ROLE VALIDATION (P1)
-- Ensure ib_parent_id references a user with 'ib' role
-- Reset ib_percentage to 0 when removing IB parent
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_ib_parent_has_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If ib_parent_id is being set, validate the parent has 'ib' role
  IF NEW.ib_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = NEW.ib_parent_id AND role = 'ib'
    ) THEN
      RAISE EXCEPTION 'IB parent does not have the IB role. Please assign the IB role to this user first.'
        USING ERRCODE = 'check_violation';
    END IF;
    
    -- Prevent self-referencing IB
    IF NEW.ib_parent_id = NEW.id THEN
      RAISE EXCEPTION 'An investor cannot be their own IB parent.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  
  -- If removing IB parent, reset percentage to 0
  IF NEW.ib_parent_id IS NULL AND (OLD IS NULL OR OLD.ib_parent_id IS NOT NULL) THEN
    NEW.ib_percentage := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_validate_ib_parent_role ON profiles;

CREATE TRIGGER trg_validate_ib_parent_role
  BEFORE INSERT OR UPDATE OF ib_parent_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ib_parent_has_role();

-- ============================================
-- 3. LAST ACTIVITY TRIGGER FOR GENERATED STATEMENTS (P2)
-- Update profiles.last_activity_at when a statement is generated
-- ============================================

CREATE OR REPLACE FUNCTION public.update_last_activity_on_statement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  
  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_update_last_activity_on_statement ON generated_statements;

CREATE TRIGGER trg_update_last_activity_on_statement
  AFTER INSERT ON generated_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_activity_on_statement();

-- ============================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================

-- V1: Verify fee schedule trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_auto_close_previous_fee_schedule';

-- V2: Verify IB parent validation trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_validate_ib_parent_role';

-- V3: Verify last activity trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_update_last_activity_on_statement';