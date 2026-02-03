-- Fix search_path for validate_transaction_has_aum function
CREATE OR REPLACE FUNCTION validate_transaction_has_aum()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aum_exists boolean;
  fund_asset text;
BEGIN
  -- Only validate for DEPOSIT and WITHDRAWAL types that affect positions
  IF NEW.type NOT IN ('DEPOSIT', 'WITHDRAWAL') THEN
    RETURN NEW;
  END IF;

  -- Check if AUM record exists for this fund and date
  SELECT EXISTS(
    SELECT 1 
    FROM public.fund_daily_aum 
    WHERE fund_id = NEW.fund_id 
      AND aum_date = NEW.tx_date 
      AND purpose = 'transaction'
  ) INTO aum_exists;

  IF NOT aum_exists THEN
    -- Get fund asset for better error message
    SELECT asset INTO fund_asset FROM public.funds WHERE id = NEW.fund_id;
    
    RAISE EXCEPTION 'AUM_MISSING: No AUM record exists for fund % on date %. Please record the fund AUM before creating this transaction.', 
      COALESCE(fund_asset, NEW.fund_id::text), 
      NEW.tx_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;