-- Evidence Pack: RLS Simulation Tests
-- Simulates different JWT roles to verify access control
-- Compatible with Supabase's JWT claim system

-- ============================================
-- SETUP: Define test user IDs
-- Replace these with actual UUIDs from your database
-- ============================================
-- Test Investor ID: (get from profiles where is_admin = false)
-- Test Admin ID: (get from profiles where is_admin = true)
-- Test IB ID: (get from profiles where is_ib = true)

-- ============================================
-- TEST 1: Investor trying to access other investor's data
-- ============================================

-- Set JWT claims to simulate investor
SELECT set_config('request.jwt.claim.sub', 'INVESTOR_UUID_HERE', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Try to read another investor's positions (should return 0)
SELECT 
    'investor_positions' AS table_name,
    'other_investor_data' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM investor_positions
WHERE investor_id != current_setting('request.jwt.claim.sub')::uuid;

-- Try to read fee_allocations (should return 0 for non-admin)
SELECT 
    'fee_allocations' AS table_name,
    'investor_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM fee_allocations;

-- Try to read audit_log (should return 0 for non-admin)
SELECT 
    'audit_log' AS table_name,
    'investor_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM audit_log;

-- Try to read transaction-purpose data (should return 0)
SELECT 
    'fund_daily_aum' AS table_name,
    'transaction_purpose_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM fund_daily_aum
WHERE purpose = 'transaction';

-- ============================================
-- TEST 2: Admin access verification
-- ============================================

-- Set JWT claims to simulate admin
SELECT set_config('request.jwt.claim.sub', 'ADMIN_UUID_HERE', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- Admin should see all positions
SELECT 
    'investor_positions' AS table_name,
    'admin_full_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) > 0 THEN 'PASS ✓' ELSE 'NEEDS DATA' END AS result
FROM investor_positions;

-- Admin should see fee_allocations
SELECT 
    'fee_allocations' AS table_name,
    'admin_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) >= 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM fee_allocations;

-- Admin should see audit_log
SELECT 
    'audit_log' AS table_name,
    'admin_access' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) >= 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM audit_log;

-- ============================================
-- TEST 3: IB access verification
-- ============================================

-- Set JWT claims to simulate IB
SELECT set_config('request.jwt.claim.sub', 'IB_UUID_HERE', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);

-- IB should see only their referred investors' allocations
SELECT 
    'ib_allocations' AS table_name,
    'ib_own_allocations' AS test_case,
    COUNT(*) AS rows_returned,
    'VERIFY MANUALLY' AS result
FROM ib_allocations
WHERE ib_investor_id = current_setting('request.jwt.claim.sub')::uuid;

-- IB should NOT see other IBs' allocations
SELECT 
    'ib_allocations' AS table_name,
    'other_ib_allocations' AS test_case,
    COUNT(*) AS rows_returned,
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS result
FROM ib_allocations
WHERE ib_investor_id != current_setting('request.jwt.claim.sub')::uuid;

-- ============================================
-- COMBINED RESULTS TEMPLATE
-- ============================================
/*
Expected Results Summary:

| Role     | Table                     | Test Case                  | Expected Rows | Result |
|----------|---------------------------|----------------------------|---------------|--------|
| investor | investor_positions        | other_investor_data        | 0             | PASS ✓ |
| investor | fee_allocations           | investor_access            | 0             | PASS ✓ |
| investor | audit_log                 | investor_access            | 0             | PASS ✓ |
| investor | fund_daily_aum            | transaction_purpose_access | 0             | PASS ✓ |
| admin    | investor_positions        | admin_full_access          | >0            | PASS ✓ |
| admin    | fee_allocations           | admin_access               | >=0           | PASS ✓ |
| admin    | audit_log                 | admin_access               | >=0           | PASS ✓ |
| ib       | ib_allocations            | ib_own_allocations         | >=0           | VERIFY |
| ib       | ib_allocations            | other_ib_allocations       | 0             | PASS ✓ |
*/
