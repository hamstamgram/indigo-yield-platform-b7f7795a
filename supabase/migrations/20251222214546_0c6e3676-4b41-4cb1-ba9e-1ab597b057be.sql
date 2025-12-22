-- Step 1: Create fund daily AUM for 2024-01-01 (for reconciliation transaction)
INSERT INTO public.fund_daily_aum (
  fund_id, 
  aum_date, 
  total_aum, 
  purpose, 
  source
) VALUES (
  '0a048d9b-c4cf-46eb-b428-59e10307df93',  -- BTC Fund
  '2024-01-01',
  100,  -- 100 BTC was the position at that time
  'transaction',
  'reconciliation'
)
ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;

-- Step 2: Create fund daily AUM for today
INSERT INTO public.fund_daily_aum (
  fund_id, 
  aum_date, 
  total_aum, 
  purpose, 
  source
)
SELECT 
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  CURRENT_DATE,
  COALESCE(SUM(current_value), 0),
  'transaction',
  'auto-created'
FROM public.investor_positions
WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;

-- Step 3: Create reconciliation transaction for Advantage Blockchain
INSERT INTO public.transactions_v2 (
  investor_id, 
  fund_id, 
  type, 
  tx_subtype,
  asset, 
  amount, 
  tx_date, 
  value_date, 
  notes, 
  source, 
  is_system_generated
) VALUES (
  'fb060de1-3561-4f84-8858-6a8dd58746b5',
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  'DEPOSIT', 
  'first_investment',
  'BTC', 
  100,
  '2024-01-01', 
  '2024-01-01',
  'Reconciliation: Historical deposit to align position with transaction history',
  'manual_admin', 
  true
);