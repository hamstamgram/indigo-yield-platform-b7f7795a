-- Fix validate_transaction_type trigger to remove invalid 'REDEMPTION' references
-- REDEMPTION is not a valid tx_type enum value

CREATE OR REPLACE FUNCTION public.validate_transaction_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_current_value numeric;
BEGIN
  -- Make negative amounts for outflow transaction types
  -- FIXED: Removed 'REDEMPTION' - it's not a valid tx_type enum value
  IF NEW.type IN ('WITHDRAWAL', 'FEE') AND NEW.amount > 0 THEN 
    NEW.amount := -ABS(NEW.amount); 
  END IF;
  
  -- Check sufficient balance for withdrawals only (not REDEMPTION which doesn't exist)
  IF NEW.type = 'WITHDRAWAL' THEN
    SELECT COALESCE(current_value, 0) INTO v_current_value 
    FROM public.investor_positions 
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    
    IF COALESCE(v_current_value, 0) + NEW.amount < 0 THEN 
      RAISE EXCEPTION 'Insufficient balance: %', v_current_value; 
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;