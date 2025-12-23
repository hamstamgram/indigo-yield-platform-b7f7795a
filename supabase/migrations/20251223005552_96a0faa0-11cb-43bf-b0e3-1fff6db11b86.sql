-- 1. Delete orphaned ib_allocations referencing deleted distribution
DELETE FROM ib_allocations 
WHERE distribution_id = 'd456d883-a7cb-4781-bf74-29ca6ce6743f';

-- 2. Backfill legacy transactions with missing reference_id
UPDATE transactions_v2 
SET reference_id = 'legacy_' || id::text 
WHERE reference_id IS NULL;

-- 3. Drop and recreate compute_correction_input_hash with proper search_path on all overloads
-- First drop the 5-argument version that's missing search_path
DROP FUNCTION IF EXISTS public.compute_correction_input_hash(uuid, date, date, text, numeric);

-- Recreate the 5-argument version with proper search_path
CREATE OR REPLACE FUNCTION public.compute_correction_input_hash(
  p_fund_id uuid,
  p_period_start date,
  p_period_end date,
  p_purpose text,
  p_new_aum numeric
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN encode(
    sha256(
      (p_fund_id::text || p_period_start::text || p_period_end::text || p_purpose || p_new_aum::text)::bytea
    ),
    'hex'
  );
END;
$function$;