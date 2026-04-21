-- SOL Phase 1: INDIGO LP deposit 1250 SOL + transaction yield 1252
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);

  v_result := apply_transaction_with_crystallization(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '711bfdc9-09b0-405f-9fc4-455aa0a9121b',
    'DEPOSIT', 1250, '2025-09-02',
    'sol-e2e-deposit-indigo-lp-20250902',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    NULL, 'transaction'
  );
  RAISE NOTICE 'Deposit 1: %', v_result;

  v_result := apply_segmented_yield_distribution_v5(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '2025-09-04'::date, 1252,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'transaction'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'Yield 1: %', v_result;
END;
$$;