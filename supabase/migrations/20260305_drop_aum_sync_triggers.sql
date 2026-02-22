-- Migration: Drop legacy AUM sync triggers and clean up ghost records
-- This follows First Principles correctly by removing synthetic AUM snapshots on tx boundary.

-- 1. Drop the triggers that create synthetic AUM records from transactions
DROP TRIGGER IF EXISTS trg_sync_aum_on_transaction ON transactions_v2;
DROP TRIGGER IF EXISTS trg_sync_reporting_aum_to_transaction ON fund_daily_aum;

-- 2. Drop the trigger functions
DROP FUNCTION IF EXISTS sync_aum_on_transaction();
DROP FUNCTION IF EXISTS sync_reporting_aum_to_transaction();

-- 3. Clean up the synthetic / ghost records from fund_daily_aum
-- These were inserted by the tx_sync source whenever a deposit/withdrawal occurred
DELETE FROM fund_daily_aum 
WHERE source = 'tx_sync';

-- 4. Also delete any reporting syncs that were mapped to transaction purposes
DELETE FROM fund_daily_aum 
WHERE source = 'yield_aum_sync_v5';
