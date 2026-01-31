-- =============================================================================
-- Phase 3: 1000+ Scenario Generator (SQL-Native)
-- =============================================================================
-- Generates deterministic test scenarios using seeded PRNG. Populates
-- qa_scenario_manifest with operations to execute.
--
-- 11 categories, ~1000+ scenarios, ~8000+ operations total.
--
-- Usage:
--   SELECT qa_generate_scenarios('run42', 42);
-- =============================================================================

CREATE OR REPLACE FUNCTION qa_generate_scenarios(
  p_run_tag text DEFAULT 'qa_default',
  p_seed int DEFAULT 42
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scenario_count int := 0;
  v_step_count int := 0;
  v_global_step int := 0;

  -- Investor IDs
  v_alice   uuid := qa_investor_id('alice');
  v_bob     uuid := qa_investor_id('bob');
  v_charlie uuid := qa_investor_id('charlie');
  v_diana   uuid := qa_investor_id('diana');
  v_eve     uuid := qa_investor_id('eve');
  v_frank   uuid := qa_investor_id('frank');
  v_grace   uuid := qa_investor_id('grace');
  v_hank    uuid := qa_investor_id('hank');

  -- Fund IDs
  v_fund_btc  uuid := qa_fund_id('BTC');
  v_fund_eth  uuid := qa_fund_id('ETH');
  v_fund_usdt uuid := qa_fund_id('USDT');
  v_fund_usdc uuid := qa_fund_id('USDC');

  v_admin uuid := qa_admin_id();

  -- Loop vars
  i int;
  j int;
  v_investor uuid;
  v_fund uuid;
  v_asset text;
  v_amount numeric;
  v_date date;
  v_yield_pct numeric;
  v_ref text;
  v_investors uuid[];
  v_funds uuid[];
  v_assets text[];
BEGIN
  -- Initialize PRNG
  PERFORM setseed(p_seed::numeric / 2147483647.0);

  -- Clear previous scenarios for this run
  DELETE FROM qa_scenario_manifest WHERE run_tag = p_run_tag;

  v_investors := ARRAY[v_alice, v_bob, v_charlie, v_diana, v_eve, v_frank, v_grace, v_hank];
  v_funds := ARRAY[v_fund_btc, v_fund_eth, v_fund_usdt, v_fund_usdc];
  v_assets := ARRAY['BTC', 'ETH', 'USDT', 'USDC'];

  -- =========================================================================
  -- CATEGORY 1: Baseline Monthly Lifecycle (100 scenarios)
  -- Deposit -> N yield events -> month-end -> verify position
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_investor := v_investors[1 + (floor(random() * 5))::int];  -- First 5 investors
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_asset := v_assets[1 + (floor(random() * 4))::int];
    v_amount := round((100 + random() * 9900)::numeric, 2);  -- 100 to 10000
    v_date := '2025-02-01'::date + (floor(random() * 28))::int;

    -- Step 1: Deposit
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'BL-' || lpad(i::text, 4, '0'),
      'baseline_lifecycle',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', v_asset,
        'p_tx_date', v_date,
        'p_admin_id', v_admin,
        'p_notes', 'QA baseline deposit #' || i,
        'p_reference_id', 'QA-' || p_run_tag || '-BL-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-BL-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1', 'INV-9'],
      p_run_tag
    );

    -- Step 2-4: Yield events (1-3 per scenario)
    FOR j IN 1..(1 + (floor(random() * 3))::int) LOOP
      v_global_step := v_global_step + 1;
      v_yield_pct := round((0.01 + random() * 0.5)::numeric, 4);  -- 0.01% to 0.51%

      INSERT INTO qa_scenario_manifest (
        scenario_id, scenario_category, step_number, rpc_name, params,
        reference_id, expected_success, depends_on_step,
        invariants_to_check, run_tag
      ) VALUES (
        'BL-' || lpad(i::text, 4, '0'),
        'baseline_lifecycle',
        v_global_step,
        'apply_daily_yield_to_fund_v3',
        jsonb_build_object(
          'p_fund_id', v_fund,
          'p_gross_yield_pct', v_yield_pct,
          'p_yield_date', v_date + j,
          'p_created_by', v_admin,
          'p_purpose', 'reporting'
        ),
        'QA-' || p_run_tag || '-BL-YLD-' || lpad(i::text, 4, '0') || '-' || j,
        true,
        v_global_step - 1,
        ARRAY['INV-1', 'INV-2', 'INV-3'],
        p_run_tag
      );
    END LOOP;

    v_step_count := v_step_count + j + 1;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 2: Mid-Month Deposit Fairness (100 scenarios)
  -- Two investors deposit at different times, yield should be proportional
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_asset := v_assets[1 + (floor(random() * 4))::int];

    -- Step 1: First investor deposits on day 1
    v_amount := round((1000 + random() * 9000)::numeric, 2);
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'MID-' || lpad(i::text, 4, '0'),
      'midmonth_deposit',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_alice,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', v_asset,
        'p_tx_date', '2025-03-01',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-MID-DEP1-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-MID-DEP1-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1'],
      p_run_tag
    );

    -- Step 2: Second investor deposits mid-month (day 15)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'MID-' || lpad(i::text, 4, '0'),
      'midmonth_deposit',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_bob,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', v_asset,
        'p_tx_date', '2025-03-15',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-MID-DEP2-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-MID-DEP2-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1'],
      p_run_tag
    );

    -- Step 3: Yield at month end
    v_yield_pct := round((0.05 + random() * 0.45)::numeric, 4);
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'MID-' || lpad(i::text, 4, '0'),
      'midmonth_deposit',
      v_global_step,
      'apply_daily_yield_to_fund_v3',
      jsonb_build_object(
        'p_fund_id', v_fund,
        'p_gross_yield_pct', v_yield_pct,
        'p_yield_date', '2025-03-31',
        'p_created_by', v_admin,
        'p_purpose', 'reporting'
      ),
      'QA-' || p_run_tag || '-MID-YLD-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-2', 'INV-3'],
      p_run_tag
    );

    v_step_count := v_step_count + 3;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 3: Same-Day Operation Clusters (80 scenarios)
  -- Multiple operations on same day, verify deterministic ordering
  -- =========================================================================
  FOR i IN 1..80 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_fund_usdt;
    v_date := '2025-04-15'::date;

    FOR j IN 1..3 LOOP
      v_amount := round((100 + random() * 4900)::numeric, 2);
      v_investor := v_investors[1 + (floor(random() * 4))::int];
      v_global_step := v_global_step + 1;

      INSERT INTO qa_scenario_manifest (
        scenario_id, scenario_category, step_number, rpc_name, params,
        reference_id, expected_success, expected_position_delta,
        invariants_to_check, run_tag
      ) VALUES (
        'SD-' || lpad(i::text, 4, '0'),
        'same_day_cluster',
        v_global_step,
        'admin_create_transaction',
        jsonb_build_object(
          'p_investor_id', v_investor,
          'p_fund_id', v_fund,
          'p_type', 'DEPOSIT',
          'p_amount', v_amount,
          'p_asset', 'USDT',
          'p_tx_date', v_date,
          'p_admin_id', v_admin,
          'p_reference_id', 'QA-' || p_run_tag || '-SD-' || lpad(i::text, 4, '0') || '-' || j
        ),
        'QA-' || p_run_tag || '-SD-' || lpad(i::text, 4, '0') || '-' || j,
        true,
        v_amount,
        ARRAY['INV-1', 'INV-7'],
        p_run_tag
      );
    END LOOP;

    v_step_count := v_step_count + 3;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 4: Cross-Month Boundary (80 scenarios)
  -- Operations at month boundary, verify no double-counting
  -- =========================================================================
  FOR i IN 1..80 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_amount := round((500 + random() * 4500)::numeric, 2);
    v_investor := v_investors[1 + (floor(random() * 6))::int];

    -- Deposit on last day of month
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'XM-' || lpad(i::text, 4, '0'),
      'cross_month_boundary',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', v_assets[1 + (floor(random() * 4))::int],
        'p_tx_date', '2025-05-31',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-XM-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-XM-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1', 'INV-12'],
      p_run_tag
    );

    -- Yield on first day of next month
    v_yield_pct := round((0.02 + random() * 0.3)::numeric, 4);
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'XM-' || lpad(i::text, 4, '0'),
      'cross_month_boundary',
      v_global_step,
      'apply_daily_yield_to_fund_v3',
      jsonb_build_object(
        'p_fund_id', v_fund,
        'p_gross_yield_pct', v_yield_pct,
        'p_yield_date', '2025-06-01',
        'p_created_by', v_admin,
        'p_purpose', 'reporting'
      ),
      'QA-' || p_run_tag || '-XM-YLD-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-2', 'INV-3'],
      p_run_tag
    );

    v_step_count := v_step_count + 2;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 5: High-Volume Burst / Idempotency (100 scenarios)
  -- Same reference_id re-submitted, should be rejected
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_amount := round((100 + random() * 5000)::numeric, 2);
    v_investor := v_investors[1 + (floor(random() * 6))::int];
    v_ref := 'QA-' || p_run_tag || '-IDEM-' || lpad(i::text, 4, '0');

    -- First submit: should succeed
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'IDEM-' || lpad(i::text, 4, '0'),
      'idempotency_burst',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'USDT',
        'p_tx_date', '2025-07-01',
        'p_admin_id', v_admin,
        'p_reference_id', v_ref
      ),
      v_ref,
      true,
      v_amount,
      ARRAY['INV-1', 'INV-7'],
      p_run_tag
    );

    -- Duplicate submit: should fail (reference_id uniqueness)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'IDEM-' || lpad(i::text, 4, '0'),
      'idempotency_burst',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'USDT',
        'p_tx_date', '2025-07-01',
        'p_admin_id', v_admin,
        'p_reference_id', v_ref
      ),
      v_ref || '-DUP',
      false,  -- Expected to fail
      v_global_step - 1,
      ARRAY['INV-1'],
      p_run_tag
    );

    v_step_count := v_step_count + 2;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 6: Backdated Adjustments (80 scenarios)
  -- =========================================================================
  FOR i IN 1..80 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_investor := v_investors[1 + (floor(random() * 6))::int];
    v_amount := round((500 + random() * 4500)::numeric, 2);

    -- Deposit today
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'BD-' || lpad(i::text, 4, '0'),
      'backdated_adjustment',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'USDT',
        'p_tx_date', '2025-08-15',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-BD-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-BD-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1'],
      p_run_tag
    );

    -- Backdated adjustment (earlier date)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'BD-' || lpad(i::text, 4, '0'),
      'backdated_adjustment',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'ADJUSTMENT',
        'p_amount', round((50 + random() * 200)::numeric, 2),
        'p_asset', 'USDT',
        'p_tx_date', '2025-08-01',  -- backdated
        'p_admin_id', v_admin,
        'p_notes', 'Backdated adjustment',
        'p_reference_id', 'QA-' || p_run_tag || '-BD-ADJ-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-BD-ADJ-' || lpad(i::text, 4, '0'),
      true,
      NULL,
      ARRAY['INV-1', 'INV-6'],
      p_run_tag
    );

    v_step_count := v_step_count + 2;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 7: Void/Reissue Chains (100 scenarios)
  -- Create -> Void -> Reissue with different amount
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_funds[1 + (floor(random() * 4))::int];
    v_investor := v_investors[1 + (floor(random() * 6))::int];
    v_amount := round((500 + random() * 4500)::numeric, 2);

    -- Step 1: Create transaction
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'VR-' || lpad(i::text, 4, '0'),
      'void_reissue_chain',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'USDT',
        'p_tx_date', '2025-09-10',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-VR-ORIG-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-VR-ORIG-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1', 'INV-8'],
      p_run_tag
    );

    -- Step 2: Void it (executor will need to capture the transaction ID)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'VR-' || lpad(i::text, 4, '0'),
      'void_reissue_chain',
      v_global_step,
      'void_transaction',
      jsonb_build_object(
        'p_transaction_id', '__RESOLVE_FROM_PREV_STEP__',
        'p_reason', 'QA void test #' || i,
        'p_admin_id', v_admin
      ),
      'QA-' || p_run_tag || '-VR-VOID-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-8'],
      p_run_tag
    );

    -- Step 3: Reissue with corrected amount
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'VR-' || lpad(i::text, 4, '0'),
      'void_reissue_chain',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', round(v_amount * 1.1, 2),  -- 10% correction
        'p_asset', 'USDT',
        'p_tx_date', '2025-09-10',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-VR-REIS-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-VR-REIS-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-8'],
      p_run_tag
    );

    v_step_count := v_step_count + 3;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 8: Precision/Rounding Torture (80 scenarios)
  -- Amounts that are hard to divide evenly
  -- =========================================================================
  FOR i IN 1..80 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_fund_btc;  -- BTC has 8 decimal places

    -- Use amounts that create awkward divisions
    v_amount := CASE (i % 8)
      WHEN 0 THEN 0.00000001  -- 1 satoshi
      WHEN 1 THEN 0.33333333
      WHEN 2 THEN 1.0 / 7.0   -- 0.14285714...
      WHEN 3 THEN 0.00000003  -- 3 satoshis (can't split in 2)
      WHEN 4 THEN 99999.99999999
      WHEN 5 THEN 0.00000007  -- 7 satoshis (prime)
      WHEN 6 THEN 1.0 / 3.0   -- 0.33333...
      ELSE        1.0 / 11.0  -- 0.09090909...
    END;

    -- Deposit the awkward amount
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'PR-' || lpad(i::text, 4, '0'),
      'precision_torture',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_hank,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'BTC',
        'p_tx_date', '2025-10-01',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-PR-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-PR-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1', 'INV-9'],
      p_run_tag
    );

    -- Apply yield to force rounding scenario
    v_yield_pct := CASE (i % 4)
      WHEN 0 THEN 0.0001
      WHEN 1 THEN 0.0033
      WHEN 2 THEN 0.0077
      ELSE        0.0111
    END;

    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'PR-' || lpad(i::text, 4, '0'),
      'precision_torture',
      v_global_step,
      'apply_daily_yield_to_fund_v3',
      jsonb_build_object(
        'p_fund_id', v_fund,
        'p_gross_yield_pct', v_yield_pct,
        'p_yield_date', '2025-10-02',
        'p_created_by', v_admin,
        'p_purpose', 'reporting'
      ),
      'QA-' || p_run_tag || '-PR-YLD-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-2', 'INV-3'],
      p_run_tag
    );

    v_step_count := v_step_count + 2;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 9: Withdrawal Adversarial (100 scenarios)
  -- Test withdrawal state machine: pending -> approved -> processing -> completed
  -- Also: rejected, cancelled, double-complete, etc.
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_fund := v_fund_usdt;
    v_investor := v_charlie;
    v_amount := round((100 + random() * 2000)::numeric, 2);

    -- Step 1: Deposit (so we have balance)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'WD-' || lpad(i::text, 4, '0'),
      'withdrawal_adversarial',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount * 2,  -- Deposit 2x to have headroom
        'p_asset', 'USDT',
        'p_tx_date', '2025-11-01',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-WD-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-WD-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount * 2,
      ARRAY['INV-1', 'INV-9'],
      p_run_tag
    );

    -- Step 2: Create withdrawal request
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'WD-' || lpad(i::text, 4, '0'),
      'withdrawal_adversarial',
      v_global_step,
      'create_withdrawal_request',
      jsonb_build_object(
        'p_investor_id', v_investor,
        'p_fund_id', v_fund,
        'p_amount', v_amount,
        'p_asset', 'USDT',
        'p_notes', 'QA withdrawal #' || i
      ),
      'QA-' || p_run_tag || '-WD-REQ-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-10'],
      p_run_tag
    );

    -- Step 3: Approve or reject (alternating)
    v_global_step := v_global_step + 1;
    IF i % 3 = 0 THEN
      -- Reject
      INSERT INTO qa_scenario_manifest (
        scenario_id, scenario_category, step_number, rpc_name, params,
        reference_id, expected_success, depends_on_step,
        invariants_to_check, run_tag
      ) VALUES (
        'WD-' || lpad(i::text, 4, '0'),
        'withdrawal_adversarial',
        v_global_step,
        'reject_withdrawal',
        jsonb_build_object(
          'p_request_id', '__RESOLVE_FROM_PREV_STEP__',
          'p_reason', 'QA rejection test #' || i
        ),
        'QA-' || p_run_tag || '-WD-REJ-' || lpad(i::text, 4, '0'),
        true,
        v_global_step - 1,
        ARRAY['INV-10'],
        p_run_tag
      );
    ELSE
      -- Approve
      INSERT INTO qa_scenario_manifest (
        scenario_id, scenario_category, step_number, rpc_name, params,
        reference_id, expected_success, depends_on_step,
        invariants_to_check, run_tag
      ) VALUES (
        'WD-' || lpad(i::text, 4, '0'),
        'withdrawal_adversarial',
        v_global_step,
        'approve_withdrawal',
        jsonb_build_object(
          'p_request_id', '__RESOLVE_FROM_PREV_STEP__'
        ),
        'QA-' || p_run_tag || '-WD-APP-' || lpad(i::text, 4, '0'),
        true,
        v_global_step - 1,
        ARRAY['INV-10'],
        p_run_tag
      );
    END IF;

    v_step_count := v_step_count + 3;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 10: IB + Fee Compounding (80 scenarios)
  -- Verify: gross = net + fee exactly; IB = gross * ib_pct
  -- =========================================================================
  FOR i IN 1..80 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_amount := round((1000 + random() * 9000)::numeric, 2);

    -- Deposit for Eve (IB1 referral, 5% IB, 20% fee)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'IB-' || lpad(i::text, 4, '0'),
      'ib_fee_compounding',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_eve,
        'p_fund_id', v_fund_btc,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'BTC',
        'p_tx_date', '2025-12-01',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-IB-DEP-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-IB-DEP-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1'],
      p_run_tag
    );

    -- Yield to trigger fee + IB allocation
    v_yield_pct := round((0.1 + random() * 0.9)::numeric, 4);
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'IB-' || lpad(i::text, 4, '0'),
      'ib_fee_compounding',
      v_global_step,
      'apply_daily_yield_to_fund_v3',
      jsonb_build_object(
        'p_fund_id', v_fund_btc,
        'p_gross_yield_pct', v_yield_pct,
        'p_yield_date', '2025-12-' || lpad((2 + (i % 28))::text, 2, '0'),
        'p_created_by', v_admin,
        'p_purpose', 'reporting'
      ),
      'QA-' || p_run_tag || '-IB-YLD-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-2', 'INV-3', 'INV-10', 'INV-13'],
      p_run_tag
    );

    v_step_count := v_step_count + 2;
  END LOOP;

  -- =========================================================================
  -- CATEGORY 11: Multi-Fund Isolation (100 scenarios)
  -- Operations on one fund should not affect another
  -- =========================================================================
  FOR i IN 1..100 LOOP
    v_scenario_count := v_scenario_count + 1;
    v_amount := round((1000 + random() * 5000)::numeric, 2);

    -- Deposit into fund A
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'MF-' || lpad(i::text, 4, '0'),
      'multifund_isolation',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_diana,
        'p_fund_id', v_fund_btc,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount,
        'p_asset', 'BTC',
        'p_tx_date', '2026-01-05',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-MF-DEPA-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-MF-DEPA-' || lpad(i::text, 4, '0'),
      true,
      v_amount,
      ARRAY['INV-1', 'INV-11'],
      p_run_tag
    );

    -- Deposit into fund B (should not affect fund A position)
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, expected_position_delta,
      invariants_to_check, run_tag
    ) VALUES (
      'MF-' || lpad(i::text, 4, '0'),
      'multifund_isolation',
      v_global_step,
      'admin_create_transaction',
      jsonb_build_object(
        'p_investor_id', v_diana,
        'p_fund_id', v_fund_eth,
        'p_type', 'DEPOSIT',
        'p_amount', v_amount * 2,
        'p_asset', 'ETH',
        'p_tx_date', '2026-01-05',
        'p_admin_id', v_admin,
        'p_reference_id', 'QA-' || p_run_tag || '-MF-DEPB-' || lpad(i::text, 4, '0')
      ),
      'QA-' || p_run_tag || '-MF-DEPB-' || lpad(i::text, 4, '0'),
      true,
      v_amount * 2,
      ARRAY['INV-1', 'INV-11'],
      p_run_tag
    );

    -- Yield on fund A only (fund B position should be unchanged)
    v_yield_pct := round((0.05 + random() * 0.3)::numeric, 4);
    v_global_step := v_global_step + 1;
    INSERT INTO qa_scenario_manifest (
      scenario_id, scenario_category, step_number, rpc_name, params,
      reference_id, expected_success, depends_on_step,
      invariants_to_check, run_tag
    ) VALUES (
      'MF-' || lpad(i::text, 4, '0'),
      'multifund_isolation',
      v_global_step,
      'apply_daily_yield_to_fund_v3',
      jsonb_build_object(
        'p_fund_id', v_fund_btc,
        'p_gross_yield_pct', v_yield_pct,
        'p_yield_date', '2026-01-06',
        'p_created_by', v_admin,
        'p_purpose', 'reporting'
      ),
      'QA-' || p_run_tag || '-MF-YLD-' || lpad(i::text, 4, '0'),
      true,
      v_global_step - 1,
      ARRAY['INV-1', 'INV-2', 'INV-3', 'INV-11'],
      p_run_tag
    );

    v_step_count := v_step_count + 3;
  END LOOP;

  -- =========================================================================
  -- Return summary
  -- =========================================================================
  RETURN jsonb_build_object(
    'success', true,
    'run_tag', p_run_tag,
    'seed', p_seed,
    'generated_at', now(),
    'scenarios_generated', v_scenario_count,
    'total_steps', v_step_count,
    'categories', jsonb_build_object(
      'baseline_lifecycle', 100,
      'midmonth_deposit', 100,
      'same_day_cluster', 80,
      'cross_month_boundary', 80,
      'idempotency_burst', 100,
      'backdated_adjustment', 80,
      'void_reissue_chain', 100,
      'precision_torture', 80,
      'withdrawal_adversarial', 100,
      'ib_fee_compounding', 80,
      'multifund_isolation', 100
    )
  );
END;
$$;
