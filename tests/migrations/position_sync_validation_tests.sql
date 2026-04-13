-- Position Sync Validation Functions - Comprehensive Regression Tests
-- PS-2: Validate consolidation of AUM/position validation functions
--
-- Tests cover:
-- 1. Canonical function behavior with various tolerance levels
-- 2. Wrapper function behavior (strict, against_positions)
-- 3. Edge cases (zero positions, missing AUM, large discrepancies)
-- 4. Backward compatibility (old function names still work)

-- Test utility: Cleanup after each test
CREATE TEMPORARY FUNCTION cleanup_test_data() RETURNS VOID AS $$
DECLARE
  v_test_investor_ids UUID[];
  v_test_fund_ids UUID[];
BEGIN
  -- Cleanup logic will be called in each test's cleanup section
  NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TEST GROUP 1: Canonical Function - Basic Behavior
-- ============================================================================

DO $$
DECLARE
  v_investor_id UUID := '11111111-1111-1111-1111-111111111111'::UUID;
  v_fund_id UUID := '22222222-2222-2222-2222-222222222222'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
  v_tolerance_pct NUMERIC;
BEGIN
  -- Setup: Create investor, fund, position
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test1@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 1', 'TST1', 'TST1', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 1000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 1000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 1000.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 1000.00, updated_at = NOW();

  -- TEST: Position and AUM match exactly
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF v_is_valid THEN
    RAISE NOTICE 'PASS [T1.1]: validate_aum_matches_positions returns true when AUM matches positions';
  ELSE
    RAISE EXCEPTION 'FAIL [T1.1]: Expected valid=true, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- TEST 1.2: Canonical function detects mismatches with lenient tolerance
DO $$
DECLARE
  v_investor_id UUID := '33333333-3333-3333-3333-333333333333'::UUID;
  v_fund_id UUID := '44444444-4444-4444-4444-444444444444'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup: Create investor, fund, position
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test2@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 2', 'TST2', 'TST2', NOW())
    ON CONFLICT (id) DO NOTHING;

  -- Create 2% mismatch: position=1000, AUM=980 (2% variance)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 1000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 1000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 980.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 980.00, updated_at = NOW();

  -- TEST: 2% variance exceeds 1% tolerance (should fail)
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF NOT v_is_valid THEN
    RAISE NOTICE 'PASS [T1.2]: validate_aum_matches_positions returns false when variance exceeds tolerance';
  ELSE
    RAISE EXCEPTION 'FAIL [T1.2]: Expected valid=false (2%% variance > 1%% tolerance), got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- TEST 1.3: Canonical function with strict=true flag rejects any variance
DO $$
DECLARE
  v_investor_id UUID := '55555555-5555-5555-5555-555555555555'::UUID;
  v_fund_id UUID := '66666666-6666-6666-6666-666666666666'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup: Create investor, fund, position
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test3@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 3', 'TST3', 'TST3', NOW())
    ON CONFLICT (id) DO NOTHING;

  -- Create 0.01% mismatch: position=10000, AUM=9999 (0.01% variance)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 10000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 10000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 9999.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 9999.00, updated_at = NOW();

  -- TEST: Strict mode should reject even 0.01% variance
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose, true);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF NOT v_is_valid THEN
    RAISE NOTICE 'PASS [T1.3]: validate_aum_matches_positions with strict=true rejects tiny variance';
  ELSE
    RAISE EXCEPTION 'FAIL [T1.3]: Expected valid=false in strict mode, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- ============================================================================
-- TEST GROUP 2: Wrapper Functions
-- ============================================================================

-- TEST 2.1: validate_aum_matches_positions_strict wrapper works
DO $$
DECLARE
  v_investor_id UUID := '77777777-7777-7777-7777-777777777777'::UUID;
  v_fund_id UUID := '88888888-8888-8888-8888-888888888888'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test4@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 4', 'TST4', 'TST4', NOW())
    ON CONFLICT (id) DO NOTHING;

  -- Create exact match
  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 5000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 5000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 5000.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 5000.00, updated_at = NOW();

  -- TEST: Strict wrapper should accept exact match
  v_result := validate_aum_matches_positions_strict(v_fund_id, CURRENT_DATE, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF v_is_valid THEN
    RAISE NOTICE 'PASS [T2.1]: validate_aum_matches_positions_strict wrapper works correctly';
  ELSE
    RAISE EXCEPTION 'FAIL [T2.1]: Expected valid=true for exact match in strict mode, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- TEST 2.2: validate_aum_against_positions wrapper works
DO $$
DECLARE
  v_investor_id UUID := '99999999-9999-9999-9999-999999999999'::UUID;
  v_fund_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
  v_deviation_pct NUMERIC;
BEGIN
  -- Setup
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test5@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 5', 'TST5', 'TST5', NOW())
    ON CONFLICT (id) DO NOTHING;

  -- Create position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 1000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 1000.00, updated_at = NOW();

  -- TEST: Check AUM value against position sum (5% deviation, 10% max allowed)
  v_result := validate_aum_against_positions(v_fund_id, 950.00, 0.10);
  v_is_valid := (v_result->>'valid')::BOOLEAN;
  v_deviation_pct := (v_result->>'deviation_pct')::NUMERIC;

  IF v_is_valid AND v_deviation_pct <= 0.10 THEN
    RAISE NOTICE 'PASS [T2.2]: validate_aum_against_positions wrapper calculates deviation correctly';
  ELSE
    RAISE EXCEPTION 'FAIL [T2.2]: Expected valid=true with 5%% deviation <= 10%% max, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- ============================================================================
-- TEST GROUP 3: Edge Cases
-- ============================================================================

-- TEST 3.1: Empty fund (no positions) returns valid
DO $$
DECLARE
  v_fund_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup: Fund with no positions
  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Empty Fund', 'EMPTY', 'EMPTY', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 0.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 0.00, updated_at = NOW();

  -- TEST: Empty fund with zero AUM should be valid
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF v_is_valid THEN
    RAISE NOTICE 'PASS [T3.1]: Empty fund (zero positions, zero AUM) is valid';
  ELSE
    RAISE EXCEPTION 'FAIL [T3.1]: Expected valid=true for zero/zero, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
END $$;

-- TEST 3.2: AUM recorded but no positions
DO $$
DECLARE
  v_fund_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup: Fund with AUM but no positions
  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Orphan Fund', 'ORPH', 'ORPH', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 1000.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 1000.00, updated_at = NOW();

  -- TEST: Should detect mismatch (AUM=1000, positions=0)
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF NOT v_is_valid THEN
    RAISE NOTICE 'PASS [T3.2]: Detects mismatch when AUM > 0 but positions = 0';
  ELSE
    RAISE EXCEPTION 'FAIL [T3.2]: Expected valid=false for AUM without positions, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
END $$;

-- TEST 3.3: Large discrepancy is detected
DO $$
DECLARE
  v_investor_id UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd'::UUID;
  v_fund_id UUID := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::UUID;
  v_result JSONB;
  v_is_valid BOOLEAN;
BEGIN
  -- Setup
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test6@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 6', 'TST6', 'TST6', NOW())
    ON CONFLICT (id) DO NOTHING;

  -- Create 50% discrepancy (position=1000, AUM=500)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 1000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 1000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 500.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 500.00, updated_at = NOW();

  -- TEST: Large discrepancy should definitely fail
  v_result := validate_aum_matches_positions(v_fund_id, CURRENT_DATE, 1.0, 'reporting'::aum_purpose);
  v_is_valid := (v_result->>'valid')::BOOLEAN;

  IF NOT v_is_valid THEN
    RAISE NOTICE 'PASS [T3.3]: Large 50%% discrepancy is detected';
  ELSE
    RAISE EXCEPTION 'FAIL [T3.3]: Expected valid=false for large discrepancy, got: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- ============================================================================
-- TEST GROUP 4: Backward Compatibility
-- ============================================================================

-- TEST 4.1: Old function names still exist
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  -- Check that validate_aum_matches_positions_strict exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_name = 'validate_aum_matches_positions_strict'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE 'PASS [T4.1]: validate_aum_matches_positions_strict still exists';
  ELSE
    RAISE EXCEPTION 'FAIL [T4.1]: validate_aum_matches_positions_strict was dropped';
  END IF;
END $$;

-- TEST 4.2: Old function signatures work unchanged
DO $$
DECLARE
  v_investor_id UUID := 'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID;
  v_fund_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
  v_result JSONB;
BEGIN
  -- Setup
  INSERT INTO profiles (id, email, role, account_type, created_at)
    VALUES (v_investor_id, 'test7@example.com', 'investor', 'investor', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO funds (id, name, code, symbol, created_at)
    VALUES (v_fund_id, 'Test Fund 7', 'TST7', 'TST7', NOW())
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 2000.00, NOW(), NOW())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET current_value = 2000.00, updated_at = NOW();

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_at)
    VALUES (v_fund_id, CURRENT_DATE, 2000.00, 'reporting', NOW())
    ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET total_aum = 2000.00, updated_at = NOW();

  -- TEST: Call old function signature (should still work)
  v_result := validate_aum_matches_positions(
    p_fund_id := v_fund_id,
    p_aum_date := CURRENT_DATE,
    p_tolerance_pct := 1.0,
    p_purpose := 'reporting'::aum_purpose
  );

  IF (v_result->>'valid')::BOOLEAN THEN
    RAISE NOTICE 'PASS [T4.2]: Old function signature works unchanged';
  ELSE
    RAISE EXCEPTION 'FAIL [T4.2]: Old signature failed: %', v_result;
  END IF;

  -- Cleanup
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========== TEST SUMMARY ==========';
  RAISE NOTICE 'All position sync validation tests completed';
  RAISE NOTICE 'If you see PASSes above, consolidation was successful';
  RAISE NOTICE 'If you see any FAILs, review the error and fix before committing';
  RAISE NOTICE '==================================';
END $$;
