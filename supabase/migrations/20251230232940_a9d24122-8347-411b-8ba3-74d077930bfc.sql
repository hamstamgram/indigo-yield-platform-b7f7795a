
-- Fix Bitcoin Yield Fund AUM mismatch
-- The daily_nav shows $60 AUM but there are no investor positions
UPDATE daily_nav
SET aum = 0
WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
AND nav_date = (
  SELECT MAX(nav_date) 
  FROM daily_nav 
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
);

-- Create trigger to auto-update positions after transaction insert
CREATE OR REPLACE FUNCTION update_position_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_position_exists boolean;
  v_new_balance numeric;
BEGIN
  -- Skip if transaction is voided
  IF NEW.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new balance from all transactions
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_new_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id 
    AND fund_id = NEW.fund_id
    AND NOT is_voided;
  
  -- Check if position exists
  SELECT EXISTS(
    SELECT 1 FROM investor_positions 
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id
  ) INTO v_position_exists;
  
  IF v_position_exists THEN
    -- Update existing position
    UPDATE investor_positions
    SET 
      current_value = v_new_balance,
      shares = v_new_balance,
      cost_basis = GREATEST(cost_basis, v_new_balance),
      updated_at = NOW(),
      last_transaction_date = NEW.effective_date
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  ELSE
    -- Create new position
    INSERT INTO investor_positions (
      investor_id, fund_id, fund_class, shares, cost_basis, current_value, last_transaction_date
    )
    SELECT 
      NEW.investor_id,
      NEW.fund_id,
      f.fund_class,
      v_new_balance,
      v_new_balance,
      v_new_balance,
      NEW.effective_date
    FROM funds f
    WHERE f.id = NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trg_update_position_on_transaction ON transactions_v2;

CREATE TRIGGER trg_update_position_on_transaction
AFTER INSERT ON transactions_v2
FOR EACH ROW
EXECUTE FUNCTION update_position_on_transaction();

-- Add comment
COMMENT ON FUNCTION update_position_on_transaction() IS 'Auto-updates investor_positions when transactions are inserted';

-- Log the fix
INSERT INTO audit_log (action, entity, entity_id, new_values)
VALUES (
  'AUM_MISMATCH_FIX',
  'daily_nav',
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  jsonb_build_object(
    'old_aum', 60,
    'new_aum', 0,
    'reason', 'No underlying investor positions exist for this AUM record'
  )
);
