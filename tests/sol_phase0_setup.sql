-- SOL Phase 0: Clean slate + setup
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Void stale AUM record for SOL fund (2026-04-15, total_aum=0)
  PERFORM void_fund_daily_aum('26f9f127-3908-49d3-8390-30e29939ab29'::uuid, 'SOL E2E test cleanup', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);

  -- Ensure Paul Johnson ib_parent_id = Alex Jacobs
  UPDATE profiles SET ib_parent_id = '4ca7a856-dbd1-4b75-8092-eb0c6070ba55'
  WHERE id = '96fbdf46-cd6a-4f99-8a0d-11607f051ccd' AND ib_parent_id IS DISTINCT FROM '4ca7a856-dbd1-4b75-8092-eb0c6070ba55';

  RAISE NOTICE 'SOL Phase 0 complete';
END;
$$;