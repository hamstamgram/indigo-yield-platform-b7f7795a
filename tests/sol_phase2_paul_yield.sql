-- SOL Phase 2: Paul Johnson deposit + reporting yield
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);

  v_result := apply_transaction_with_crystallization(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '96fbdf46-cd6a-4f99-8a0d-11607f051ccd',
    'DEPOSIT', 234.17, '2025-09-15',
    'sol-e2e-deposit-paul-20250915',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    NULL, 'transaction'
  );
  RAISE NOTICE 'Deposit 2: %', v_result;

  v_result := apply_segmented_yield_distribution_v5(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '2025-09-30'::date, 1500,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'reporting'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'Yield 2: %', v_result;
END;
$$;