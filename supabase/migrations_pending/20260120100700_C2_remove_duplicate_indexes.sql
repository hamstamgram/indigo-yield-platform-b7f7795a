-- ============================================================================
-- C2: Remove duplicate indexes on transactions_v2
-- Release: C (Cleanup)
-- ============================================================================

-- Remove duplicate reference_id indexes on transactions_v2
-- Keep ONLY: idx_transactions_v2_reference_unique (WHERE NOT is_voided)
-- This is the correct partial index that allows voided records to have duplicate reference_ids

-- These are the duplicates to remove:
DROP INDEX CONCURRENTLY IF EXISTS transactions_v2_reference_id_key;
DROP INDEX CONCURRENTLY IF EXISTS transactions_v2_reference_id_unique;
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_v2_reference_id_unique;

-- Also remove duplicate distribution_id index if exists
DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_v2_distribution;
-- Keep: idx_transactions_v2_distribution_id

-- Verification: After running, only these reference_id related indexes should remain:
-- - idx_transactions_v2_reference_unique (the correct partial unique index)

-- ============================================================================
-- ROLLBACK (if needed, though these are redundant):
-- CREATE UNIQUE INDEX CONCURRENTLY transactions_v2_reference_id_key 
--   ON transactions_v2 (reference_id) WHERE (reference_id IS NOT NULL);
-- CREATE UNIQUE INDEX CONCURRENTLY transactions_v2_reference_id_unique 
--   ON transactions_v2 (reference_id) WHERE (reference_id IS NOT NULL);
-- CREATE UNIQUE INDEX CONCURRENTLY idx_transactions_v2_reference_id_unique 
--   ON transactions_v2 (reference_id) WHERE (reference_id IS NOT NULL);
-- ============================================================================
