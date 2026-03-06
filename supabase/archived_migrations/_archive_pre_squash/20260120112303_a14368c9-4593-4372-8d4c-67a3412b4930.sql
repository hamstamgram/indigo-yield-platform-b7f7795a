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