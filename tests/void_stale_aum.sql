-- Void stale AUM records
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}', false);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  PERFORM void_fund_daily_aum('16902b67-0a47-4d51-92bf-771c5cae2ef3'::uuid, 'Clean slate for UI retest', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  PERFORM void_fund_daily_aum('935b5d65-e84e-4830-8523-62279679ddbc'::uuid, 'Clean slate for UI retest', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  PERFORM void_fund_daily_aum('3c392ddb-cf3f-4161-9ee0-47a63b386af1'::uuid, 'Clean slate for UI retest', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);
  PERFORM void_fund_daily_aum('0889d3ff-1667-4a7f-95ca-6cfbbb838ed8'::uuid, 'Clean slate for UI retest', 'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid);

  RAISE NOTICE 'All stale AUM records voided';
END;
$$;