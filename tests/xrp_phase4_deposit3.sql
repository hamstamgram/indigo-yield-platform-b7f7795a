-- Phase 4: Deposit 45,000 XRP for Sam Johnson on 2025-11-30 (after reporting yield)
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  
  v_result := apply_transaction_with_crystallization(
    '2c123c4f-76b4-4504-867e-059649855417',
    'c7b18014-0432-41d8-a377-a9a1395767c4',
    'DEPOSIT',
    45000,
    '2025-11-30',
    'xrp-e2e-deposit-sam-20251130',
    NULL,
    'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    NULL,
    'transaction'
  );
  
  RAISE NOTICE 'Deposit 3 result: %', v_result;
END;
$$;