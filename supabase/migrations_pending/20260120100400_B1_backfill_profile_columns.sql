-- ============================================================================
-- B1: Backfill all profile_id columns from legacy columns
-- Release: B (Backfill + Validate)
-- ============================================================================

-- Backfill statements.investor_profile_id from investor_id
UPDATE statements 
SET investor_profile_id = investor_id 
WHERE investor_profile_id IS NULL AND investor_id IS NOT NULL;

-- Backfill documents profile columns
UPDATE documents 
SET user_profile_id = user_id 
WHERE user_profile_id IS NULL AND user_id IS NOT NULL;

UPDATE documents 
SET created_by_profile_id = created_by 
WHERE created_by_profile_id IS NULL AND created_by IS NOT NULL;

-- Backfill voided_by_profile_id columns
UPDATE transactions_v2 
SET voided_by_profile_id = voided_by 
WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;

UPDATE fee_allocations 
SET voided_by_profile_id = voided_by 
WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;

UPDATE ib_allocations 
SET voided_by_profile_id = voided_by 
WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;

-- ============================================================================
-- Verification queries (run manually to confirm backfill success)
-- ============================================================================
-- SELECT 'statements' as tbl, COUNT(*) as missing 
-- FROM statements WHERE investor_id IS NOT NULL AND investor_profile_id IS NULL
-- UNION ALL
-- SELECT 'documents_user', COUNT(*) FROM documents WHERE user_id IS NOT NULL AND user_profile_id IS NULL
-- UNION ALL
-- SELECT 'documents_created_by', COUNT(*) FROM documents WHERE created_by IS NOT NULL AND created_by_profile_id IS NULL
-- UNION ALL
-- SELECT 'transactions_v2', COUNT(*) FROM transactions_v2 WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL
-- UNION ALL
-- SELECT 'fee_allocations', COUNT(*) FROM fee_allocations WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL
-- UNION ALL
-- SELECT 'ib_allocations', COUNT(*) FROM ib_allocations WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
-- ============================================================================
