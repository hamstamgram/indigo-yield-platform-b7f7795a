-- Fix Jose Molla's BTC deposit date from 2024-07-01 to 2024-06-30
-- The deposit on 2024-07-01 (same as July period start) was being classified
-- as an "addition" rather than beginning balance, causing beginning_balance = 0
-- for all subsequent monthly reports. Moving to June 30 ensures it appears as
-- beginning balance in the July report.
--
-- Reference: Jose Molla investor_id = c9f2e7e8-cb21-4c9b-81ab-a11acc580e9a

DO $$ BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE transactions_v2
  SET tx_date = '2024-06-30'
  WHERE investor_id = 'c9f2e7e8-cb21-4c9b-81ab-a11acc580e9a'
    AND type = 'DEPOSIT'
    AND asset = 'BTC'
    AND tx_date = '2024-07-01'
    AND is_voided = false;
END; $$;
