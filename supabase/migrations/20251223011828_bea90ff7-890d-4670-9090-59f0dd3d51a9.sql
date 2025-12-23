-- ==========================================
-- FIX 1: Delete duplicate bootstrap FEE_CREDIT transaction
-- ==========================================
DELETE FROM transactions_v2 
WHERE id = '376a2b69-da26-43a3-ab1c-c9ab7f7c17b5'
  AND investor_id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'
  AND source = 'system_bootstrap';

-- ==========================================
-- FIX 2: Update INDIGO FEES position (subtract duplicate 0.888)
-- ==========================================
UPDATE investor_positions
SET current_value = current_value - 0.888,
    shares = shares - 0.888,
    updated_at = now()
WHERE investor_id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';

-- ==========================================
-- FIX 3: Backfill yield_distributions for Dec 21 distribution
-- distribution_type must be 'original' or 'correction'
-- status must be 'draft', 'applied', or 'rolled_back'
-- ==========================================
INSERT INTO yield_distributions (
  id, fund_id, effective_date, purpose, is_month_end,
  recorded_aum, previous_aum, gross_yield, 
  distribution_type, status, created_by, 
  summary_json
)
VALUES (
  gen_random_uuid(),
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  '2025-12-21',
  'reporting',
  false,
  105.0,
  100.0,
  5.0,
  'original',
  'applied',
  '55586442-641c-4d9e-939a-85f09b816073',
  jsonb_build_object(
    'gross_amount', 5.0,
    'net_amount', 4.0666666667,
    'total_fees', 0.9333333333,
    'total_ib_fees', 0.0453333333,
    'investor_count', 2,
    'period_start', '2025-12-01',
    'period_end', '2025-12-21',
    'backfill_note', 'Backfilled from existing transactions'
  )
)
ON CONFLICT DO NOTHING;

-- ==========================================
-- FIX 4: Backfill fee_allocations for each FEE transaction
-- ==========================================
-- testAdmin: 3.333 INTEREST, 0.60 FEE (18% fee rate)
INSERT INTO fee_allocations (
  id, distribution_id, fund_id, investor_id, fees_account_id,
  period_start, period_end, purpose,
  base_net_income, fee_percentage, fee_amount,
  created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM yield_distributions WHERE effective_date = '2025-12-21' AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93' LIMIT 1),
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  'a9681a5f-6ebf-40f5-9690-21d4e3433c52',
  '169bb053-36cb-4f6e-93ea-831f0dfeaf1d',
  '2025-12-01',
  '2025-12-21',
  'reporting',
  3.3333333333,
  0.18,
  0.60,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM fee_allocations 
  WHERE investor_id = 'a9681a5f-6ebf-40f5-9690-21d4e3433c52' 
    AND period_start = '2025-12-01'
);

-- john d die: 1.666 INTEREST, 0.333 FEE (20% fee rate)
INSERT INTO fee_allocations (
  id, distribution_id, fund_id, investor_id, fees_account_id,
  period_start, period_end, purpose,
  base_net_income, fee_percentage, fee_amount,
  created_at
)
SELECT 
  gen_random_uuid(),
  (SELECT id FROM yield_distributions WHERE effective_date = '2025-12-21' AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93' LIMIT 1),
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  '63efce48-1607-4425-8eb0-6e2cd8cb0fb3',
  '169bb053-36cb-4f6e-93ea-831f0dfeaf1d',
  '2025-12-01',
  '2025-12-21',
  'reporting',
  1.6666666667,
  0.20,
  0.3333333333,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM fee_allocations 
  WHERE investor_id = '63efce48-1607-4425-8eb0-6e2cd8cb0fb3' 
    AND period_start = '2025-12-01'
);

-- ==========================================
-- FIX 5: Fix IB allocation percentage for john d die (should be 10%, not 2%)
-- ==========================================
UPDATE ib_allocations
SET ib_percentage = 10.00
WHERE source_investor_id = '63efce48-1607-4425-8eb0-6e2cd8cb0fb3'
  AND ib_percentage = 2.00;

-- ==========================================
-- FIX 6: Update ib_allocations with distribution_id
-- ==========================================
UPDATE ib_allocations
SET distribution_id = (
  SELECT id FROM yield_distributions 
  WHERE effective_date = '2025-12-21' 
    AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93' 
  LIMIT 1
)
WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
  AND effective_date = '2025-12-21'
  AND distribution_id IS NULL;