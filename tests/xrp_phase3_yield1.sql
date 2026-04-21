-- Phase 3: Yield Distribution - Reporting, 184,358 XRP on 2025-11-30
-- Expected: Sam +284, Ryan +14.20, INDIGO Fees +56.80
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  
  v_result := apply_segmented_yield_distribution_v5(
    '2c123c4f-76b4-4504-867e-059649855417',
    '2025-11-30'::date,
    184358,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'reporting'::aum_purpose,
    NULL,
    NULL
  );
  
  RAISE NOTICE 'Yield 1 result: %', v_result;
END;
$$;