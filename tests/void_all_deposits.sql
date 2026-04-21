-- Void remaining deposit and dust transactions
DO $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);

  -- XRP deposits (reverse chronological)
  v_result := void_transaction('b25c39cf-11df-46e4-9114-9ddb1f46a060', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');
  v_result := void_transaction('8e8bb3ce-17fd-4c72-b22b-28dbc5f5135a', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');
  v_result := void_transaction('84bc207e-c847-4fe6-a346-5c7e8b42b097', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');

  -- XRP DUST
  v_result := void_transaction('8c2255f2-3d29-4cb0-b9e1-7148e4cec180', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');

  -- SOL deposits (reverse chronological)
  v_result := void_transaction('f183e593-0e4e-4194-913c-2013b6accf5f', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');
  v_result := void_transaction('8f6cea2b-5abf-4450-9518-2f956c15d15f', 'e438bfff-44bc-48ab-a472-6abe89ee8f82', 'E2E void for UI retest');

  RAISE NOTICE 'All deposits voided';
END;
$$;