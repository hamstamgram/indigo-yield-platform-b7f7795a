-- Create baseline AUM entries for IND-BTC and IND-SOL funds
-- These funds have investor positions but were missing AUM records
-- Using 'transaction' purpose as per enum values

INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided)
VALUES 
  -- IND-BTC: 3.468 BTC total positions
  ('0a048d9b-c4cf-46eb-b428-59e10307df93', CURRENT_DATE, 3.468, 'transaction', 'baseline_reconciliation', false),
  -- IND-SOL: 1250 SOL total positions  
  ('7574bc81-aab3-4175-9e7f-803aa6f9eb8f', CURRENT_DATE, 1250, 'transaction', 'baseline_reconciliation', false);