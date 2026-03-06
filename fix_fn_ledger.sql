CREATE OR REPLACE FUNCTION "public"."fn_ledger_drives_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- We ONLY handle row insertions here. Updates (like voiding) are handled below.
  IF (TG_OP = 'INSERT') THEN
    -- Ignore system-generated internal transfers (e.g., fee routing)
    IF NEW.is_system_generated = true AND NEW.type IN ('INTERNAL_CREDIT', 'INTERNAL_WITHDRAWAL') THEN
      RETURN NEW;
    END IF;

    -- Update investor's position based on transaction type
    UPDATE public.investor_positions
    SET 
        current_value = CASE
            WHEN NEW.type = 'WITHDRAWAL' THEN current_value - ABS(NEW.amount)
            WHEN NEW.type = 'FEE' THEN current_value - ABS(NEW.amount)
            WHEN NEW.type = 'ADJUSTMENT' THEN current_value + NEW.amount
            ELSE current_value + ABS(NEW.amount)
        END,
        
        cumulative_yield_earned = CASE
            WHEN NEW.type IN ('YIELD', 'INTEREST') THEN cumulative_yield_earned + ABS(NEW.amount)
            ELSE cumulative_yield_earned
        END,
        
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    -- Reverse the effect of voided transaction
    UPDATE public.investor_positions
    SET 
        current_value = CASE
            WHEN OLD.type = 'WITHDRAWAL' THEN current_value + ABS(OLD.amount)
            WHEN OLD.type = 'FEE' THEN current_value + ABS(OLD.amount)
            WHEN OLD.type = 'ADJUSTMENT' THEN current_value - OLD.amount
            ELSE current_value - ABS(OLD.amount)
        END,
        
        cumulative_yield_earned = CASE
            WHEN OLD.type IN ('YIELD', 'INTEREST') THEN GREATEST(cumulative_yield_earned - ABS(OLD.amount), 0)
            ELSE cumulative_yield_earned
        END,
        
        cost_basis = CASE
            WHEN OLD.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(OLD.amount), 0)
            WHEN OLD.type = 'WITHDRAWAL' THEN cost_basis + ABS(OLD.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$;
