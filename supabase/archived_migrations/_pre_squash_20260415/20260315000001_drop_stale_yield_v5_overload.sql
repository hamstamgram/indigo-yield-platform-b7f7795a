-- Drop the stale overload of apply_segmented_yield_distribution_v5
--
-- Two overloads exist with identical types but different parameter ORDER:
--   OID 438582: (..., p_purpose aum_purpose, p_distribution_date date, p_admin_id uuid)  <-- STALE
--   OID 486840: (..., p_admin_id uuid, p_purpose aum_purpose, p_distribution_date date)  <-- CORRECT
--
-- PostgREST cannot disambiguate named-parameter calls (PGRST203 error),
-- causing all yield apply operations to fail.
--
-- The service layer (yieldApplyService.ts) calls with p_admin_id at position 4,
-- matching the correct overload (OID 486840). Drop the stale one.

DROP FUNCTION IF EXISTS public.apply_segmented_yield_distribution_v5(
    uuid, date, numeric, aum_purpose, date, uuid
);
