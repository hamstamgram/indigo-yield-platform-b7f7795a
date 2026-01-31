-- =============================================================================
-- Phase 2: Deterministic QA World Seed
-- =============================================================================
-- Creates a fully deterministic test world with predictable UUIDs, investors,
-- funds, IBs, and fee configurations. All entities tagged with QA run_tag
-- for easy cleanup.
--
-- Usage:
--   SELECT qa_seed_world('run42');
--   -- Creates all entities tagged with run_tag 'run42'
--
-- Cleanup:
--   SELECT qa_cleanup_world('run42');
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Manifest table: tracks all QA-seeded entities for cleanup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_entity_manifest (
  id serial PRIMARY KEY,
  run_tag text NOT NULL,
  entity_type text NOT NULL,  -- 'profile', 'fund', 'position', 'fee_schedule'
  entity_id uuid NOT NULL,
  entity_label text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_entity_manifest_run_tag
  ON qa_entity_manifest(run_tag);

-- ---------------------------------------------------------------------------
-- Scenario manifest table (Phase 3 will populate this)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_scenario_manifest (
  id serial PRIMARY KEY,
  scenario_id text NOT NULL,
  scenario_category text NOT NULL,
  step_number int NOT NULL,
  rpc_name text NOT NULL,
  params jsonb NOT NULL,
  reference_id text NOT NULL,
  expected_success boolean NOT NULL DEFAULT true,
  expected_position_delta numeric,
  depends_on_step int,
  invariants_to_check text[],
  executed boolean DEFAULT false,
  execution_result jsonb,
  executed_at timestamptz,
  run_tag text
);

CREATE INDEX IF NOT EXISTS idx_qa_scenario_manifest_run_tag
  ON qa_scenario_manifest(run_tag);
CREATE INDEX IF NOT EXISTS idx_qa_scenario_manifest_scenario
  ON qa_scenario_manifest(scenario_id, step_number);
-- reference_id uniqueness enforced per run_tag
CREATE UNIQUE INDEX IF NOT EXISTS idx_qa_scenario_manifest_ref
  ON qa_scenario_manifest(run_tag, reference_id);

-- ---------------------------------------------------------------------------
-- QA Test results table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_test_results (
  id serial PRIMARY KEY,
  run_tag text NOT NULL,
  test_category text NOT NULL,
  test_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN', 'SKIP', 'ERROR')),
  details jsonb,
  duration_ms numeric,
  executed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qa_test_results_run_tag
  ON qa_test_results(run_tag);

-- =============================================================================
-- MAIN SEED FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION qa_seed_world(p_run_tag text DEFAULT 'qa_default')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Fixed UUIDs for deterministic testing
  -- Admin
  v_admin_id       uuid := 'a1000000-0000-0000-0000-000000000001';
  v_super_admin_id uuid := 'a2000000-0000-0000-0000-000000000001';

  -- Investors (8)
  v_alice_id   uuid := 'b1000000-0000-0000-0000-000000000001';  -- Day-1 depositor
  v_bob_id     uuid := 'b2000000-0000-0000-0000-000000000001';  -- Mid-month depositor
  v_charlie_id uuid := 'b3000000-0000-0000-0000-000000000001';  -- Withdrawal tester
  v_diana_id   uuid := 'b4000000-0000-0000-0000-000000000001';  -- Multi-fund
  v_eve_id     uuid := 'b5000000-0000-0000-0000-000000000001';  -- IB referral (ib_001)
  v_frank_id   uuid := 'b6000000-0000-0000-0000-000000000001';  -- IB referral (ib_002)
  v_grace_id   uuid := 'b7000000-0000-0000-0000-000000000001';  -- Zero balance
  v_hank_id    uuid := 'b8000000-0000-0000-0000-000000000001';  -- Precision edge cases

  -- IBs (2)
  v_ib1_id uuid := 'c1000000-0000-0000-0000-000000000001';
  v_ib2_id uuid := 'c2000000-0000-0000-0000-000000000001';

  -- Fees account
  v_fees_id uuid := 'd1000000-0000-0000-0000-000000000001';

  -- Funds (4)
  v_fund_btc  uuid := 'f1000000-0000-0000-0000-00000000qa01';
  v_fund_eth  uuid := 'f2000000-0000-0000-0000-00000000qa01';
  v_fund_usdt uuid := 'f3000000-0000-0000-0000-00000000qa01';
  v_fund_usdc uuid := 'f4000000-0000-0000-0000-00000000qa01';

  v_count int := 0;
BEGIN
  -- =========================================================================
  -- 0. Clean up any previous run with same tag
  -- =========================================================================
  PERFORM qa_cleanup_world(p_run_tag);

  -- =========================================================================
  -- 1. Create QA Funds
  -- =========================================================================
  INSERT INTO funds (id, code, name, asset, fund_class, strategy, inception_date, status, perf_fee_bps, min_investment, max_daily_yield_pct)
  VALUES
    (v_fund_btc,  'QA-BTC',  'QA Bitcoin Yield',  'BTC',  'crypto', 'DeFi Yield', '2025-01-01', 'active', 2000, 0.001, 5.0),
    (v_fund_eth,  'QA-ETH',  'QA Ethereum Yield', 'ETH',  'crypto', 'DeFi Yield', '2025-01-01', 'active', 2000, 0.01,  5.0),
    (v_fund_usdt, 'QA-USDT', 'QA Tether Yield',   'USDT', 'stable', 'Lending',    '2025-01-01', 'active', 2000, 100,   5.0),
    (v_fund_usdc, 'QA-USDC', 'QA USDC Yield',     'USDC', 'stable', 'Lending',    '2025-01-01', 'active', 2000, 100,   5.0)
  ON CONFLICT (id) DO NOTHING;

  -- Track entities
  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  VALUES
    (p_run_tag, 'fund', v_fund_btc,  'QA-BTC'),
    (p_run_tag, 'fund', v_fund_eth,  'QA-ETH'),
    (p_run_tag, 'fund', v_fund_usdt, 'QA-USDT'),
    (p_run_tag, 'fund', v_fund_usdc, 'QA-USDC');
  v_count := v_count + 4;

  -- =========================================================================
  -- 2. Create Admin profiles
  -- =========================================================================
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES
    (v_admin_id,       'qa.admin@indigo.test',       'QA',    'Admin',      true,  'investor', 'active', 0, false),
    (v_super_admin_id, 'qa.superadmin@indigo.test',  'QA',    'SuperAdmin', true,  'investor', 'active', 0, false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  VALUES
    (p_run_tag, 'profile', v_admin_id,       'QA Admin'),
    (p_run_tag, 'profile', v_super_admin_id, 'QA SuperAdmin');
  v_count := v_count + 2;

  -- =========================================================================
  -- 3. Create IB profiles (before investors who reference them)
  -- =========================================================================
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, ib_percentage, include_in_reporting)
  VALUES
    (v_ib1_id, 'qa.ib1@indigo.test', 'QA', 'IB-Alpha', false, 'ib', 'active', 0, 5.0,  true),
    (v_ib2_id, 'qa.ib2@indigo.test', 'QA', 'IB-Beta',  false, 'ib', 'active', 0, 3.0,  true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  VALUES
    (p_run_tag, 'profile', v_ib1_id, 'QA IB-Alpha (5%)'),
    (p_run_tag, 'profile', v_ib2_id, 'QA IB-Beta (3%)');
  v_count := v_count + 2;

  -- =========================================================================
  -- 4. Create Fees account
  -- =========================================================================
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, is_system_account, include_in_reporting)
  VALUES
    (v_fees_id, 'qa.fees@indigo.test', 'QA', 'Fees Account', false, 'investor', 'active', 0, true, false)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  VALUES (p_run_tag, 'profile', v_fees_id, 'QA Fees Account');
  v_count := v_count + 1;

  -- =========================================================================
  -- 5. Create Investor profiles
  -- =========================================================================

  -- Alice: Day-1 depositor, full lifecycle, BTC+ETH, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_alice_id, 'qa.alice@indigo.test', 'Alice', 'QA-Tester', false, 'investor', 'active', 20.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Bob: Mid-month depositor, time-weighted yield, USDT, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_bob_id, 'qa.bob@indigo.test', 'Bob', 'QA-Tester', false, 'investor', 'active', 20.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Charlie: Withdrawal tester, USDT, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_charlie_id, 'qa.charlie@indigo.test', 'Charlie', 'QA-Tester', false, 'investor', 'active', 20.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Diana: Multi-fund, all 4 funds, 30% fee (higher fee for testing)
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_diana_id, 'qa.diana@indigo.test', 'Diana', 'QA-Tester', false, 'investor', 'active', 30.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Eve: IB referral by ib_001, commission test, BTC, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, ib_parent_id, ib_percentage, include_in_reporting)
  VALUES (v_eve_id, 'qa.eve@indigo.test', 'Eve', 'QA-Tester', false, 'investor', 'active', 20.0, v_ib1_id, 5.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Frank: IB referral by ib_002, cross-IB, ETH, 25% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, ib_parent_id, ib_percentage, include_in_reporting)
  VALUES (v_frank_id, 'qa.frank@indigo.test', 'Frank', 'QA-Tester', false, 'investor', 'active', 25.0, v_ib2_id, 3.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Grace: Zero balance, void chains, USDT, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_grace_id, 'qa.grace@indigo.test', 'Grace', 'QA-Tester', false, 'investor', 'active', 20.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Hank: Minimum amounts, precision edge cases, BTC, 20% fee
  INSERT INTO profiles (id, email, first_name, last_name, is_admin, account_type, status, fee_pct, include_in_reporting)
  VALUES (v_hank_id, 'qa.hank@indigo.test', 'Hank', 'QA-Tester', false, 'investor', 'active', 20.0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Track all investors
  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  VALUES
    (p_run_tag, 'profile', v_alice_id,   'Alice - Day-1 lifecycle'),
    (p_run_tag, 'profile', v_bob_id,     'Bob - Mid-month depositor'),
    (p_run_tag, 'profile', v_charlie_id, 'Charlie - Withdrawal tester'),
    (p_run_tag, 'profile', v_diana_id,   'Diana - Multi-fund'),
    (p_run_tag, 'profile', v_eve_id,     'Eve - IB referral (ib1, 5%)'),
    (p_run_tag, 'profile', v_frank_id,   'Frank - IB referral (ib2, 3%)'),
    (p_run_tag, 'profile', v_grace_id,   'Grace - Zero balance'),
    (p_run_tag, 'profile', v_hank_id,    'Hank - Precision edge');
  v_count := v_count + 8;

  -- =========================================================================
  -- 6. Create investor positions (empty, ready for deposits)
  -- =========================================================================

  -- Alice: BTC + ETH
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES
    (v_alice_id, v_fund_btc, 0, 0, 0),
    (v_alice_id, v_fund_eth, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Bob: USDT
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_bob_id, v_fund_usdt, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Charlie: USDT
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_charlie_id, v_fund_usdt, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Diana: All 4 funds
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES
    (v_diana_id, v_fund_btc,  0, 0, 0),
    (v_diana_id, v_fund_eth,  0, 0, 0),
    (v_diana_id, v_fund_usdt, 0, 0, 0),
    (v_diana_id, v_fund_usdc, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Eve: BTC (with IB)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_eve_id, v_fund_btc, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Frank: ETH (with IB)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_frank_id, v_fund_eth, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Grace: USDT (zero balance)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_grace_id, v_fund_usdt, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Hank: BTC (precision edge)
  INSERT INTO investor_positions (investor_id, fund_id, current_value, shares, cost_basis)
  VALUES (v_hank_id, v_fund_btc, 0, 0, 0)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Track positions
  INSERT INTO qa_entity_manifest (run_tag, entity_type, entity_id, entity_label)
  SELECT p_run_tag, 'position', investor_id, 'Position: ' || investor_id::text || ' / ' || fund_id::text
  FROM investor_positions
  WHERE investor_id IN (v_alice_id, v_bob_id, v_charlie_id, v_diana_id, v_eve_id, v_frank_id, v_grace_id, v_hank_id);

  -- =========================================================================
  -- 7. Create fee schedules
  -- =========================================================================
  INSERT INTO investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
  VALUES
    -- Alice: 20% across both funds
    (v_alice_id, v_fund_btc,  '2025-01-01', 20.0),
    (v_alice_id, v_fund_eth,  '2025-01-01', 20.0),
    -- Bob: 20%
    (v_bob_id,   v_fund_usdt, '2025-01-01', 20.0),
    -- Charlie: 20%
    (v_charlie_id, v_fund_usdt, '2025-01-01', 20.0),
    -- Diana: 30% across all
    (v_diana_id, v_fund_btc,  '2025-01-01', 30.0),
    (v_diana_id, v_fund_eth,  '2025-01-01', 30.0),
    (v_diana_id, v_fund_usdt, '2025-01-01', 30.0),
    (v_diana_id, v_fund_usdc, '2025-01-01', 30.0),
    -- Eve: 20% (IB gets 5% of gross)
    (v_eve_id,   v_fund_btc,  '2025-01-01', 20.0),
    -- Frank: 25% (IB gets 3% of gross)
    (v_frank_id, v_fund_eth,  '2025-01-01', 25.0),
    -- Grace: 20%
    (v_grace_id, v_fund_usdt, '2025-01-01', 20.0),
    -- Hank: 20%
    (v_hank_id,  v_fund_btc,  '2025-01-01', 20.0)
  ON CONFLICT DO NOTHING;

  -- =========================================================================
  -- 8. Return summary
  -- =========================================================================
  RETURN jsonb_build_object(
    'success', true,
    'run_tag', p_run_tag,
    'created_at', now(),
    'entities_created', v_count,
    'investors', jsonb_build_object(
      'alice',   v_alice_id,
      'bob',     v_bob_id,
      'charlie', v_charlie_id,
      'diana',   v_diana_id,
      'eve',     v_eve_id,
      'frank',   v_frank_id,
      'grace',   v_grace_id,
      'hank',    v_hank_id
    ),
    'ibs', jsonb_build_object(
      'ib1', v_ib1_id,
      'ib2', v_ib2_id
    ),
    'funds', jsonb_build_object(
      'btc',  v_fund_btc,
      'eth',  v_fund_eth,
      'usdt', v_fund_usdt,
      'usdc', v_fund_usdc
    ),
    'admin', v_admin_id,
    'super_admin', v_super_admin_id,
    'fees_account', v_fees_id
  );
END;
$$;

-- =============================================================================
-- LOOKUP HELPERS (for use by scenario generator/executor)
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_investor_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN CASE lower(p_name)
    WHEN 'alice'   THEN 'b1000000-0000-0000-0000-000000000001'::uuid
    WHEN 'bob'     THEN 'b2000000-0000-0000-0000-000000000001'::uuid
    WHEN 'charlie' THEN 'b3000000-0000-0000-0000-000000000001'::uuid
    WHEN 'diana'   THEN 'b4000000-0000-0000-0000-000000000001'::uuid
    WHEN 'eve'     THEN 'b5000000-0000-0000-0000-000000000001'::uuid
    WHEN 'frank'   THEN 'b6000000-0000-0000-0000-000000000001'::uuid
    WHEN 'grace'   THEN 'b7000000-0000-0000-0000-000000000001'::uuid
    WHEN 'hank'    THEN 'b8000000-0000-0000-0000-000000000001'::uuid
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION qa_fund_id(p_asset text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN CASE upper(p_asset)
    WHEN 'BTC'  THEN 'f1000000-0000-0000-0000-00000000qa01'::uuid
    WHEN 'ETH'  THEN 'f2000000-0000-0000-0000-00000000qa01'::uuid
    WHEN 'USDT' THEN 'f3000000-0000-0000-0000-00000000qa01'::uuid
    WHEN 'USDC' THEN 'f4000000-0000-0000-0000-00000000qa01'::uuid
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION qa_admin_id()
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN 'a1000000-0000-0000-0000-000000000001'::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION qa_fees_account_id()
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN 'd1000000-0000-0000-0000-000000000001'::uuid;
END;
$$;
