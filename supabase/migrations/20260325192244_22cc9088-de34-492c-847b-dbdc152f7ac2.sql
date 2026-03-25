-- Fix check_fund_is_active() to be table-safe
-- Previous migration accessed NEW.is_voided on investor_positions which lacks that column
CREATE OR REPLACE FUNCTION public.check_fund_is_active()
RETURNS trigger AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- FIRST: Skip any UPDATE where fund_id hasn't changed (works on ALL tables)
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- SECOND: For transactions_v2 only, skip void operations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions_v2' THEN
    IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Validate fund exists and is active
  SELECT status INTO v_fund_status
  FROM public.funds WHERE id = NEW.fund_id::uuid;
  
  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;