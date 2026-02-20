-- Test Setup for September Scenario
DO $$
DECLARE
  v_admin_id uuid;
  v_fund_id uuid;
  v_lp_id uuid;
  v_paul_id uuid;
  v_alex_id uuid;
  v_fees_id uuid;
  
  v_result jsonb;
  v_distribution_id uuid;
  
  v_lp_balance numeric;
  v_paul_balance numeric;
  v_alex_balance numeric;
  v_fees_balance numeric;
  v_aum numeric;
  v_alloc_ib numeric;
  rec record;
  out_msg text := '';
BEGIN
  -- Get an admin
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin found';
  END IF;

  -- Create a dummy fund for testing
  INSERT INTO funds (name, code, asset, status, strategy, inception_date, fund_class)
  VALUES ('TEST SOL FUND', 'TSOL', 'SOL', 'active', 'Test', '2025-09-01', 'retail')
  RETURNING id INTO v_fund_id;
  
  -- Create dummy investors
  INSERT INTO profiles (email, first_name, last_name, role, fee_pct) VALUES ('lp@test.com', 'INDIGO', 'LP', 'investor', 0) RETURNING id INTO v_lp_id;
  INSERT INTO profiles (email, first_name, last_name, role, fee_pct, ib_percentage) VALUES ('paul@test.com', 'Paul', 'Johnson', 'investor', 16, 4) RETURNING id INTO v_paul_id;
  INSERT INTO profiles (email, first_name, last_name, role, fee_pct) VALUES ('alex@test.com', 'Alex', 'Jacobs', 'ib', 20) RETURNING id INTO v_alex_id;
  INSERT INTO profiles (email, first_name, last_name, role, is_internal_account) VALUES ('fees@test.com', 'INDIGO', 'Fees', 'fees', true) RETURNING id INTO v_fees_id;
  
  -- Set Paul's IB parent to Alex
  UPDATE profiles SET ib_parent_id = v_alex_id WHERE id = v_paul_id;
  
  -- Hardcode investor_fee_schedules since apply yields might check those too
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date) VALUES (v_lp_id, v_fund_id, 0, '2025-01-01');
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date) VALUES (v_paul_id, v_fund_id, 13.5, '2025-01-01');
  INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_percentage, effective_date) VALUES (v_alex_id, v_fund_id, 20, '2025-01-01');
  -- Note: The test plan says Paul has 13.5% fee + 1.5% IB (wait, initial prompt says 16% fee and 4% IB for Alex in one place, and 13.5% fee + 1.5% IB in another place. The actual math "Paul Johnson: 234.17 ... INDIGO Fees: +0.2942, IB: 0.0327" -> 0.0327 / 1.85 = ~0.017? Wait. 
  -- In prompt: "(IB de Alex Jacobs 4% et Fees 16%)" so let's use 16% fee and 4% IB! Wait, `UPDATE profiles SET ib_percentage = 4 ...` I did that.
  UPDATE profiles SET ib_percentage = 4, fee_pct = 16 WHERE id = v_paul_id;
  UPDATE investor_fee_schedule SET fee_percentage = 16 WHERE investor_id = v_paul_id;

  RAISE NOTICE '--- Starting Scenario ---';

  -- 1. INDIGO LP: +1250 SOL on 2025-09-02 (Fees 0%)
  SELECT apply_transaction_with_crystallization(
    v_fund_id, v_lp_id, 1250, 'DEPOSIT', '2025-09-02', 'test-dep-1', 1250, v_admin_id, 'transaction', NULL
  ) INTO v_result;
  RAISE NOTICE 'Deposit LP Result: %', v_result;

  -- 2. Yield: Transaction: 1252 SOL on 2025-09-04
  SELECT apply_segmented_yield_distribution_v5(
    v_fund_id, 1252, '2025-09-04', v_admin_id, 'transaction', '2025-09-04'
  ) INTO v_result;
  RAISE NOTICE 'Yield TX Result: %', v_result;

  -- Verify Step 2 Expected Result: INDIGO LP: +2 SOL, INDIGO Fees: 0
  SELECT current_value INTO v_lp_balance FROM investor_positions WHERE fund_id = v_fund_id AND investor_id = v_lp_id;
  RAISE NOTICE 'Post Yield 1 - INDIGO LP Balance: % (Expected 1252)', v_lp_balance;

  -- 3. Paul Johnson: +234.17 SOL on 2025-09-04
  SELECT apply_transaction_with_crystallization(
     v_fund_id, v_paul_id, 234.17, 'DEPOSIT', '2025-09-04', 'test-dep-2', 1252 + 234.17, v_admin_id, 'transaction', NULL
  ) INTO v_result;
  RAISE NOTICE 'Deposit Paul Result: %', v_result;

  -- 4. Yield: Reporting 1500 SOL on 2025-09-30
  SELECT apply_segmented_yield_distribution_v5(
    v_fund_id, 1500, '2025-09-30', v_admin_id, 'reporting', '2025-09-30'
  ) INTO v_result;
  RAISE NOTICE 'Yield Reporting Result: %', v_result;

  -- Final Balances
  SELECT current_value INTO v_lp_balance FROM investor_positions WHERE fund_id = v_fund_id AND investor_id = v_lp_id;
  SELECT coalesce(current_value, 0) INTO v_paul_balance FROM investor_positions WHERE fund_id = v_fund_id AND investor_id = v_paul_id;
  SELECT coalesce(current_value, 0) INTO v_alex_balance FROM investor_positions WHERE fund_id = v_fund_id AND investor_id = v_alex_id;
  
  -- Fees are distributed to the fees account of the fund, check fee_allocations sum
  SELECT id INTO v_distribution_id FROM yield_distributions WHERE fund_id = v_fund_id AND purpose = 'reporting' LIMIT 1;
  SELECT coalesce(sum(fee_amount), 0) INTO v_fees_balance FROM fee_allocations WHERE distribution_id = v_distribution_id;
  SELECT coalesce(sum(ib_amount), 0) INTO v_alloc_ib FROM ib_allocations WHERE distribution_id = v_distribution_id;
  SELECT coalesce(sum(current_value), 0) INTO v_aum FROM investor_positions WHERE fund_id = v_fund_id AND is_active = true;

  out_msg := out_msg || E'\n--- FINAL RESULTS ---';
  out_msg := out_msg || E'\nTotal AUM: ' || v_aum || ' (Expected 1500)';
  out_msg := out_msg || E'\nINDIGO LP: ' || v_lp_balance || ' (Expected 1263.65)';
  out_msg := out_msg || E'\nPaul Johnson: ' || v_paul_balance || ' (Expected 236.02)';
  out_msg := out_msg || E'\nAlex Jacobs (IB): ' || coalesce(v_alloc_ib, 0) || ' (Expected 0.0327)';
  out_msg := out_msg || E'\nFees Allocated: ' || coalesce(v_fees_balance, 0) || ' (Expected 0.2942)';
  
  FOR rec IN SELECT investor_id, gross_yield_amount, net_yield_amount, fee_amount FROM investor_yield_events WHERE trigger_type = 'reporting' AND fund_id = v_fund_id LOOP
     out_msg := out_msg || E'\nYield Event for ' || rec.investor_id || ': Gross = ' || rec.gross_yield_amount || ', Net = ' || rec.net_yield_amount || ', Fee = ' || rec.fee_amount;
  END LOOP;

  RAISE EXCEPTION 'TEST_SUCCESS: %', out_msg;

END $$;
