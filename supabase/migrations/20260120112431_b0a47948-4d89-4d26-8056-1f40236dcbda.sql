-- ============================================================================
-- C2: Remove duplicate indexes on transactions_v2
-- Release: C (Cleanup)
-- ============================================================================

-- Remove duplicate reference_id indexes on transactions_v2
-- Keep ONLY: idx_transactions_v2_reference_unique (WHERE NOT is_voided)
DROP INDEX IF EXISTS transactions_v2_reference_id_key;
DROP INDEX IF EXISTS transactions_v2_reference_id_unique;
DROP INDEX IF EXISTS idx_transactions_v2_reference_id_unique;

-- Remove duplicate distribution_id index
DROP INDEX IF EXISTS idx_transactions_v2_distribution;