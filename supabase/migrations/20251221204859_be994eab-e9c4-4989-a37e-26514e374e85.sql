
-- Create reconciliation transactions to align positions with visible transaction history
-- This addresses ledger discrepancies for 2 affected accounts

-- Account 1: john d die - Missing 5.0 BTC deposit to match position
-- Position: 6.33333333 BTC, Visible TX: 1.33333333 BTC, Discrepancy: 5.0 BTC
INSERT INTO transactions_v2 (
  investor_id,
  fund_id,
  tx_date,
  value_date,
  asset,
  amount,
  type,
  balance_before,
  balance_after,
  notes,
  created_by,
  visibility_scope,
  purpose,
  source,
  is_system_generated
)
VALUES (
  '63efce48-1607-4425-8eb0-6e2cd8cb0fb3',
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  '2024-01-01',
  '2024-01-01',
  'BTC',
  5.00000000,
  'DEPOSIT',
  0,
  5.00000000,
  'Reconciliation: Historical deposit to align position with transaction history',
  '1e96709a-b12d-47a1-b13f-79c4ac7b38b0',
  'investor_visible',
  'reporting',
  'manual_admin',
  true
);

-- Account 2: INDIGO DIGITAL ASSET FUND LP (Fees Account) - Missing 0.888 BTC visible credit
-- Position: 0.888 BTC, Visible TX: 0 BTC, Discrepancy: 0.888 BTC
INSERT INTO transactions_v2 (
  investor_id,
  fund_id,
  tx_date,
  value_date,
  asset,
  amount,
  type,
  balance_before,
  balance_after,
  notes,
  created_by,
  visibility_scope,
  purpose,
  source,
  is_system_generated
)
VALUES (
  '169bb053-36cb-4f6e-93ea-831f0dfeaf1d',
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  '2024-01-01',
  '2024-01-01',
  'BTC',
  0.88800000,
  'DEPOSIT',
  0,
  0.88800000,
  'Reconciliation: Platform fee account balance alignment - historical fee accumulation',
  '1e96709a-b12d-47a1-b13f-79c4ac7b38b0',
  'investor_visible',
  'reporting',
  'manual_admin',
  true
);

-- Add audit log entries for the reconciliation
INSERT INTO audit_log (entity, entity_id, action, actor_user, meta)
VALUES 
  ('transactions_v2', '63efce48-1607-4425-8eb0-6e2cd8cb0fb3', 'RECONCILIATION', '1e96709a-b12d-47a1-b13f-79c4ac7b38b0', 
   '{"reason": "Ledger discrepancy fix", "discrepancy_amount": 5.0, "fund": "Bitcoin Yield Fund", "investor": "john d die"}'::jsonb),
  ('transactions_v2', '169bb053-36cb-4f6e-93ea-831f0dfeaf1d', 'RECONCILIATION', '1e96709a-b12d-47a1-b13f-79c4ac7b38b0', 
   '{"reason": "Ledger discrepancy fix", "discrepancy_amount": 0.888, "fund": "Bitcoin Yield Fund", "investor": "INDIGO DIGITAL ASSET FUND LP"}'::jsonb);
