
DO $$
BEGIN
  -- Set canonical RPC flags to bypass position write triggers
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- 1. Void the 5 orphaned transactions from voided distribution c9110b45
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = NOW(),
      void_reason = 'Orphaned: parent distribution c9110b45 was voided on 2026-03-27 but these transactions were missed'
  WHERE distribution_id = 'c9110b45-9339-4090-b4f3-bad4b2784ca2'
    AND is_voided = false;

  -- 2. Recompute positions for affected investors
  PERFORM recompute_investor_position('203caf71-a9ac-4e2a-bbd3-b45dd51758d4', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Jose Molla BTC
  PERFORM recompute_investor_position('44801beb-4476-4a9b-9751-4e70267f6953', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Thomas Puech BTC
  PERFORM recompute_investor_position('b464a3f7-60d5-4bc0-9833-7b413bcc6cae', '0a048d9b-c4cf-46eb-b428-59e10307df93');  -- Indigo Fees BTC

  -- 3. Refresh AUM for BTC fund
  PERFORM recalculate_fund_aum_for_date('0a048d9b-c4cf-46eb-b428-59e10307df93', CURRENT_DATE);
END $$;
