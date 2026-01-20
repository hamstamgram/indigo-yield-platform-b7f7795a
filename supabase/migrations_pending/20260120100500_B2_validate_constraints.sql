-- ============================================================================
-- B2: Validate all NOT VALID foreign key constraints
-- Release: B (Backfill + Validate)
-- ============================================================================

-- Validate all NOT VALID foreign key constraints added in Release A
ALTER TABLE statements VALIDATE CONSTRAINT fk_statements_investor_profile;
ALTER TABLE documents VALIDATE CONSTRAINT fk_documents_user_profile;
ALTER TABLE documents VALIDATE CONSTRAINT fk_documents_created_by_profile;
ALTER TABLE transactions_v2 VALIDATE CONSTRAINT fk_transactions_v2_voided_by_profile;
ALTER TABLE fee_allocations VALIDATE CONSTRAINT fk_fee_allocations_voided_by_profile;
ALTER TABLE ib_allocations VALIDATE CONSTRAINT fk_ib_allocations_voided_by_profile;

-- Verification block (will raise warnings if issues exist)
DO $$
DECLARE
  v_null_count integer;
BEGIN
  -- Check statements backfill completeness
  SELECT COUNT(*) INTO v_null_count 
  FROM statements 
  WHERE investor_id IS NOT NULL AND investor_profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'statements: % rows with investor_id but no investor_profile_id', v_null_count;
  ELSE
    RAISE NOTICE 'statements: backfill complete';
  END IF;
  
  -- Check documents user_profile_id backfill
  SELECT COUNT(*) INTO v_null_count 
  FROM documents 
  WHERE user_id IS NOT NULL AND user_profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'documents: % rows with user_id but no user_profile_id', v_null_count;
  ELSE
    RAISE NOTICE 'documents.user_profile_id: backfill complete';
  END IF;
  
  -- Check documents created_by_profile_id backfill
  SELECT COUNT(*) INTO v_null_count 
  FROM documents 
  WHERE created_by IS NOT NULL AND created_by_profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'documents: % rows with created_by but no created_by_profile_id', v_null_count;
  ELSE
    RAISE NOTICE 'documents.created_by_profile_id: backfill complete';
  END IF;
  
  -- Check transactions_v2 voided_by_profile_id
  SELECT COUNT(*) INTO v_null_count 
  FROM transactions_v2 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  IF v_null_count > 0 THEN
    RAISE WARNING 'transactions_v2: % rows with voided_by but no voided_by_profile_id', v_null_count;
  ELSE
    RAISE NOTICE 'transactions_v2.voided_by_profile_id: backfill complete';
  END IF;
  
  RAISE NOTICE '=== All constraint validations complete ===';
END $$;
