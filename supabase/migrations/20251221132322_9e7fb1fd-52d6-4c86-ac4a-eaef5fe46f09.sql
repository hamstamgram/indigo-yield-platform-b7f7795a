-- Fix security warnings: Add search_path to newly created functions

CREATE OR REPLACE FUNCTION enforce_fees_account_zero_fee()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_type = 'fees_account' AND COALESCE(NEW.fee_percentage, 0) != 0 THEN
    NEW.fee_percentage := 0;
    RAISE NOTICE 'fees_account fee_percentage forced to 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION block_fees_account_manual_deposits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Check if target is the fees account
  IF NEW.investor_id = v_indigo_fees_id THEN
    -- Block DEPOSIT type unless system-generated
    IF NEW.type = 'DEPOSIT' 
       AND NOT COALESCE(NEW.is_system_generated, false)
       AND COALESCE(NEW.source::text, 'manual_admin') NOT IN ('yield_distribution', 'fee_allocation', 'system_bootstrap')
    THEN
      RAISE EXCEPTION 'Manual deposits to INDIGO FEES account are not allowed. Fee credits are system-generated only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;