-- Void all yield distributions (reverse chronological) for both funds
-- This cascades to void associated YIELD/FEE_CREDIT/IB_CREDIT transactions
DO $$
DECLARE
  v_result json;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);

  -- XRP: Void transaction yield (Dec 8)
  v_result := void_yield_distribution('d01b7fd6-861e-425c-a0a7-8f6a022417b2', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid, 'E2E void for UI retest');
  RAISE NOTICE 'XRP void txn yield: %', v_result;

  -- XRP: Void reporting yield (Nov 30)
  v_result := void_yield_distribution('ca528c06-cd21-437b-96b1-568345dd0a73', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid, 'E2E void for UI retest');
  RAISE NOTICE 'XRP void reporting yield: %', v_result;

  -- SOL: Void reporting yield (Sept 30)
  v_result := void_yield_distribution('230b3f35-7418-4478-bd34-a16f62522bf0', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid, 'E2E void for UI retest');
  RAISE NOTICE 'SOL void reporting yield: %', v_result;

  -- SOL: Void transaction yield (Sept 4)
  v_result := void_yield_distribution('2cf7cb27-7f71-4916-a4eb-a758eaf59260', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid, 'E2E void for UI retest');
  RAISE NOTICE 'SOL void txn yield: %', v_result;
END;
$$;