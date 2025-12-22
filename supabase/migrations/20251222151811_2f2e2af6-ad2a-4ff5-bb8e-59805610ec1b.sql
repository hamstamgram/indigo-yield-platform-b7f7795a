-- Backend AUM validation trigger for transactions
-- Ensures AUM exists for the fund+date before allowing DEPOSIT/WITHDRAWAL transactions

CREATE OR REPLACE FUNCTION validate_transaction_has_aum()
RETURNS TRIGGER AS $$
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
    FROM fund_daily_aum 
    WHERE fund_id = NEW.fund_id 
      AND aum_date = NEW.tx_date 
      AND purpose = 'transaction'
  ) INTO aum_exists;

  IF NOT aum_exists THEN
    -- Get fund asset for better error message
    SELECT asset INTO fund_asset FROM funds WHERE id = NEW.fund_id;
    
    RAISE EXCEPTION 'AUM_MISSING: No AUM record exists for fund % on date %. Please record the fund AUM before creating this transaction.', 
      COALESCE(fund_asset, NEW.fund_id::text), 
      NEW.tx_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions_v2 for AUM validation
DROP TRIGGER IF EXISTS trg_validate_aum_on_transaction ON transactions_v2;
CREATE TRIGGER trg_validate_aum_on_transaction
  BEFORE INSERT ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_has_aum();

-- Add comment for documentation
COMMENT ON FUNCTION validate_transaction_has_aum() IS 'Validates that AUM exists for fund+date before allowing DEPOSIT/WITHDRAWAL transactions. Ensures proper yield allocation calculations.';
COMMENT ON TRIGGER trg_validate_aum_on_transaction ON transactions_v2 IS 'Enforces AUM requirement for position-affecting transactions';