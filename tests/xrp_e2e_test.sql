-- =============================================================
-- XRP FUND END-TO-END TEST SCENARIO
-- Executes against remote database with JWT admin impersonation
-- =============================================================
-- 
-- Scenario:
--   1. Sam Johnson deposits 135,003 XRP on 2025-11-17
--   2. Sam Johnson deposits 49,000 XRP on 2025-11-25
--   3. Record Reporting yield of 184,358 XRP on 2025-11-30
--      Expected: Sam +284, Ryan +14.20, INDIGO Fees +56.80
--   4. Sam Johnson deposits 45,000 XRP on 2025-11-30 (after reporting)
--   5. Record Transaction yield of 229,731 XRP on 2025-12-08
--      Expected: Sam +298.31, Ryan +14.93, INDIGO Fees +59.76
-- =============================================================

-- ===== PHASE 0: SETUP =====
-- Impersonate admin user
SET request.jwt.claims = '{"sub": "e438bfff-44bc-48ab-a472-6abe89ee8f82", "role": "authenticated"}';

-- Void stale AUM records for XRP fund
UPDATE fund_daily_aum SET is_voided = true, void_reason = 'XRP E2E test cleanup', voided_at = now(), voided_by = 'e438bfff-44bc-48ab-a472-6abe89ee8f82'
WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false;

-- Reset positions to 0 and inactive (should already be)
UPDATE investor_positions SET current_value = 0, is_active = false, last_yield_crystallization_date = NULL
WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417';

-- Ensure Sam Johnson has ib_parent_id set to Ryan Van Der Wall
UPDATE profiles SET ib_parent_id = '40c33d59-0738-4ff7-b98f-28667e7735fe'
WHERE id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND ib_parent_id IS DISTINCT FROM '40c33d59-0738-4ff7-b98f-28667e7735fe';

-- Create IB commission schedule for Ryan (4% on XRP fund) if not exists
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
VALUES ('40c33d59-0738-4ff7-b98f-28667e7735fe', '2c123c4f-76b4-4504-867e-059649855417', 4, '2024-01-01')
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT 'SETUP' AS phase, 
  (SELECT ib_parent_id FROM profiles WHERE id = 'c7b18014-0432-41d8-a377-a9a1395767c4') AS sam_ib_parent,
  (SELECT ib_percentage FROM ib_commission_schedule WHERE investor_id = '40c33d59-0738-4ff7-b98f-28667e7735fe' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS ryan_ib_pct,
  (SELECT fee_pct FROM investor_fee_schedule WHERE investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS sam_fee_pct,
  (SELECT count(*) FROM fund_daily_aum WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false) AS active_aum_records;

-- ===== PHASE 1: Deposit 135,003 XRP for Sam Johnson on 2025-11-17 =====
SELECT apply_transaction_with_crystallization(
  '2c123c4f-76b4-4504-867e-059649855417',   -- fund_id (XRP)
  'c7b18014-0432-41d8-a377-a9a1395767c4',   -- investor_id (Sam)
  'DEPOSIT', 
  135003,                                      -- amount
  '2025-11-17'::date,                         -- tx_date
  'xrp-e2e-deposit-sam-20251117',             -- reference_id
  NULL,                                        -- p_new_total_aum (auto)
  'e438bfff-44bc-48ab-a472-6abe89ee8f82',    -- admin_id
  NULL,                                        -- notes
  'transaction'                                -- purpose
) AS deposit1_result;

-- Verify deposit 1
SELECT 'DEPOSIT_1' AS phase, 
  ip.current_value AS sam_position,
  ip.is_active,
  (SELECT total_aum FROM fund_daily_aum WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND aum_date = '2025-11-17' AND is_voided = false ORDER BY created_at DESC LIMIT 1) AS aum_1117
FROM investor_positions ip
WHERE ip.investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417';

-- ===== PHASE 2: Deposit 49,000 XRP for Sam Johnson on 2025-11-25 =====
SELECT apply_transaction_with_crystallization(
  '2c123c4f-76b4-4504-867e-059649855417',
  'c7b18014-0432-41d8-a377-a9a1395767c4',
  'DEPOSIT',
  49000,
  '2025-11-25'::date,
  'xrp-e2e-deposit-sam-20251125',
  NULL,
  'e438bfff-44bc-48ab-a472-6abe89ee8f82',
  NULL,
  'transaction'
) AS deposit2_result;

-- Verify deposit 2
SELECT 'DEPOSIT_2' AS phase,
  ip.current_value AS sam_position,
  (SELECT total_aum FROM fund_daily_aum WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND aum_date = '2025-11-25' AND is_voided = false ORDER BY created_at DESC LIMIT 1) AS aum_1125
FROM investor_positions ip
WHERE ip.investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417';

-- ===== PHASE 3: Yield Distribution - Reporting, 184,358 XRP on 2025-11-30 =====
-- Expected: Sam +284, Ryan +14.20, INDIGO Fees +56.80
SELECT apply_segmented_yield_distribution_v5(
  '2c123c4f-76b4-4504-867e-059649855417',   -- fund_id
  '2025-11-30'::date,                          -- period_end
  184358,                                       -- recorded_aum
  'e438bfff-44bc-48ab-a472-6abe89ee8f82',    -- admin_id
  'reporting'::aum_purpose,                    -- purpose
  NULL,                                         -- distribution_date (defaults to period_end)
  NULL                                          -- opening_aum (defaults to positions sum)
) AS yield1_result;

-- Verify yield distribution 1
SELECT 'YIELD_1' AS phase,
  (SELECT current_value FROM investor_positions WHERE investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS sam_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = '40c33d59-0738-4ff7-b98f-28667e7735fe' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS ryan_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS fees_position;

-- Check yield allocations
SELECT 'YIELD_1_ALLOC' AS phase, ya.investor_id, p.first_name, p.account_type,
  ya.gross_amount, ya.net_amount, ya.fee_amount, ya.ib_amount, ya.fee_pct, ya.ownership_pct
FROM yield_allocations ya
JOIN profiles p ON p.id = ya.investor_id
WHERE ya.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND ya.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'reporting' ORDER BY created_at DESC LIMIT 1)
ORDER BY ya.gross_amount DESC;

-- Check fee allocations
SELECT 'FEE_1_ALLOC' AS phase, fa.investor_id, p.first_name, fa.fee_amount, fa.fee_percentage
FROM fee_allocations fa
JOIN profiles p ON p.id = fa.investor_id
WHERE fa.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND fa.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'reporting' ORDER BY created_at DESC LIMIT 1)
ORDER BY fa.fee_amount DESC;

-- Check IB allocations
SELECT 'IB_1_ALLOC' AS phase, ia.ib_investor_id, p.first_name AS ib_name, ia.source_investor_id, ia.ib_fee_amount, ia.ib_percentage
FROM ib_allocations ia
JOIN profiles p ON p.id = ia.ib_investor_id
WHERE ia.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND ia.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'reporting' ORDER BY created_at DESC LIMIT 1);

-- Check IB commission ledger
SELECT 'IB_1_LEDGER' AS phase, icl.ib_id, icl.source_investor_id, icl.gross_yield_amount, icl.ib_percentage, icl.ib_commission_amount
FROM ib_commission_ledger icl
WHERE icl.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND icl.yield_distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'reporting' ORDER BY created_at DESC LIMIT 1);

-- ===== PHASE 4: Deposit 45,000 XRP for Sam Johnson on 2025-11-30 (after reporting) =====
SELECT apply_transaction_with_crystallization(
  '2c123c4f-76b4-4504-867e-059649855417',
  'c7b18014-0432-41d8-a377-a9a1395767c4',
  'DEPOSIT',
  45000,
  '2025-11-30'::date,
  'xrp-e2e-deposit-sam-20251130',
  NULL,
  'e438bfff-44bc-48ab-a472-6abe89ee8f82',
  NULL,
  'transaction'
) AS deposit3_result;

-- Verify deposit 3
SELECT 'DEPOSIT_3' AS phase,
  ip.current_value AS sam_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = '40c33d59-0738-4ff7-b98f-28667e7735fe' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS ryan_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS fees_position
FROM investor_positions ip
WHERE ip.investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417';

-- Full position snapshot before round 2 yield
SELECT 'POSITIONS_BEFORE_YIELD2' AS phase, p.first_name, p.last_name, p.account_type, ip.current_value, ip.is_active
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND ip.is_active = true
ORDER BY ip.current_value DESC;

-- ===== PHASE 5: Yield Distribution - Transaction, 229,731 XRP on 2025-12-08 =====
SELECT apply_segmented_yield_distribution_v5(
  '2c123c4f-76b4-4504-867e-059649855417',
  '2025-12-08'::date,
  229731,
  'e438bfff-44bc-48ab-a472-6abe89ee8f82',
  'transaction'::aum_purpose,
  NULL,
  NULL
) AS yield2_result;

-- Check yield distribution 2 details
SELECT 'YIELD_2' AS phase,
  (SELECT current_value FROM investor_positions WHERE investor_id = 'c7b18014-0432-41d8-a377-a9a1395767c4' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS sam_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = '40c33d59-0738-4ff7-b98f-28667e7735fe' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS ryan_position,
  (SELECT current_value FROM investor_positions WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae' AND fund_id = '2c123c4f-76b4-4504-867e-059649855417') AS fees_position;

-- Check yield distribution 2 summary
SELECT 'YIELD_2_DIST' AS phase, id, gross_yield_amount, total_net_amount, total_fee_amount, total_ib_amount, dust_amount, opening_aum, previous_aum, recorded_aum, allocation_count
FROM yield_distributions
WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'transaction'
ORDER BY created_at DESC LIMIT 1;

-- Check yield allocations round 2
SELECT 'YIELD_2_ALLOC' AS phase, ya.investor_id, p.first_name, p.account_type,
  ya.gross_amount, ya.net_amount, ya.fee_amount, ya.ib_amount, ya.fee_pct, ya.ownership_pct
FROM yield_allocations ya
JOIN profiles p ON p.id = ya.investor_id
WHERE ya.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND ya.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'transaction' ORDER BY created_at DESC LIMIT 1)
ORDER BY ya.gross_amount DESC;

-- Check IB allocations round 2
SELECT 'IB_2_ALLOC' AS phase, ia.ib_investor_id, p.first_name AS ib_name, ia.source_investor_id, ia.ib_fee_amount, ia.ib_percentage
FROM ib_allocations ia
JOIN profiles p ON p.id = ia.ib_investor_id
WHERE ia.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND ia.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'transaction' ORDER BY created_at DESC LIMIT 1);

-- Fee allocations round 2
SELECT 'FEE_2_ALLOC' AS phase, fa.investor_id, p.first_name, fa.fee_amount, fa.fee_percentage
FROM fee_allocations fa
JOIN profiles p ON p.id = fa.investor_id
WHERE fa.fund_id = '2c123c4f-76b4-4504-867e-059649855417'
  AND fa.distribution_id = (SELECT id FROM yield_distributions WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false AND purpose = 'transaction' ORDER BY created_at DESC LIMIT 1)
ORDER BY fa.fee_amount DESC;

-- ===== FINAL VERIFICATION =====
-- All positions
SELECT 'FINAL_POSITIONS' AS phase, p.first_name, p.last_name, p.account_type, ip.current_value, ip.is_active
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND ip.is_active = true
ORDER BY ip.current_value DESC;

-- All non-voided transactions
SELECT 'FINAL_TXNS' AS phase, t.type, t.amount, t.tx_date, p.first_name, t.purpose, t.reference_id
FROM transactions_v2 t
JOIN profiles p ON p.id = t.investor_id
WHERE t.fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND t.is_voided = false
ORDER BY t.tx_date, t.created_at;

-- AUM records
SELECT 'FINAL_AUM' AS phase, aum_date, total_aum, purpose, source, is_voided
FROM fund_daily_aum
WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417' AND is_voided = false
ORDER BY aum_date;

-- Run invariant checks
SELECT * FROM run_invariant_checks();