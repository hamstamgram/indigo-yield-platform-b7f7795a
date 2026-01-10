-- Fix validate_transaction_has_aum to use correct column name (tx_date instead of transaction_date)
-- This resolves the "record 'new' has no field 'transaction_date'" error

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
  -- FIXED: Use tx_date instead of transaction_date (correct schema column)
  SELECT EXISTS (
    SELECT 1 FROM public.fund_daily_aum
    WHERE fund_id = NEW.fund_id
      AND aum_date = NEW.tx_date::date
      AND is_voided = false
  ) INTO has_aum;
  
  -- Only warn, don't block - per memory policy
  IF NOT has_aum THEN
    RAISE WARNING 'No AUM record found for fund % on date %. Consider adding AUM entry.', 
      NEW.fund_id, NEW.tx_date;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comment documenting the fix
COMMENT ON FUNCTION public.validate_transaction_has_aum() IS 
  'Validates that an AUM record exists for the transaction date. Fixed 2026-01-10: Uses tx_date (correct column) instead of transaction_date.';