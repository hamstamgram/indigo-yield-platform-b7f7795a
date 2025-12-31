-- Fix: Replace 'effective_date' with 'tx_date' in transaction trigger
-- The transactions_v2 table uses tx_date, not effective_date

CREATE OR REPLACE FUNCTION public.update_position_on_transaction_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_position_exists boolean;
  v_new_balance numeric;
  v_target_investor_id uuid;
  v_target_fund_id uuid;
BEGIN
  -- Determine target investor/fund
  IF TG_OP = 'UPDATE' THEN
    v_target_investor_id := NEW.investor_id;
    v_target_fund_id := NEW.fund_id;
  ELSE
    v_target_investor_id := NEW.investor_id;
    v_target_fund_id := NEW.fund_id;
  END IF;

  -- For UPDATE, only process if is_voided changed to true
  IF TG_OP = 'UPDATE' AND NEW.is_voided = OLD.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- For INSERT, skip if transaction is voided
  IF TG_OP = 'INSERT' AND NEW.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- Calculate new balance from all non-voided transactions
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_new_balance
  FROM transactions_v2
  WHERE investor_id = v_target_investor_id 
    AND fund_id = v_target_fund_id
    AND NOT is_voided;
  
  -- Check if position exists
  SELECT EXISTS(
    SELECT 1 FROM investor_positions 
    WHERE investor_id = v_target_investor_id AND fund_id = v_target_fund_id
  ) INTO v_position_exists;
  
  IF v_position_exists THEN
    -- Update existing position
    UPDATE investor_positions
    SET 
      current_value = v_new_balance,
      shares = v_new_balance,
      updated_at = NOW(),
      last_transaction_date = CASE 
        WHEN TG_OP = 'INSERT' THEN NEW.tx_date
        ELSE last_transaction_date
      END
    WHERE investor_id = v_target_investor_id AND fund_id = v_target_fund_id;
  ELSIF TG_OP = 'INSERT' AND NOT NEW.is_voided THEN
    -- Create new position only on INSERT
    INSERT INTO investor_positions (
      investor_id, fund_id, fund_class, shares, cost_basis, current_value, last_transaction_date
    )
    SELECT 
      v_target_investor_id,
      v_target_fund_id,
      f.fund_class,
      v_new_balance,
      v_new_balance,
      v_new_balance,
      NEW.tx_date
    FROM funds f
    WHERE f.id = v_target_fund_id;
  END IF;
  
  RETURN NEW;
END;
$function$;