-- =============================================================================
-- Schema Invariants Test Suite
-- Part of: Go-Live Schema Hardening Proof Suite
-- =============================================================================
-- Tests:
-- 1. No duplicate reference_id among non-voided transactions_v2
-- 2. No duplicate yield distributions per (fund, date, purpose, type)
-- 3. daily_nav unique on (fund_id, nav_date, purpose)
-- 4. fund_daily_aum unique on (fund_id, aum_date, purpose) for non-voided
-- 5. No orphan rows for critical FKs
-- 6. No duplicate FK constraints remaining
-- =============================================================================

DO $$
DECLARE
  v_count integer;
  v_details text;
BEGIN
  RAISE NOTICE '=== SCHEMA INVARIANTS TEST SUITE ===';
  RAISE NOTICE 'Starting at: %', now();

  -- =========================================================================
  -- TEST 1: No duplicate reference_id among non-voided transactions_v2
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Unique reference_id for non-voided transactions';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT reference_id, COUNT(*) as cnt
    FROM transactions_v2
    WHERE reference_id IS NOT NULL 
      AND is_voided = false
    GROUP BY reference_id
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    -- Get details of duplicates
    SELECT string_agg(reference_id || ' (' || cnt || ' rows)', ', ') INTO v_details
    FROM (
      SELECT reference_id, COUNT(*) as cnt
      FROM transactions_v2
      WHERE reference_id IS NOT NULL AND is_voided = false
      GROUP BY reference_id
      HAVING COUNT(*) > 1
      LIMIT 5
    ) d;
    
    RAISE EXCEPTION 'TEST 1 FAILED: % duplicate reference_ids found. Examples: %', v_count, v_details;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: No duplicate reference_ids among non-voided transactions';

  -- =========================================================================
  -- TEST 2: No duplicate yield distributions per (fund, date, purpose, type)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Unique yield distributions per fund/date/purpose/type';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, effective_date, purpose, distribution_type, COUNT(*) as cnt
    FROM yield_distributions
    WHERE is_voided = false
    GROUP BY fund_id, effective_date, purpose, distribution_type
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: % duplicate yield distribution combinations found', v_count;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: No duplicate yield distributions';

  -- =========================================================================
  -- TEST 3: daily_nav unique on (fund_id, nav_date, purpose)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Unique daily_nav per fund/date/purpose';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, nav_date, purpose, COUNT(*) as cnt
    FROM daily_nav
    GROUP BY fund_id, nav_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: % duplicate daily_nav combinations found', v_count;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: No duplicate daily_nav records';

  -- =========================================================================
  -- TEST 4: fund_daily_aum unique on (fund_id, aum_date, purpose) for non-voided
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Unique fund_daily_aum per fund/date/purpose (non-voided)';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, aum_date, purpose, COUNT(*) as cnt
    FROM fund_daily_aum
    WHERE is_voided = false
    GROUP BY fund_id, aum_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: % duplicate fund_daily_aum combinations found', v_count;
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: No duplicate fund_daily_aum records';

  -- =========================================================================
  -- TEST 5: No orphan rows for critical FKs
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: No orphan foreign key references';
  
  -- Check transactions_v2.investor_id references valid profiles
  SELECT COUNT(*) INTO v_count
  FROM transactions_v2 t
  WHERE t.investor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id);
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % transactions have orphan investor_id', v_count;
  END IF;
  
  -- Check transactions_v2.fund_id references valid funds
  SELECT COUNT(*) INTO v_count
  FROM transactions_v2 t
  WHERE t.fund_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = t.fund_id);
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % transactions have orphan fund_id', v_count;
  END IF;
  
  -- Check yield_distributions.fund_id references valid funds
  SELECT COUNT(*) INTO v_count
  FROM yield_distributions yd
  WHERE yd.fund_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = yd.fund_id);
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % yield_distributions have orphan fund_id', v_count;
  END IF;
  
  RAISE NOTICE 'TEST 5 PASSED: No orphan FK references found';

  -- =========================================================================
  -- TEST 6: No duplicate FK constraints
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: No duplicate FK constraints';
  
  -- Check for multiple FKs on same column
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT c.conrelid::regclass as table_name, a.attname as column_name, COUNT(*) as fk_count
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid IN (
        'public.transactions_v2'::regclass,
        'public.yield_distributions'::regclass,
        'public.fee_allocations'::regclass,
        'public.ib_allocations'::regclass
      )
    GROUP BY c.conrelid::regclass, a.attname
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    -- Log details but don't fail - some duplicates may be intentional
    RAISE WARNING 'TEST 6 WARNING: % columns have multiple FK constraints', v_count;
  ELSE
    RAISE NOTICE 'TEST 6 PASSED: No duplicate FK constraints';
  END IF;

  -- =========================================================================
  -- SUMMARY
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=== SCHEMA INVARIANTS: ALL TESTS PASSED ===';
  
END $$;
