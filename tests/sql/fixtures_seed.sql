-- ============================================================================
-- FIXTURES SEED: Deterministic Test Data for Verification Program
-- Fortune-500 Grade Go-Live Certification
-- ============================================================================
-- 
-- This script creates a deterministic, repeatable test dataset for the
-- verification program. All IDs are explicit UUIDs for predictable testing.
--
-- USAGE: Run this BEFORE any test files to establish baseline data.
-- ============================================================================

-- Cleanup any existing test data (idempotent)
DO $$
BEGIN
  -- Delete in correct order to respect foreign keys
  DELETE FROM yield_investor_events WHERE distribution_id IN (
    SELECT id FROM yield_distributions WHERE fund_id IN (
      SELECT id FROM funds WHERE code LIKE 'TEST-%'
    )
  );
  DELETE FROM fee_allocations WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM yield_distributions WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM transactions_v2 WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM investor_positions WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM fund_daily_aum WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM fund_aum_events WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM withdrawal_requests WHERE fund_id IN (
    SELECT id FROM funds WHERE code LIKE 'TEST-%'
  );
  DELETE FROM funds WHERE code LIKE 'TEST-%';
  DELETE FROM profiles WHERE email LIKE 'test_inv_%@test.local';
  DELETE FROM profiles WHERE email = 'test_admin@test.local';
  
  RAISE NOTICE 'Cleaned up existing test data';
END $$;

-- ============================================================================
-- SECTION 1: Test Profiles (Admin + 3 Investors)
-- ============================================================================

-- Test Admin (will be used as actor for all mutations)
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_admin, 
  status,
  created_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'test_admin@test.local',
  'Test',
  'Admin',
  'admin',
  true,
  'active',
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  is_admin = true;

-- Test Investor 1 (Early depositor)
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_admin, 
  status,
  created_at
) VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'test_inv_001@test.local',
  'Alice',
  'Investor',
  'investor',
  false,
  'active',
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email;

-- Test Investor 2 (Mid-month depositor)
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_admin, 
  status,
  created_at
) VALUES (
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'test_inv_002@test.local',
  'Bob',
  'Investor',
  'investor',
  false,
  'active',
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email;

-- Test Investor 3 (Withdrawal tester)
INSERT INTO profiles (
  id, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_admin, 
  status,
  created_at
) VALUES (
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'test_inv_003@test.local',
  'Charlie',
  'Investor',
  'investor',
  false,
  'active',
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email;

RAISE NOTICE 'Created test profiles: 1 admin, 3 investors';

-- ============================================================================
-- SECTION 2: Test Funds (BTC and ETH)
-- ============================================================================

-- Test BTC Fund
INSERT INTO funds (
  id,
  code,
  name,
  asset,
  fund_class,
  status,
  inception_date,
  min_investment,
  perf_fee_bps,
  created_at
) VALUES (
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'TEST-BTC',
  'Test Bitcoin Fund',
  'BTC',
  'A',
  'active',
  '2025-01-01',
  0.001,
  3000,  -- 30% performance fee
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code;

-- Test ETH Fund
INSERT INTO funds (
  id,
  code,
  name,
  asset,
  fund_class,
  status,
  inception_date,
  min_investment,
  perf_fee_bps,
  created_at
) VALUES (
  'f0000000-0000-0000-0000-000000000002'::uuid,
  'TEST-ETH',
  'Test Ethereum Fund',
  'ETH',
  'A',
  'active',
  '2025-01-01',
  0.01,
  3000,  -- 30% performance fee
  '2025-01-01 00:00:00+00'
) ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code;

RAISE NOTICE 'Created test funds: TEST-BTC, TEST-ETH';

-- ============================================================================
-- SECTION 3: Baseline AUM Records
-- ============================================================================

-- Create baseline AUM for BTC fund (before any deposits)
INSERT INTO fund_daily_aum (
  id,
  fund_id,
  aum_date,
  total_aum,
  purpose,
  source,
  is_voided,
  created_by,
  created_at
) VALUES (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01',
  0,
  'transaction',
  'fixtures_seed',
  false,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 00:00:00+00'
) ON CONFLICT DO NOTHING;

-- Create baseline AUM for ETH fund
INSERT INTO fund_daily_aum (
  id,
  fund_id,
  aum_date,
  total_aum,
  purpose,
  source,
  is_voided,
  created_by,
  created_at
) VALUES (
  'd0000000-0000-0000-0000-000000000002'::uuid,
  'f0000000-0000-0000-0000-000000000002'::uuid,
  '2026-01-01',
  0,
  'transaction',
  'fixtures_seed',
  false,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 00:00:00+00'
) ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created baseline AUM records';

-- ============================================================================
-- SECTION 4: Initial Deposits (Day 1)
-- ============================================================================

-- Investor 1 deposits 1.0 BTC on Day 1
INSERT INTO transactions_v2 (
  id,
  investor_id,
  fund_id,
  type,
  amount,
  tx_date,
  source,
  reference_id,
  notes,
  created_by,
  created_at,
  is_voided
) VALUES (
  't0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'DEPOSIT',
  1.0,
  '2026-01-01',
  'fixtures_seed',
  'SEED-DEP-001',
  'Initial deposit - Investor 1',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 09:00:00+00',
  false
) ON CONFLICT (reference_id) DO NOTHING;

-- Investor 3 deposits 2.0 BTC on Day 1 (will be used for withdrawal test)
INSERT INTO transactions_v2 (
  id,
  investor_id,
  fund_id,
  type,
  amount,
  tx_date,
  source,
  reference_id,
  notes,
  created_by,
  created_at,
  is_voided
) VALUES (
  't0000000-0000-0000-0000-000000000002'::uuid,
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'DEPOSIT',
  2.0,
  '2026-01-01',
  'fixtures_seed',
  'SEED-DEP-002',
  'Initial deposit - Investor 3',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 10:00:00+00',
  false
) ON CONFLICT (reference_id) DO NOTHING;

-- Investor 1 deposits 5.0 ETH on Day 1
INSERT INTO transactions_v2 (
  id,
  investor_id,
  fund_id,
  type,
  amount,
  tx_date,
  source,
  reference_id,
  notes,
  created_by,
  created_at,
  is_voided
) VALUES (
  't0000000-0000-0000-0000-000000000003'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'f0000000-0000-0000-0000-000000000002'::uuid,
  'DEPOSIT',
  5.0,
  '2026-01-01',
  'fixtures_seed',
  'SEED-DEP-003',
  'Initial ETH deposit - Investor 1',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 11:00:00+00',
  false
) ON CONFLICT (reference_id) DO NOTHING;

RAISE NOTICE 'Created Day 1 deposits';

-- ============================================================================
-- SECTION 5: Mid-Month Deposits (Day 15)
-- ============================================================================

-- Investor 2 deposits 0.5 BTC on Day 15
INSERT INTO transactions_v2 (
  id,
  investor_id,
  fund_id,
  type,
  amount,
  tx_date,
  source,
  reference_id,
  notes,
  created_by,
  created_at,
  is_voided
) VALUES (
  't0000000-0000-0000-0000-000000000004'::uuid,
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  'DEPOSIT',
  0.5,
  '2026-01-15',
  'fixtures_seed',
  'SEED-DEP-004',
  'Mid-month deposit - Investor 2',
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-15 09:00:00+00',
  false
) ON CONFLICT (reference_id) DO NOTHING;

RAISE NOTICE 'Created Day 15 deposits';

-- ============================================================================
-- SECTION 6: Update AUM to reflect deposits
-- ============================================================================

-- BTC Fund AUM after Day 1 deposits (1.0 + 2.0 = 3.0 BTC)
INSERT INTO fund_daily_aum (
  id,
  fund_id,
  aum_date,
  total_aum,
  purpose,
  source,
  is_voided,
  created_by,
  created_at
) VALUES (
  'd0000000-0000-0000-0000-000000000003'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01',
  3.0,
  'reporting',
  'fixtures_seed',
  false,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 12:00:00+00'
) ON CONFLICT DO NOTHING;

-- BTC Fund AUM after Day 15 deposit (3.0 + 0.5 = 3.5 BTC)
INSERT INTO fund_daily_aum (
  id,
  fund_id,
  aum_date,
  total_aum,
  purpose,
  source,
  is_voided,
  created_by,
  created_at
) VALUES (
  'd0000000-0000-0000-0000-000000000004'::uuid,
  'f0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-15',
  3.5,
  'transaction',
  'fixtures_seed',
  false,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-15 12:00:00+00'
) ON CONFLICT DO NOTHING;

-- ETH Fund AUM after Day 1 deposit (5.0 ETH)
INSERT INTO fund_daily_aum (
  id,
  fund_id,
  aum_date,
  total_aum,
  purpose,
  source,
  is_voided,
  created_by,
  created_at
) VALUES (
  'd0000000-0000-0000-0000-000000000005'::uuid,
  'f0000000-0000-0000-0000-000000000002'::uuid,
  '2026-01-01',
  5.0,
  'reporting',
  'fixtures_seed',
  false,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  '2026-01-01 12:00:00+00'
) ON CONFLICT DO NOTHING;

RAISE NOTICE 'Created AUM snapshots';

-- ============================================================================
-- SECTION 7: Initialize Investor Positions (via canonical recompute)
-- ============================================================================

-- Positions should be created by triggers, but ensure they exist
DO $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
BEGIN
  -- Recompute all test positions
  FOR v_investor_id, v_fund_id IN 
    SELECT DISTINCT investor_id, fund_id 
    FROM transactions_v2 
    WHERE fund_id IN (
      'f0000000-0000-0000-0000-000000000001'::uuid,
      'f0000000-0000-0000-0000-000000000002'::uuid
    )
  LOOP
    -- Set canonical bypass
    PERFORM set_config('app.canonical_rpc', 'true', true);
    
    -- Ensure position exists
    INSERT INTO investor_positions (investor_id, fund_id, shares, current_value, cost_basis, created_at, updated_at)
    VALUES (v_investor_id, v_fund_id, 0, 0, 0, now(), now())
    ON CONFLICT (investor_id, fund_id) DO NOTHING;
    
    -- Clear bypass
    PERFORM set_config('app.canonical_rpc', '', true);
  END LOOP;
  
  RAISE NOTICE 'Initialized investor positions';
END $$;

-- ============================================================================
-- SECTION 8: Verify Seed Data
-- ============================================================================

DO $$
DECLARE
  v_admin_count int;
  v_investor_count int;
  v_fund_count int;
  v_tx_count int;
  v_aum_count int;
BEGIN
  SELECT COUNT(*) INTO v_admin_count FROM profiles WHERE email = 'test_admin@test.local' AND is_admin = true;
  SELECT COUNT(*) INTO v_investor_count FROM profiles WHERE email LIKE 'test_inv_%@test.local';
  SELECT COUNT(*) INTO v_fund_count FROM funds WHERE code LIKE 'TEST-%';
  SELECT COUNT(*) INTO v_tx_count FROM transactions_v2 WHERE reference_id LIKE 'SEED-%';
  SELECT COUNT(*) INTO v_aum_count FROM fund_daily_aum WHERE source = 'fixtures_seed';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== FIXTURES SEED SUMMARY ===';
  RAISE NOTICE 'Admins: %', v_admin_count;
  RAISE NOTICE 'Investors: %', v_investor_count;
  RAISE NOTICE 'Funds: %', v_fund_count;
  RAISE NOTICE 'Transactions: %', v_tx_count;
  RAISE NOTICE 'AUM Records: %', v_aum_count;
  RAISE NOTICE '=============================';
  
  -- Validate minimum requirements
  IF v_admin_count < 1 THEN
    RAISE EXCEPTION 'SEED FAIL: Missing admin';
  END IF;
  IF v_investor_count < 3 THEN
    RAISE EXCEPTION 'SEED FAIL: Missing investors (expected 3, got %)', v_investor_count;
  END IF;
  IF v_fund_count < 2 THEN
    RAISE EXCEPTION 'SEED FAIL: Missing funds (expected 2, got %)', v_fund_count;
  END IF;
  
  RAISE NOTICE 'SEED COMPLETE: All fixtures created successfully';
END $$;
