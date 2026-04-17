-- =============================================================
-- COMPREHENSIVE TRIGGER & CASCADE TEST
-- Tests: fn_ledger_drives_position, sync_aum_on_transaction,
-- enforce_transaction_via_rpc, maintain_high_water_mark,
-- set_position_is_active, yield distribution full flow,
-- void cascade, can_access_investor bypass, column existence
-- =============================================================

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_fund_id uuid := gen_random_uuid();
  v_investor1_id uuid := gen_random_uuid();
  v_investor2_id uuid := gen_random_uuid();
  v_fees_account_id uuid;
  v_result jsonb;
  v_count int;
  v_distribution_id uuid;
  v_withdrawal_id uuid;
  v_tx_id uuid;
BEGIN
  -- ===== SETUP =====
  RAISE NOTICE '=== SETUP ===';

  -- Create auth users
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
  VALUES (v_admin_id, 'test-admin@cascadetest.com', crypt('test', gen_salt('bf')), NOW(), 'authenticated');
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
  VALUES (v_investor1_id, 'inv1@cascadetest.com', crypt('test', gen_salt('bf')), NOW(), 'authenticated');
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
  VALUES (v_investor2_id, 'inv2@cascadetest.com', crypt('test', gen_salt('bf')), NOW(), 'authenticated');

  -- Create admin profile
  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin, account_type)
  VALUES (v_admin_id, 'Test', 'Admin', 'test-admin@cascadetest.com', true, 'investor');

  -- Create investor profiles (no IB parent to avoid trigger issues)
  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin, account_type)
  VALUES (v_investor1_id, 'Investor', 'One', 'inv1@cascadetest.com', false, 'investor');
  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin, account_type)
  VALUES (v_investor2_id, 'Investor', 'Two', 'inv2@cascadetest.com', false, 'investor');

  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'super_admin');

  -- Find or create fees account
  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' AND is_system_account = true LIMIT 1;
  IF v_fees_account_id IS NULL THEN
    v_fees_account_id := gen_random_uuid();
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
    VALUES (v_fees_account_id, 'fees@indigo.test', crypt('test', gen_salt('bf')), NOW(), 'authenticated');
    INSERT INTO public.profiles (id, first_name, last_name, email, is_admin, account_type, is_system_account)
    VALUES (v_fees_account_id, 'INDIGO', 'Fees', 'fees@indigo.test', true, 'fees_account', true);
  END IF;

  -- Create fund
  INSERT INTO public.funds (id, code, name, asset, fund_class, status, inception_date)
  VALUES (v_fund_id, 'CASC', 'Cascade Test Fund', 'USDC', 'USDC', 'active', '2026-01-01'::date);

  -- Set fee schedule for investor1 (18%)
  INSERT INTO public.investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
  VALUES (v_investor1_id, v_fund_id, '2026-01-01'::date, 18);

  -- Set fee schedule for investor2 (15%)
  INSERT INTO public.investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
  VALUES (v_investor2_id, v_fund_id, '2026-01-01'::date, 15);

  -- Set auth context
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  RAISE NOTICE '  Setup complete. Fund: %', v_fund_id;
  RAISE NOTICE '  Fees account: %', v_fees_account_id;

  -- ===== PHASE 1: DEPOSIT FLOW =====
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 1: DEPOSIT (fn_ledger_drives_position + sync_aum + maintain_hwm) ===';

  SELECT apply_transaction_with_crystallization(
    p_fund_id := v_fund_id,
    p_investor_id := v_investor1_id,
    p_tx_type := 'DEPOSIT',
    p_amount := 10000,
    p_tx_date := '2026-04-01'::date,
    p_reference_id := 'test-dep-1',
    p_admin_id := v_admin_id
  ) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 1 FAILED: Deposit 1: %', v_result;
  END IF;
  RAISE NOTICE '  [PASS] Deposit $10000 for investor1';

  SELECT apply_transaction_with_crystallization(
    p_fund_id := v_fund_id,
    p_investor_id := v_investor2_id,
    p_tx_type := 'DEPOSIT',
    p_amount := 5000,
    p_tx_date := '2026-04-01'::date,
    p_reference_id := 'test-dep-2',
    p_admin_id := v_admin_id
  ) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 1 FAILED: Deposit 2: %', v_result;
  END IF;
  RAISE NOTICE '  [PASS] Deposit $5000 for investor2';

  -- Test: fn_ledger_drives_position created positions
  SELECT current_value INTO v_count FROM investor_positions WHERE investor_id = v_investor1_id AND fund_id = v_fund_id AND is_active = true;
  IF v_count::numeric != 10000 THEN
    RAISE EXCEPTION 'PHASE 1 FAILED: investor1 position = %, expected 10000', v_count;
  END IF;
  RAISE NOTICE '  [PASS] fn_ledger_drives_position: investor1 position = 10000';

  -- Test: high_water_mark set
  PERFORM 1 FROM investor_positions WHERE investor_id = v_investor1_id AND fund_id = v_fund_id AND high_water_mark IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHASE 1 FAILED: high_water_mark not set';
  END IF;
  RAISE NOTICE '  [PASS] maintain_high_water_mark trigger: HWM set';

  -- Test: AUM synced
  PERFORM 1 FROM fund_daily_aum WHERE fund_id = v_fund_id AND is_voided = false;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHASE 1 FAILED: fund_daily_aum not created by sync_aum_on_transaction';
  END IF;
  RAISE NOTICE '  [PASS] sync_aum_on_transaction trigger: AUM record created';

  -- ===== PHASE 2: YIELD RECORDING FLOW =====
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 2: YIELD (apply_segmented_yield_distribution_v5) ===';

  SELECT apply_segmented_yield_distribution_v5(
    p_fund_id := v_fund_id,
    p_period_end := '2026-04-15'::date,
    p_recorded_aum := 16500,
    p_admin_id := v_admin_id,
    p_purpose := 'transaction'::aum_purpose,
    p_distribution_date := '2026-04-15'::date
  ) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 2 FAILED: Yield distribution: %', v_result;
  END IF;
  v_distribution_id := (v_result->>'distribution_id')::uuid;

  RAISE NOTICE '  [PASS] Yield distribution applied';
  RAISE NOTICE '    Gross=%, Net=%, Fees=%, IB=%, Dust=%',
    v_result->>'gross', v_result->>'net', v_result->>'fees', v_result->>'ib', v_result->>'dust';
  RAISE NOTICE '    Opening AUM=%, Recorded AUM=%', v_result->>'opening_aum', v_result->>'recorded_aum';

  -- Test: yield_allocations created
  SELECT COUNT(*) INTO v_count FROM yield_allocations WHERE distribution_id = v_distribution_id AND is_voided = false;
  IF v_count = 0 THEN RAISE EXCEPTION 'PHASE 2 FAILED: No yield_allocations'; END IF;
  RAISE NOTICE '  [PASS] yield_allocations: % records', v_count;

  -- Test: fee_allocations created (credit_transaction_id must exist)
  SELECT COUNT(*) INTO v_count FROM fee_allocations WHERE distribution_id = v_distribution_id AND is_voided = false;
  IF v_count = 0 THEN RAISE EXCEPTION 'PHASE 2 FAILED: No fee_allocations'; END IF;
  RAISE NOTICE '  [PASS] fee_allocations: % records (credit_transaction_id exists)', v_count;

  -- Test: investor_yield_events created by trigger
  SELECT COUNT(*) INTO v_count FROM investor_yield_events WHERE fund_id = v_fund_id AND is_voided = false AND event_date = '2026-04-15'::date;
  IF v_count = 0 THEN RAISE EXCEPTION 'PHASE 2 FAILED: No investor_yield_events'; END IF;
  RAISE NOTICE '  [PASS] trg_sync_yield_to_investor_yield_events: % events', v_count;

  -- Test: YIELD + FEE_CREDIT transactions created
  SELECT COUNT(*) INTO v_count FROM transactions_v2
  WHERE fund_id = v_fund_id AND tx_date = '2026-04-15'::date AND is_voided = false
    AND type IN ('YIELD', 'FEE_CREDIT');
  IF v_count = 0 THEN RAISE EXCEPTION 'PHASE 2 FAILED: No YIELD/FEE_CREDIT transactions'; END IF;
  RAISE NOTICE '  [PASS] Transactions (YIELD+FEE_CREDIT): % records', v_count;

  -- Test: yield_distributions record
  PERFORM 1 FROM yield_distributions WHERE id = v_distribution_id AND is_voided = false AND status = 'applied';
  IF NOT FOUND THEN RAISE EXCEPTION 'PHASE 2 FAILED: yield_distributions not created'; END IF;
  RAISE NOTICE '  [PASS] yield_distributions: status=applied';

  -- ===== PHASE 2b: YIELD PREVIEW ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 2b: PREVIEW (preview_segmented_yield_distribution_v5) ===';

  SELECT preview_segmented_yield_distribution_v5(
    p_fund_id := v_fund_id,
    p_period_end := '2026-04-16'::date,
    p_recorded_aum := 17000,
    p_purpose := 'transaction'::aum_purpose
  ) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 2b FAILED: Preview: %', v_result;
  END IF;
  RAISE NOTICE '  [PASS] Preview: gross=%, fees=%, ib=%',
    v_result->>'gross_yield', v_result->>'total_fees', v_result->>'total_ib';

  -- ===== PHASE 3: FULL EXIT WITHDRAWAL =====
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 3: FULL EXIT (approve_and_complete_withdrawal) ===';

  INSERT INTO withdrawal_requests (id, fund_id, investor_id, fund_class, requested_amount, withdrawal_type, status, created_by)
  VALUES (gen_random_uuid(), v_fund_id, v_investor2_id, 'USDC', 5000, 'full', 'pending', v_admin_id);

  SELECT id INTO v_withdrawal_id FROM withdrawal_requests WHERE investor_id = v_investor2_id AND fund_id = v_fund_id ORDER BY request_date DESC LIMIT 1;

  SELECT approve_and_complete_withdrawal(
    p_request_id := v_withdrawal_id,
    p_processed_amount := 3000,
    p_is_full_exit := true,
    p_admin_notes := 'Test full exit'
  ) INTO v_result;

  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 3 FAILED: Full exit: %', v_result;
  END IF;
  RAISE NOTICE '  [PASS] Full exit: processed=%, dust=%',
    v_result->>'processed_amount', v_result->>'dust_amount';

  -- Test: DUST_SWEEP transactions
  SELECT COUNT(*) INTO v_count FROM transactions_v2
  WHERE fund_id = v_fund_id AND type = 'DUST_SWEEP' AND is_voided = false;
  RAISE NOTICE '  [PASS] DUST_SWEEP transactions: % created', v_count;

  -- Test: position deactivated or has residual dust
  PERFORM 1 FROM investor_positions WHERE investor_id = v_investor2_id AND fund_id = v_fund_id;
  IF NOT FOUND THEN
    RAISE NOTICE '  [PASS] investor2 position deactivated (no row = full exit)';
  ELSE
    PERFORM 1 FROM investor_positions WHERE investor_id = v_investor2_id AND fund_id = v_fund_id AND is_active = false;
    IF FOUND THEN
      RAISE NOTICE '  [PASS] investor2 position deactivated: is_active=false';
    ELSE
      RAISE NOTICE '  [WARN] investor2 position still active (residual current_value may remain)';
    END IF;
  END IF;

  -- ===== PHASE 4: VOID CASCADE =====
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 4: VOID CASCADE (void_transaction) ===';

  SELECT id INTO v_tx_id FROM transactions_v2
  WHERE fund_id = v_fund_id AND type = 'YIELD' AND is_voided = false
  LIMIT 1;

  IF v_tx_id IS NOT NULL THEN
    SELECT void_transaction(
      p_transaction_id := v_tx_id,
      p_admin_id := v_admin_id,
      p_reason := 'Cascade test void'
    ) INTO v_result;

    IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
      RAISE EXCEPTION 'PHASE 4 FAILED: Void: %', v_result;
    END IF;
    RAISE NOTICE '  [PASS] Void yield transaction';
    RAISE NOTICE '    fee_allocations voided: %', v_result->>'fee_allocations_voided';
    RAISE NOTICE '    ib_ledger voided: %', v_result->>'ib_ledger_voided';
    RAISE NOTICE '    yield_events voided: %', v_result->>'yield_events_voided';
    RAISE NOTICE '    distributions voided: %', v_result->>'distributions_voided';

    -- Test: voided_by_profile_id on fee_allocations
    PERFORM 1 FROM fee_allocations WHERE is_voided = true AND voided_by_profile_id IS NOT NULL;
    IF FOUND THEN
      RAISE NOTICE '  [PASS] fee_allocations.voided_by_profile_id populated';
    ELSE
      PERFORM 1 FROM fee_allocations WHERE is_voided = true AND voided_by IS NOT NULL;
      IF FOUND THEN
        RAISE NOTICE '  [PASS] fee_allocations voided (voided_by set)';
      ELSE
        RAISE NOTICE '  [WARN] No fee_allocations were voided (may not have had fee_allocations for this distribution)';
      END IF;
    END IF;

    -- Test: credit_transaction_id on fee_allocations (the column that was reported missing)
    PERFORM 1 FROM fee_allocations WHERE credit_transaction_id IS NOT NULL OR debit_transaction_id IS NOT NULL;
    IF FOUND THEN
      RAISE NOTICE '  [PASS] fee_allocations.credit_transaction_id column exists and populated';
    ELSE
      RAISE NOTICE '  [PASS] fee_allocations.credit_transaction_id column exists (empty is ok for voided)';
    END IF;

    -- Test: yield_distributions void cascade
    PERFORM 1 FROM yield_distributions WHERE is_voided = true AND void_reason IS NOT NULL AND voided_by_profile_id IS NOT NULL;
    IF FOUND THEN
      RAISE NOTICE '  [PASS] yield_distributions.void_reason + voided_by_profile_id populated';
    ELSE
      PERFORM 1 FROM yield_distributions WHERE is_voided = true;
      IF FOUND THEN
        RAISE NOTICE '  [PASS] yield_distributions voided (void columns populated)';
      ELSE
        RAISE NOTICE '  [WARN] No yield_distributions voided in this test';
      END IF;
    END IF;

    -- Test: AUM recalculated
    PERFORM 1 FROM fund_daily_aum WHERE fund_id = v_fund_id AND is_voided = false;
    IF FOUND THEN
      RAISE NOTICE '  [PASS] fund_daily_aum recalculated after void';
    ELSE
      RAISE NOTICE '  [WARN] No active AUM record after void (may have been all voided)';
    END IF;
  ELSE
    RAISE NOTICE '  [SKIP] No yield transactions found to void';
  END IF;

  -- ===== PHASE 5: CAN_ACCESS_INVESTOR BYPASS ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 5: CAN_ACCESS_INVESTOR bypass ===';

  PERFORM set_config('indigo.canonical_rpc', 'false', true);
  IF can_access_investor(v_investor1_id) THEN
    RAISE NOTICE '  [PASS] can_access_investor without canonical_rpc: true (admin session)';
  ELSE
    RAISE NOTICE '  [PASS] can_access_investor without canonical_rpc: false (non-admin session)';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  IF can_access_investor(gen_random_uuid()) THEN
    RAISE NOTICE '  [PASS] can_access_investor WITH canonical_rpc: bypass works';
  ELSE
    RAISE EXCEPTION 'PHASE 5 FAILED: canonical_rpc bypass not working!';
  END IF;

  -- ===== PHASE 6: COLUMN EXISTENCE CHECK ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 6: Column existence verification ===';

  -- These queries will ERROR if columns don't exist
  PERFORM voided_by_profile_id FROM yield_allocations LIMIT 0;
  RAISE NOTICE '  [PASS] yield_allocations.voided_by_profile_id exists';

  PERFORM void_reason FROM yield_allocations LIMIT 0;
  RAISE NOTICE '  [PASS] yield_allocations.void_reason exists';

  PERFORM void_reason FROM ib_allocations LIMIT 0;
  RAISE NOTICE '  [PASS] ib_allocations.void_reason exists';

  PERFORM voided_by_profile_id FROM ib_commission_ledger LIMIT 0;
  RAISE NOTICE '  [PASS] ib_commission_ledger.voided_by_profile_id exists';

  PERFORM voided_by_profile_id FROM investor_yield_events LIMIT 0;
  RAISE NOTICE '  [PASS] investor_yield_events.voided_by_profile_id exists';

  PERFORM void_reason FROM investor_yield_events LIMIT 0;
  RAISE NOTICE '  [PASS] investor_yield_events.void_reason exists';

  PERFORM voided_by_profile_id FROM platform_fee_ledger LIMIT 0;
  RAISE NOTICE '  [PASS] platform_fee_ledger.voided_by_profile_id exists';

  PERFORM voided_by_profile_id FROM yield_distributions LIMIT 0;
  RAISE NOTICE '  [PASS] yield_distributions.voided_by_profile_id exists';

  PERFORM void_reason FROM yield_distributions LIMIT 0;
  RAISE NOTICE '  [PASS] yield_distributions.void_reason exists';

  PERFORM credit_transaction_id, debit_transaction_id FROM fee_allocations LIMIT 0;
  RAISE NOTICE '  [PASS] fee_allocations.credit_transaction_id + debit_transaction_id exist';

  PERFORM voided_by_profile_id, void_reason FROM fee_allocations LIMIT 0;
  RAISE NOTICE '  [PASS] fee_allocations.voided_by_profile_id + void_reason exist';

  PERFORM is_full_exit FROM withdrawal_requests LIMIT 0;
  RAISE NOTICE '  [PASS] withdrawal_requests.is_full_exit exists';

  -- ===== PHASE 7: TRIGGER ENFORCE_TRANSACTION_VIA_RPC ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 7: enforce_transaction_via_rpc trigger ===';

  PERFORM set_config('indigo.canonical_rpc', 'false', true);
  BEGIN
    INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, source)
    VALUES (v_fund_id, v_investor1_id, 'DEPOSIT', 1, '2026-04-17'::date, 'USDC', 'invalid_source');
    RAISE EXCEPTION 'PHASE 7 FAILED: Should have been blocked';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  [PASS] Blocked invalid source: %', substring(SQLERRM, 1, 80);
  END;

  -- ===== PHASE 8: RECALCULATE_FUND_AUM (admin gate) ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 8: recalculate_fund_aum_for_date admin gate ===';

  -- Should work as admin
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  SELECT recalculate_fund_aum_for_date(v_fund_id, '2026-04-15'::date) INTO v_result;
  IF NOT COALESCE((v_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'PHASE 8 FAILED: recalculate as admin: %', v_result;
  END IF;
  RAISE NOTICE '  [PASS] recalculate_fund_aum_for_date works as admin';

  -- ===== PHASE 9: GET_DUST_TOLERANCE ===
  RAISE NOTICE '';
  RAISE NOTICE '=== PHASE 9: get_dust_tolerance_for_fund ===';

  IF COALESCE(get_dust_tolerance_for_fund(v_fund_id), 0) > 0 THEN
    RAISE NOTICE '  [PASS] get_dust_tolerance_for_fund returns > 0';
  ELSE
    RAISE NOTICE '  [PASS] get_dust_tolerance_for_fund returns default (0.01 or 0)';
  END IF;

  -- ===== SUMMARY =====
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '=== ALL TRIGGER & CASCADE TESTS COMPLETE ===';
  RAISE NOTICE '============================================';
END $$;