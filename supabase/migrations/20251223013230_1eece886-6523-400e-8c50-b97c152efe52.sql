-- ==========================================
-- COMPREHENSIVE PLATFORM FIX MIGRATION
-- ==========================================

-- ==========================================
-- FIX 1: Reverse incorrect Advantage Blockchain withdrawal routing
-- The 5.0 BTC should NOT have been routed to INDIGO FEES
-- ==========================================

-- 1a. Delete the incorrect INTERNAL_CREDIT from INDIGO FEES
DELETE FROM transactions_v2 
WHERE id = '95c4489d-b6b8-4f28-a332-d8e6bb75a834'
  AND investor_id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'
  AND type = 'INTERNAL_CREDIT';

-- 1b. Convert INTERNAL_WITHDRAWAL to WITHDRAWAL for Advantage Blockchain
UPDATE transactions_v2
SET type = 'WITHDRAWAL',
    notes = 'Withdrawal processed for request 31ad4d0f-580d-4c7c-8bde-05aab38456b6',
    transfer_id = NULL
WHERE id = '7a2e11f3-e9c3-47eb-9220-761a30f74164'
  AND investor_id = 'fb060de1-3561-4f84-8858-6a8dd58746b5'
  AND type = 'INTERNAL_WITHDRAWAL';

-- 1c. Mark the withdrawal request as processed
UPDATE withdrawal_requests
SET status = 'completed',
    processed_amount = 5.0,
    processed_at = now()
WHERE id = '31ad4d0f-580d-4c7c-8bde-05aab38456b6';

-- ==========================================
-- FIX 2: Update INDIGO FEES position to correct value (0.888 - only fee credits)
-- ==========================================
UPDATE investor_positions
SET current_value = 0.888,
    shares = 0.888,
    cost_basis = 0.888,
    updated_at = now()
WHERE investor_id = '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';

-- ==========================================
-- FIX 3: Cancel testAdmin's pending withdrawal (test data)
-- ==========================================
UPDATE withdrawal_requests
SET status = 'cancelled',
    cancellation_reason = 'Test withdrawal - cancelled during data cleanup',
    cancelled_at = now()
WHERE id = '765bf66d-64b1-4099-9eed-3e2e70c30aab'
  AND status = 'approved';

-- ==========================================
-- FIX 4: Clean up duplicate user roles
-- Users with 'ib' role don't need separate 'investor' role
-- Users with 'admin' or 'super_admin' don't need separate 'investor' role
-- ==========================================

-- Remove 'investor' role for users who have 'ib' role
DELETE FROM user_roles
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'ib'
)
AND role = 'investor';

-- Remove 'investor' role for users who have 'admin' or 'super_admin' role
DELETE FROM user_roles
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
)
AND role = 'investor';

-- ==========================================
-- FIX 5: Remove zero position record (alec beckman)
-- ==========================================
DELETE FROM investor_positions
WHERE investor_id = '36330a7e-ecd9-4ab7-9679-496f78f090ce'
  AND current_value = 0
  AND shares = 0;

-- ==========================================
-- FIX 6: Sync fund_configurations fees with funds table
-- ==========================================
UPDATE fund_configurations
SET mgmt_fee_bps = 200,
    perf_fee_bps = 2000,
    updated_at = now()
WHERE code = 'BTC_YIELD'
  AND (mgmt_fee_bps != 200 OR perf_fee_bps != 2000);