-- Add 'internal_routing' to tx_source enum
ALTER TYPE tx_source ADD VALUE IF NOT EXISTS 'internal_routing';

-- Update the block_fees_account_manual_deposits trigger to allow internal_routing
CREATE OR REPLACE FUNCTION public.block_fees_account_manual_deposits()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Check if target is the fees account
  IF NEW.investor_id = v_indigo_fees_id THEN
    -- Block DEPOSIT type unless system-generated
    IF NEW.type = 'DEPOSIT' 
       AND NOT COALESCE(NEW.is_system_generated, false)
       AND COALESCE(NEW.source::text, 'manual_admin') NOT IN (
         'yield_distribution', 
         'fee_allocation', 
         'system_bootstrap',
         'internal_routing'
       )
    THEN
      RAISE EXCEPTION 'Manual deposits to INDIGO FEES account are not allowed. Fee credits are system-generated only.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;