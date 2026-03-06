-- =====================================================
-- Fee Schedule Guardrails + Last Activity Tracking
-- =====================================================

-- Enable btree_gist for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =====================================================
-- PART 1: Fee Schedule Guardrails
-- =====================================================

-- Add end_date column to investor_fee_schedule
ALTER TABLE public.investor_fee_schedule 
ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;

-- Create exclusion constraint to prevent overlapping date ranges
-- Using COALESCE to handle NULL fund_id (means "all funds")
ALTER TABLE public.investor_fee_schedule
ADD CONSTRAINT no_overlapping_fee_schedules
EXCLUDE USING gist (
  investor_id WITH =,
  COALESCE(fund_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
  daterange(effective_date, COALESCE(end_date, '9999-12-31'::date), '[]') WITH &&
);

-- Create trigger to auto-close previous schedule when inserting new one
CREATE OR REPLACE FUNCTION public.close_previous_fee_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Close any open (end_date IS NULL) schedules for same investor+fund
  -- that start BEFORE the new schedule
  UPDATE investor_fee_schedule
  SET end_date = NEW.effective_date - INTERVAL '1 day'
  WHERE investor_id = NEW.investor_id
    AND COALESCE(fund_id, '00000000-0000-0000-0000-000000000000'::uuid) = 
        COALESCE(NEW.fund_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND end_date IS NULL
    AND id != NEW.id
    AND effective_date < NEW.effective_date;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_close_previous_fee_schedule ON investor_fee_schedule;

CREATE TRIGGER trg_close_previous_fee_schedule
AFTER INSERT ON investor_fee_schedule
FOR EACH ROW EXECUTE FUNCTION close_previous_fee_schedule();

-- =====================================================
-- PART 2: Last Activity Tracking
-- =====================================================

-- Add last_activity_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NULL;

-- Create trigger function to update last_activity_at on transactions
CREATE OR REPLACE FUNCTION public.update_investor_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger function for withdrawal_requests (uses investor_id too)
CREATE OR REPLACE FUNCTION public.update_investor_last_activity_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.investor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS trg_update_last_activity_on_transaction ON transactions_v2;
DROP TRIGGER IF EXISTS trg_update_last_activity_on_withdrawal ON withdrawal_requests;

CREATE TRIGGER trg_update_last_activity_on_transaction
AFTER INSERT ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION update_investor_last_activity();

CREATE TRIGGER trg_update_last_activity_on_withdrawal
AFTER INSERT OR UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION update_investor_last_activity_withdrawal();

-- Backfill last_activity_at from existing transactions
UPDATE profiles p
SET last_activity_at = sub.max_date
FROM (
  SELECT investor_id, MAX(created_at) as max_date
  FROM transactions_v2
  GROUP BY investor_id
) sub
WHERE p.id = sub.investor_id
  AND p.last_activity_at IS NULL;