DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  
  PERFORM void_fund_daily_aum('ac6d4e3f-8090-45e2-8351-52ed74c3a0d8'::uuid, 'XRP E2E test cleanup', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  PERFORM void_fund_daily_aum('0ef5691b-b36c-4191-a7f5-764bfe43226d'::uuid, 'XRP E2E test cleanup', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  PERFORM void_fund_daily_aum('482b9af3-b97f-4aa1-95b8-3d4b09064df4'::uuid, 'XRP E2E test cleanup', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  
  RAISE NOTICE 'Voided 3 stale AUM records';
END;
$$;