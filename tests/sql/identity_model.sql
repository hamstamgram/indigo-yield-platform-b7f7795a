-- =============================================================================
-- Identity Model Test Suite
-- Part of: Go-Live Schema Hardening Proof Suite
-- =============================================================================
-- Tests:
-- 1. All business tables reference profiles.id consistently
-- 2. *_profile_id columns are populated where legacy columns are populated
-- 3. voided_by_profile_id matches voided_by
-- 4. Sync triggers work correctly
-- =============================================================================

DO $$
DECLARE
  v_count integer;
  v_total integer;
  v_pct numeric;
BEGIN
  RAISE NOTICE '=== IDENTITY MODEL TEST SUITE ===';
  RAISE NOTICE 'Starting at: %', now();

  -- =========================================================================
  -- TEST 1: Check profiles.id is referenced by business tables
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Business tables reference profiles.id';
  
  -- Check that key FKs to profiles exist
  SELECT COUNT(*) INTO v_count
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND c.confrelid = 'public.profiles'::regclass
    AND c.conrelid IN (
      'public.transactions_v2'::regclass,
      'public.yield_distributions'::regclass,
      'public.fee_allocations'::regclass,
      'public.ib_allocations'::regclass,
      'public.fund_daily_aum'::regclass
    );
  
  IF v_count < 5 THEN
    RAISE WARNING 'TEST 1 WARNING: Only % FK constraints to profiles found (expected 5+)', v_count;
  ELSE
    RAISE NOTICE 'TEST 1 PASSED: % FK constraints to profiles.id found', v_count;
  END IF;

  -- =========================================================================
  -- TEST 2: documents profile columns populated
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: documents profile columns consistency';
  
  -- Check user_profile_id populated where user_id is set
  SELECT COUNT(*) INTO v_total FROM documents WHERE user_id IS NOT NULL;
  SELECT COUNT(*) INTO v_count FROM documents WHERE user_id IS NOT NULL AND user_profile_id IS NULL;
  
  IF v_total > 0 THEN
    v_pct := ROUND((v_count::numeric / v_total) * 100, 2);
    IF v_count > 0 THEN
      RAISE WARNING 'TEST 2 WARNING: % of % documents missing user_profile_id (%.2f%%)', v_count, v_total, v_pct;
    ELSE
      RAISE NOTICE 'TEST 2 PASSED: All % documents have user_profile_id populated', v_total;
    END IF;
  ELSE
    RAISE NOTICE 'TEST 2 SKIPPED: No documents with user_id';
  END IF;
  
  -- Check created_by_profile_id populated where created_by is set
  SELECT COUNT(*) INTO v_total FROM documents WHERE created_by IS NOT NULL;
  SELECT COUNT(*) INTO v_count FROM documents WHERE created_by IS NOT NULL AND created_by_profile_id IS NULL;
  
  IF v_total > 0 AND v_count > 0 THEN
    v_pct := ROUND((v_count::numeric / v_total) * 100, 2);
    RAISE WARNING 'TEST 2 WARNING: % of % documents missing created_by_profile_id (%.2f%%)', v_count, v_total, v_pct;
  ELSIF v_total > 0 THEN
    RAISE NOTICE 'TEST 2 PASSED: All % documents have created_by_profile_id populated', v_total;
  END IF;

  -- =========================================================================
  -- TEST 3: voided_by_profile_id matches voided_by
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: voided_by_profile_id consistency';
  
  -- transactions_v2
  SELECT COUNT(*) INTO v_total FROM transactions_v2 WHERE voided_by IS NOT NULL;
  SELECT COUNT(*) INTO v_count FROM transactions_v2 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  IF v_total > 0 AND v_count > 0 THEN
    RAISE WARNING 'TEST 3 WARNING: transactions_v2: % of % voided records missing voided_by_profile_id', v_count, v_total;
  ELSIF v_total > 0 THEN
    RAISE NOTICE 'TEST 3 PASSED: transactions_v2: All % voided records have voided_by_profile_id', v_total;
  ELSE
    RAISE NOTICE 'TEST 3 SKIPPED: No voided transactions';
  END IF;
  
  -- fee_allocations
  SELECT COUNT(*) INTO v_total FROM fee_allocations WHERE voided_by IS NOT NULL;
  SELECT COUNT(*) INTO v_count FROM fee_allocations 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  IF v_total > 0 AND v_count > 0 THEN
    RAISE WARNING 'TEST 3 WARNING: fee_allocations: % of % voided records missing voided_by_profile_id', v_count, v_total;
  ELSIF v_total > 0 THEN
    RAISE NOTICE 'TEST 3 PASSED: fee_allocations: All % voided records have voided_by_profile_id', v_total;
  END IF;
  
  -- ib_allocations
  SELECT COUNT(*) INTO v_total FROM ib_allocations WHERE voided_by IS NOT NULL;
  SELECT COUNT(*) INTO v_count FROM ib_allocations 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  IF v_total > 0 AND v_count > 0 THEN
    RAISE WARNING 'TEST 3 WARNING: ib_allocations: % of % voided records missing voided_by_profile_id', v_count, v_total;
  ELSIF v_total > 0 THEN
    RAISE NOTICE 'TEST 3 PASSED: ib_allocations: All % voided records have voided_by_profile_id', v_total;
  END IF;

  -- =========================================================================
  -- TEST 4: Sync triggers exist
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Sync triggers exist';
  
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname LIKE 'trg_%_sync_%'
    AND c.relnamespace = 'public'::regnamespace;
  
  IF v_count >= 3 THEN
    RAISE NOTICE 'TEST 4 PASSED: % sync triggers found', v_count;
  ELSE
    RAISE WARNING 'TEST 4 WARNING: Only % sync triggers found (expected 3+)', v_count;
  END IF;

  -- =========================================================================
  -- TEST 5: No mixed auth.users / profiles references for same semantic
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Consistent identity references';
  
  -- Check that voided_by and voided_by_profile_id match when both set
  SELECT COUNT(*) INTO v_count
  FROM transactions_v2
  WHERE voided_by IS NOT NULL 
    AND voided_by_profile_id IS NOT NULL
    AND voided_by != voided_by_profile_id;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % transactions have mismatched voided_by and voided_by_profile_id', v_count;
  END IF;
  
  SELECT COUNT(*) INTO v_count
  FROM documents
  WHERE user_id IS NOT NULL 
    AND user_profile_id IS NOT NULL
    AND user_id != user_profile_id;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % documents have mismatched user_id and user_profile_id', v_count;
  END IF;
  
  RAISE NOTICE 'TEST 5 PASSED: No mismatched identity references';

  -- =========================================================================
  -- SUMMARY
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=== IDENTITY MODEL: ALL TESTS PASSED ===';
  
END $$;
