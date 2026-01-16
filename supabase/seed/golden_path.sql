-- ============================================================================
-- GOLDEN PATH SEED DATA
-- Purpose: Deterministic test data for smoke tests and CI
-- ============================================================================

-- Clear existing test data (safe to run multiple times)
DO $$
DECLARE
  v_test_investor_a uuid := '00000000-0000-0000-0000-000000000001';
  v_test_investor_b uuid := '00000000-0000-0000-0000-000000000002';
  v_test_admin uuid := '00000000-0000-0000-0000-000000000099';
BEGIN
  -- Delete test transactions
  DELETE FROM transactions_v2
  WHERE investor_id IN (v_test_investor_a, v_test_investor_b);

  -- Delete test positions
  DELETE FROM investor_positions
  WHERE investor_id IN (v_test_investor_a, v_test_investor_b);

  -- Delete test withdrawal requests
  DELETE FROM withdrawal_requests
  WHERE investor_id IN (v_test_investor_a, v_test_investor_b);

  -- Delete test profiles
  DELETE FROM profiles
  WHERE id IN (v_test_investor_a, v_test_investor_b, v_test_admin);

  -- Delete test investors
  DELETE FROM investors
  WHERE id IN (v_test_investor_a, v_test_investor_b);

  RAISE NOTICE 'Cleared existing golden path test data';
END;
$$;

-- ============================================================================
-- 1. Create test admin user
-- ============================================================================

INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  is_admin,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000099',
  'test-admin@indigo-test.local',
  'Test',
  'Admin',
  true,
  'Active'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Create test investors
-- ============================================================================

-- Investor A: Deposits on "day 1" (start of test period)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  is_admin,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'investor-a@indigo-test.local',
  'Alice',
  'TestInvestor',
  false,
  'Active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (
  id,
  name,
  email,
  profile_id,
  status,
  accredited,
  onboarding_date
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Alice TestInvestor',
  'investor-a@indigo-test.local',
  '00000000-0000-0000-0000-000000000001',
  'active',
  true,
  CURRENT_DATE - INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- Investor B: Deposits "mid-month" (to test ADB)
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  is_admin,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'investor-b@indigo-test.local',
  'Bob',
  'TestInvestor',
  false,
  'Active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO investors (
  id,
  name,
  email,
  profile_id,
  status,
  accredited,
  onboarding_date
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Bob TestInvestor',
  'investor-b@indigo-test.local',
  '00000000-0000-0000-0000-000000000002',
  'active',
  true,
  CURRENT_DATE - INTERVAL '15 days'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Get fund IDs (use existing funds)
-- ============================================================================

DO $$
DECLARE
  v_btc_fund_id uuid;
  v_usdt_fund_id uuid;
  v_test_investor_a uuid := '00000000-0000-0000-0000-000000000001';
  v_test_investor_b uuid := '00000000-0000-0000-0000-000000000002';
  v_test_admin uuid := '00000000-0000-0000-0000-000000000099';
  v_deposit_date_a date := CURRENT_DATE - INTERVAL '25 days';
  v_deposit_date_b date := CURRENT_DATE - INTERVAL '10 days';
  v_result jsonb;
BEGIN
  -- Get BTC fund
  SELECT id INTO v_btc_fund_id FROM funds WHERE code = 'IND-BTC' LIMIT 1;
  -- Get USDT fund (stablecoin)
  SELECT id INTO v_usdt_fund_id FROM funds WHERE code = 'IND-USDT' LIMIT 1;

  IF v_btc_fund_id IS NULL OR v_usdt_fund_id IS NULL THEN
    RAISE NOTICE 'Required funds not found, skipping golden path transactions';
    RETURN;
  END IF;

  RAISE NOTICE 'Using BTC fund: %, USDT fund: %', v_btc_fund_id, v_usdt_fund_id;

  -- ============================================================================
  -- 4. Ensure AUM exists for funds (required for transactions)
  -- ============================================================================

  -- Initialize AUM for BTC fund if missing
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source)
  SELECT
    v_btc_fund_id::text,
    CURRENT_DATE,
    0,
    'golden_path_seed'
  WHERE NOT EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = v_btc_fund_id::text
      AND COALESCE(is_voided, false) = false
  );

  -- Initialize AUM for USDT fund if missing
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source)
  SELECT
    v_usdt_fund_id::text,
    CURRENT_DATE,
    0,
    'golden_path_seed'
  WHERE NOT EXISTS (
    SELECT 1 FROM fund_daily_aum
    WHERE fund_id = v_usdt_fund_id::text
      AND COALESCE(is_voided, false) = false
  );

  -- ============================================================================
  -- 5. Create initial positions (crystallization dates set)
  -- ============================================================================

  -- Investor A position in BTC fund
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    shares,
    cost_basis,
    current_value,
    last_transaction_date,
    last_yield_crystallization_date,
    cumulative_yield_earned,
    is_active
  ) VALUES (
    v_test_investor_a,
    v_btc_fund_id,
    10,
    10000,
    10000,
    v_deposit_date_a,
    v_deposit_date_a,
    0,
    true
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = 10000,
    last_yield_crystallization_date = v_deposit_date_a;

  -- Investor A position in USDT fund
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    shares,
    cost_basis,
    current_value,
    last_transaction_date,
    last_yield_crystallization_date,
    cumulative_yield_earned,
    is_active
  ) VALUES (
    v_test_investor_a,
    v_usdt_fund_id,
    5000,
    5000,
    5000,
    v_deposit_date_a,
    v_deposit_date_a,
    0,
    true
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = 5000,
    last_yield_crystallization_date = v_deposit_date_a;

  -- Investor B position in USDT fund (mid-month deposit)
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    shares,
    cost_basis,
    current_value,
    last_transaction_date,
    last_yield_crystallization_date,
    cumulative_yield_earned,
    is_active
  ) VALUES (
    v_test_investor_b,
    v_usdt_fund_id,
    3000,
    3000,
    3000,
    v_deposit_date_b,
    v_deposit_date_b,
    0,
    true
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = 3000,
    last_yield_crystallization_date = v_deposit_date_b;

  -- ============================================================================
  -- 6. Create seed transactions (direct insert for setup - bypasses trigger)
  -- ============================================================================

  -- Temporarily allow direct inserts for seeding
  -- Note: In production, use the canonical RPC instead

  -- Investor A: BTC deposit
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    reference_id,
    notes,
    tx_source,
    created_by
  ) VALUES (
    v_test_investor_a,
    v_btc_fund_id,
    v_deposit_date_a,
    v_deposit_date_a,
    'BTC',
    10000,
    'DEPOSIT',
    0,
    10000,
    'GOLDEN_PATH_BTC_DEPOSIT_A',
    'Golden path seed: Initial BTC deposit',
    'system',
    v_test_admin
  ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

  -- Investor A: USDT deposit
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    reference_id,
    notes,
    tx_source,
    created_by
  ) VALUES (
    v_test_investor_a,
    v_usdt_fund_id,
    v_deposit_date_a,
    v_deposit_date_a,
    'USDT',
    5000,
    'DEPOSIT',
    0,
    5000,
    'GOLDEN_PATH_USDT_DEPOSIT_A',
    'Golden path seed: Initial USDT deposit',
    'system',
    v_test_admin
  ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

  -- Investor B: USDT deposit (mid-month)
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    asset,
    amount,
    type,
    balance_before,
    balance_after,
    reference_id,
    notes,
    tx_source,
    created_by
  ) VALUES (
    v_test_investor_b,
    v_usdt_fund_id,
    v_deposit_date_b,
    v_deposit_date_b,
    'USDT',
    3000,
    'DEPOSIT',
    0,
    3000,
    'GOLDEN_PATH_USDT_DEPOSIT_B',
    'Golden path seed: Mid-month USDT deposit (for ADB testing)',
    'system',
    v_test_admin
  ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

  -- ============================================================================
  -- 7. Update AUM to reflect positions
  -- ============================================================================

  -- Update BTC fund AUM
  UPDATE fund_daily_aum
  SET total_aum = (
    SELECT COALESCE(SUM(current_value), 0)
    FROM investor_positions
    WHERE fund_id = v_btc_fund_id
      AND COALESCE(is_active, true) = true
  )
  WHERE fund_id = v_btc_fund_id::text
    AND aum_date = CURRENT_DATE;

  -- Update USDT fund AUM
  UPDATE fund_daily_aum
  SET total_aum = (
    SELECT COALESCE(SUM(current_value), 0)
    FROM investor_positions
    WHERE fund_id = v_usdt_fund_id
      AND COALESCE(is_active, true) = true
  )
  WHERE fund_id = v_usdt_fund_id::text
    AND aum_date = CURRENT_DATE;

  RAISE NOTICE 'Golden path seed complete:';
  RAISE NOTICE '  - Investor A: 10,000 BTC + 5,000 USDT';
  RAISE NOTICE '  - Investor B: 3,000 USDT (mid-month)';
  RAISE NOTICE '  - All positions crystallized';
  RAISE NOTICE '  - AUM updated';

END;
$$;

-- ============================================================================
-- 8. Verify seed data
-- ============================================================================

SELECT 'Verifying golden path seed...' as status;

SELECT
  'Profiles created' as check,
  COUNT(*) as count
FROM profiles
WHERE email LIKE '%@indigo-test.local';

SELECT
  'Positions created' as check,
  COUNT(*) as count,
  SUM(current_value) as total_value
FROM investor_positions
WHERE investor_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

SELECT
  'Transactions created' as check,
  COUNT(*) as count
FROM transactions_v2
WHERE reference_id LIKE 'GOLDEN_PATH_%';

SELECT
  'Crystallization gaps' as check,
  COUNT(*) as gap_count
FROM v_crystallization_gaps
WHERE investor_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

SELECT 'Golden path seed verification complete' as status;
