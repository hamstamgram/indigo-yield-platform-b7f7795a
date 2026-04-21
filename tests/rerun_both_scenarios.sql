-- =============================================================
-- RERUN: XRP + SOL E2E scenarios on blank slate
-- =============================================================
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);

  -- ===== XRP SCENARIO =====

  -- XRP Deposit 1: Sam Johnson 135,003 XRP on 2025-11-17
  v_result := apply_transaction_with_crystallization(
    '2c123c4f-76b4-4504-867e-059649855417',
    'c7b18014-0432-41d8-a377-a9a1395767c4',
    'DEPOSIT', 135003, '2025-11-17',
    'xrp-ui-deposit-sam-20251117',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82', NULL, 'transaction'
  );
  RAISE NOTICE 'XRP Dep1: %', v_result;

  -- XRP Deposit 2: Sam Johnson 49,000 XRP on 2025-11-25
  v_result := apply_transaction_with_crystallization(
    '2c123c4f-76b4-4504-867e-059649855417',
    'c7b18014-0432-41d8-a377-a9a1395767c4',
    'DEPOSIT', 49000, '2025-11-25',
    'xrp-ui-deposit-sam-20251125',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82', NULL, 'transaction'
  );
  RAISE NOTICE 'XRP Dep2: %', v_result;

  -- XRP Yield 1: Reporting 184,358 XRP on 2025-11-30
  v_result := apply_segmented_yield_distribution_v5(
    '2c123c4f-76b4-4504-867e-059649855417',
    '2025-11-30', 184358,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'reporting'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'XRP Yield1: %', v_result;

  -- XRP Deposit 3: Sam Johnson 45,000 XRP on 2025-11-30
  v_result := apply_transaction_with_crystallization(
    '2c123c4f-76b4-4504-867e-059649855417',
    'c7b18014-0432-41d8-a377-a9a1395767c4',
    'DEPOSIT', 45000, '2025-11-30',
    'xrp-ui-deposit-sam-20251130',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82', NULL, 'transaction'
  );
  RAISE NOTICE 'XRP Dep3: %', v_result;

  -- XRP Yield 2: Transaction 229,731 XRP on 2025-12-08
  v_result := apply_segmented_yield_distribution_v5(
    '2c123c4f-76b4-4504-867e-059649855417',
    '2025-12-08', 229731,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'transaction'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'XRP Yield2: %', v_result;

  -- ===== SOL SCENARIO =====

  -- SOL Deposit 1: INDIGO LP 1,250 SOL on 2025-09-02
  v_result := apply_transaction_with_crystallization(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '711bfdc9-09b0-405f-9fc4-455aa0a9121b',
    'DEPOSIT', 1250, '2025-09-02',
    'sol-ui-deposit-indigo-lp-20250902',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82', NULL, 'transaction'
  );
  RAISE NOTICE 'SOL Dep1: %', v_result;

  -- SOL Yield 1: Transaction 1,252 SOL on 2025-09-04
  v_result := apply_segmented_yield_distribution_v5(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '2025-09-04', 1252,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'transaction'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'SOL Yield1: %', v_result;

  -- SOL Deposit 2: Paul Johnson 234.17 SOL on 2025-09-15
  v_result := apply_transaction_with_crystallization(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '96fbdf46-cd6a-4f99-8a0d-11607f051ccd',
    'DEPOSIT', 234.17, '2025-09-15',
    'sol-ui-deposit-paul-20250915',
    NULL, 'e438bfff-44bc-48ab-a472-6abe89ee8f82', NULL, 'transaction'
  );
  RAISE NOTICE 'SOL Dep2: %', v_result;

  -- SOL Yield 2: Reporting 1,500 SOL on 2025-09-30
  v_result := apply_segmented_yield_distribution_v5(
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f',
    '2025-09-30', 1500,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'reporting'::aum_purpose, NULL, NULL
  );
  RAISE NOTICE 'SOL Yield2: %', v_result;

  RAISE NOTICE '=== ALL SCENARIOS EXECUTED ===';
END;
$$;