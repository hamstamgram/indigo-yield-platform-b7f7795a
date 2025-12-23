-- Phase 1: Clean up orphaned fee_allocations
DELETE FROM fee_allocations 
WHERE distribution_id = 'd456d883-a7cb-4781-bf74-29ca6ce6743f';

-- Phase 2: Consolidate duplicate function overloads

-- 2.1 Drop text-based admin_create_transaction (keep uuid version)
DROP FUNCTION IF EXISTS public.admin_create_transaction(uuid, text, text, numeric, numeric, text);

-- 2.2 Drop text-based update_investor_aum_percentages (keep uuid version)
DROP FUNCTION IF EXISTS public.update_investor_aum_percentages(text);

-- Phase 3: Add search_path to compute_correction_input_hash
CREATE OR REPLACE FUNCTION public.compute_correction_input_hash(
  p_fund_id uuid,
  p_date date,
  p_purpose text,
  p_new_aum numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN md5(
    p_fund_id::text || '|' ||
    p_date::text || '|' ||
    p_purpose || '|' ||
    p_new_aum::text
  );
END;
$function$;