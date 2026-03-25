-- Fix: check_fund_is_active() should not block void operations
-- When voiding a transaction, we don't need to validate the fund is still active
-- This was causing "Fund not found" errors when voiding transactions

CREATE OR REPLACE FUNCTION check_fund_is_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Skip validation for void operations (only is_voided/void metadata changing)
  IF TG_OP = 'UPDATE' AND NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    RETURN NEW;
  END IF;
  
  -- Skip validation for any update that doesn't change fund_id
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- Get the fund status
  SELECT status INTO v_fund_status
  FROM public.funds 
  WHERE id = NEW.fund_id::uuid;
  
  -- If fund doesn't exist or is not active, block the operation
  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive or deprecated fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$;