-- Revert Jose Molla's BTC deposit date back to its original 2024-07-01
-- The previous migration moved it to 2024-06-30 as a workaround, but the
-- Edge Function now correctly treats first-day-of-period deposits as
-- beginning balance (sumBalanceUpTo uses <= instead of <).
--
-- Reference: Jose Molla investor_id = c9f2e7e8-cb21-4c9b-81ab-a11acc580e9a

DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE transactions_v2
  SET tx_date = '2024-07-01'
  WHERE investor_id = 'c9f2e7e8-cb21-4c9b-81ab-a11acc580e9a'
    AND type = 'DEPOSIT'
    AND asset = 'BTC'
    AND tx_date = '2024-06-30'
    AND is_voided = false;
END; $$;
