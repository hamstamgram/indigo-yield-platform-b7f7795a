-- Phase 5: Yield Distribution - Transaction, 229,731 XRP on 2025-12-08
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  
  v_result := apply_segmented_yield_distribution_v5(
    '2c123c4f-76b4-4504-867e-059649855417',
    '2025-12-08'::date,
    229731,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'transaction'::aum_purpose,
    NULL,
    NULL
  );
  
  RAISE NOTICE 'Yield 2 result: %', v_result;
END;
$$;