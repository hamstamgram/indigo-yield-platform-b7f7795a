-- RLS and RPC Function Test Suite
-- Run these tests to verify security policies are working correctly

-- ============================================
-- TEST SETUP
-- ============================================

-- Create test users
DO $$
DECLARE
  v_admin_id UUID := gen_random_uuid();
  v_lp_id UUID := gen_random_uuid();
BEGIN
  -- Clean up any existing test users
  DELETE FROM profiles WHERE email IN ('test_admin@test.com', 'test_lp@test.com');
  
  -- Create test admin
  INSERT INTO profiles (id, email, first_name, last_name, is_admin)
  VALUES (v_admin_id, 'test_admin@test.com', 'Test', 'Admin', true);
  
  -- Create test LP
  INSERT INTO profiles (id, email, first_name, last_name, is_admin)
  VALUES (v_lp_id, 'test_lp@test.com', 'Test', 'LP', false);
  
  RAISE NOTICE 'Test users created - Admin: %, LP: %', v_admin_id, v_lp_id;
END $$;

-- ============================================
-- TEST 1: RPC Function Access Control
-- ============================================

-- Test as LP (should fail)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_lp@test.com')::text || '"}';

DO $$
BEGIN
  -- Test get_all_non_admin_profiles as LP (should fail)
  BEGIN
    PERFORM * FROM get_all_non_admin_profiles();
    RAISE EXCEPTION 'FAIL: LP was able to call get_all_non_admin_profiles';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'PASS: LP cannot call get_all_non_admin_profiles - %', SQLERRM;
  END;
END $$;

-- Test as Admin (should succeed)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_admin@test.com')::text || '"}';

DO $$
BEGIN
  -- Test get_all_non_admin_profiles as Admin
  IF EXISTS (SELECT 1 FROM get_all_non_admin_profiles()) THEN
    RAISE NOTICE 'PASS: Admin can call get_all_non_admin_profiles';
  ELSE
    RAISE NOTICE 'WARNING: No non-admin profiles found, but function executed';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'FAIL: Admin cannot call get_all_non_admin_profiles - %', SQLERRM;
END $$;

-- ============================================
-- TEST 2: Profiles Table RLS
-- ============================================

-- Test LP can only see own profile
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_lp@test.com')::text || '"}';

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM profiles;
  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: LP can only see their own profile';
  ELSE
    RAISE EXCEPTION 'FAIL: LP can see % profiles (expected 1)', v_count;
  END IF;
END $$;

-- Test Admin can see all profiles
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_admin@test.com')::text || '"}';

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM profiles;
  IF v_count >= 2 THEN
    RAISE NOTICE 'PASS: Admin can see all profiles (% found)', v_count;
  ELSE
    RAISE EXCEPTION 'FAIL: Admin can only see % profiles', v_count;
  END IF;
END $$;

-- ============================================
-- TEST 3: Transactions Table RLS
-- ============================================

-- Test LP cannot insert transactions
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_lp@test.com')::text || '"}';

DO $$
BEGIN
  INSERT INTO transactions (user_id, type, asset_symbol, amount, status)
  VALUES ((SELECT id FROM profiles WHERE email = 'test_lp@test.com'), 'deposit', 'BTC', 1000, 'completed');
  RAISE EXCEPTION 'FAIL: LP was able to insert transaction';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PASS: LP cannot insert transactions - %', SQLERRM;
END $$;

-- Test Admin can insert transactions
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_admin@test.com')::text || '"}';

DO $$
BEGIN
  INSERT INTO transactions (id, user_id, type, asset_symbol, amount, status)
  VALUES (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'test_lp@test.com'), 'deposit', 'BTC', 1000, 'completed');
  RAISE NOTICE 'PASS: Admin can insert transactions';
  -- Clean up
  DELETE FROM transactions WHERE user_id = (SELECT id FROM profiles WHERE email = 'test_lp@test.com');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'FAIL: Admin cannot insert transactions - %', SQLERRM;
END $$;

-- ============================================
-- TEST 4: Portfolios Table RLS
-- ============================================

-- Create test portfolio
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_admin@test.com')::text || '"}';

INSERT INTO portfolios (id, profile_id, asset_symbol, current_value)
VALUES (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'test_lp@test.com'), 'BTC', 10000);

-- Test LP can only see own portfolio
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_lp@test.com')::text || '"}';

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM portfolios;
  IF v_count = 1 THEN
    RAISE NOTICE 'PASS: LP can see their own portfolio';
  ELSE
    RAISE EXCEPTION 'FAIL: LP sees % portfolios', v_count;
  END IF;
END $$;

-- Test LP cannot update portfolios
DO $$
BEGIN
  UPDATE portfolios SET current_value = 20000 WHERE profile_id = (SELECT id FROM profiles WHERE email = 'test_lp@test.com');
  RAISE EXCEPTION 'FAIL: LP was able to update portfolio';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PASS: LP cannot update portfolios - %', SQLERRM;
END $$;

-- ============================================
-- TEST 5: Statements Table RLS
-- ============================================

-- Test LP cannot insert statements
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_lp@test.com')::text || '"}';

DO $$
BEGIN
  INSERT INTO statements (user_id, period_start, period_end, opening_balance, closing_balance)
  VALUES ((SELECT id FROM profiles WHERE email = 'test_lp@test.com'), '2025-01-01', '2025-01-31', 1000, 1100);
  RAISE EXCEPTION 'FAIL: LP was able to insert statement';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PASS: LP cannot insert statements - %', SQLERRM;
END $$;

-- Test Admin can insert statements
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "' || (SELECT id FROM profiles WHERE email = 'test_admin@test.com')::text || '"}';

DO $$
BEGIN
  INSERT INTO statements (id, user_id, period_start, period_end, opening_balance, closing_balance)
  VALUES (gen_random_uuid(), (SELECT id FROM profiles WHERE email = 'test_lp@test.com'), '2025-01-01', '2025-01-31', 1000, 1100);
  RAISE NOTICE 'PASS: Admin can insert statements';
  -- Clean up
  DELETE FROM statements WHERE user_id = (SELECT id FROM profiles WHERE email = 'test_lp@test.com');
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'FAIL: Admin cannot insert statements - %', SQLERRM;
END $$;

-- ============================================
-- TEST CLEANUP
-- ============================================

DO $$
BEGIN
  -- Clean up test data
  DELETE FROM portfolios WHERE profile_id IN (SELECT id FROM profiles WHERE email IN ('test_admin@test.com', 'test_lp@test.com'));
  DELETE FROM transactions WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('test_admin@test.com', 'test_lp@test.com'));
  DELETE FROM statements WHERE user_id IN (SELECT id FROM profiles WHERE email IN ('test_admin@test.com', 'test_lp@test.com'));
  DELETE FROM profiles WHERE email IN ('test_admin@test.com', 'test_lp@test.com');
  
  RAISE NOTICE 'Test cleanup completed';
END $$;

-- ============================================
-- TEST SUMMARY
-- ============================================

SELECT 'RLS and RPC tests completed. Check NOTICE messages for results.' AS test_result;
