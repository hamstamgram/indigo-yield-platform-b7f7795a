-- Fix search_path for remaining trigger functions
-- These 2 functions were identified by the security linter

-- 1. Fix prevent_auto_aum_creation function
CREATE OR REPLACE FUNCTION public.prevent_auto_aum_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocked_sources TEXT[] := ARRAY['daily_carryforward_job', 'auto_carryforward', 'auto_bootstrap', 'position_sync', 'position_sync_trigger'];
BEGIN
  -- Block automated AUM generation attempts
  IF NEW.source = ANY(blocked_sources) THEN
    RAISE EXCEPTION 'Automatic AUM generation is disabled. Source "%" is blocked. Manual AUM entries only.', NEW.source;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Fix validate_transaction_has_aum function
CREATE OR REPLACE FUNCTION public.validate_transaction_has_aum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_aum BOOLEAN;
BEGIN
  -- Check if AUM exists for this fund/date combo
  SELECT EXISTS (
    SELECT 1 FROM public.fund_daily_aum
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.transaction_date::date
      AND is_voided = false
  ) INTO has_aum;
  
  -- Only warn, don't block - per memory policy
  IF NOT has_aum THEN
    RAISE WARNING 'No AUM record found for fund % on date %. Consider adding AUM entry.', NEW.fund_id, NEW.transaction_date;
  END IF;
  
  RETURN NEW;
END;
$$;