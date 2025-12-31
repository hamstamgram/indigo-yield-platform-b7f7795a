-- Insert AUM record for BTC fund on 2025-12-31 by carrying forward from 2025-12-30
-- This is needed for the complete_withdrawal function to succeed

INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source)
SELECT 
  fund_id, 
  '2025-12-31'::date,
  total_aum,
  'transaction',
  'admin_carryforward'
FROM fund_daily_aum
WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
  AND aum_date = '2025-12-30'
  AND purpose = 'transaction'
ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;