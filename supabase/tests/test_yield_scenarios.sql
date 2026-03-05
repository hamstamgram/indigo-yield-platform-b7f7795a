DO $$
DECLARE
    v_sol_fund_id uuid := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
    v_xrp_fund_id uuid := '2c123c4f-76b4-4504-867e-059649855417';
    v_indigo_lp uuid := 'af16a20d-df70-4357-9b10-efcd25d0c1aa';
    v_paul uuid := 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2';
    v_alex_ib uuid := '3d606d2e-28cf-41e7-96f2-aeb52551c053';
    v_sam uuid := '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1';
    v_ryan_ib uuid := 'f462d9e5-7363-4c82-a144-4e694d2b55da';
    v_fees_account uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';

    v_admin_id uuid := (SELECT id FROM profiles WHERE is_admin = true LIMIT 1);
    
    v_result jsonb;
    v_actual numeric;
BEGIN
    RAISE NOTICE 'Starting Autonomous Yield Tests...';

    -- Enable direct mutations for our test cleanup:
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- ==========================================
    -- TEST CASE 1: SOL YIELD FUND
    -- ==========================================
    RAISE NOTICE 'Running Test Case 1: SOL YIELD FUND';

    -- Ensure exact fees:
    DELETE FROM investor_fee_schedule WHERE fund_id = v_sol_fund_id AND investor_id IN (v_indigo_lp, v_paul);
    DELETE FROM ib_commission_schedule WHERE fund_id = v_sol_fund_id AND investor_id = v_paul;

    INSERT INTO investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
    VALUES (v_indigo_lp, v_sol_fund_id, '2025-01-01', 0);

    -- Paul has a 15% Management Fee. 10% of that goes to IB (1.5% overall), 90% goes to Fund (13.5% overall)
    INSERT INTO investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
    VALUES (v_paul, v_sol_fund_id, '2025-01-01', 13.5);
    
    INSERT INTO ib_commission_schedule (investor_id, fund_id, effective_date, ib_percentage)
    VALUES (v_paul, v_sol_fund_id, '2025-01-01', 1.5);

    UPDATE profiles SET ib_parent_id = v_alex_ib WHERE id = v_paul;

    DELETE FROM yield_allocations WHERE fund_id = v_sol_fund_id;
    DELETE FROM fee_allocations WHERE fund_id = v_sol_fund_id;
    DELETE FROM ib_commission_ledger WHERE fund_id = v_sol_fund_id;
    DELETE FROM transactions_v2 WHERE fund_id = v_sol_fund_id AND tx_date >= '2025-09-01';
    DELETE FROM investor_positions WHERE fund_id = v_sol_fund_id;
    DELETE FROM yield_distributions WHERE fund_id = v_sol_fund_id AND effective_date >= '2025-09-01';

    -- Insert Deposit for INDIGO LP
    v_result := apply_investor_transaction(v_sol_fund_id, v_indigo_lp, 'DEPOSIT', 1250, '2025-09-02', 'test-sol-1', v_admin_id);
    
    -- 04/09/2025 : Yield Record Transaction (AUM: 1252 SOL)
    v_result := apply_segmented_yield_distribution_v5(v_sol_fund_id, '2025-09-04', 1252, 'transaction', NULL, v_admin_id);
    
    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_indigo_lp AND fund_id = v_sol_fund_id;
    IF v_actual != 1252 THEN RAISE EXCEPTION 'TEST1 FAILED: INDIGO LP balance expected 1252, got %', v_actual; END IF;

    -- 04/09/2025 (Après le yield) : Création transaction Paul Johnson : +234.17 SOL
    v_result := apply_investor_transaction(v_sol_fund_id, v_paul, 'DEPOSIT', 234.17, '2025-09-04', 'test-sol-2', v_admin_id);

    -- 30/09/2025 : Yield Record Reporting (AUM: 1500 SOL)
    v_result := apply_segmented_yield_distribution_v5(v_sol_fund_id, '2025-09-30', 1500, 'reporting', NULL, v_admin_id);

    -- Assertions for 30/09/2025
    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_indigo_lp AND fund_id = v_sol_fund_id;
    -- Precise theoretical value is 1263.64792. User rounded to 1263.65.
    IF ROUND(v_actual, 2) != 1263.65 THEN RAISE EXCEPTION 'TEST1 FAILED: INDIGO LP expected ~1263.65, got %', v_actual; END IF;

    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_paul AND fund_id = v_sol_fund_id;
    -- Precise theoretical value is ~236.02
    IF ROUND(v_actual, 2) != 236.02 THEN RAISE EXCEPTION 'TEST1 FAILED: Paul Johnson expected ~236.02, got %', v_actual; END IF;

    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_alex_ib AND fund_id = v_sol_fund_id;
    IF COALESCE(ROUND(v_actual, 4), 0) != 0.0327 THEN RAISE EXCEPTION 'TEST1 FAILED: Alex Jacobs expected ~0.0327, got %', COALESCE(v_actual, 0); END IF;

    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_fees_account AND fund_id = v_sol_fund_id;
    IF COALESCE(ROUND(v_actual, 4), 0) != 0.2942 THEN RAISE EXCEPTION 'TEST1 FAILED: Fees Account expected ~0.2942, got %', COALESCE(v_actual, 0); END IF;

    -- ==========================================
    -- TEST CASE 2: XRP YIELD FUND
    -- ==========================================
    RAISE NOTICE 'Running Test Case 2: XRP YIELD FUND';

    DELETE FROM investor_fee_schedule WHERE fund_id = v_xrp_fund_id AND investor_id = v_sam;
    DELETE FROM ib_commission_schedule WHERE fund_id = v_xrp_fund_id AND investor_id = v_sam;

    INSERT INTO investor_fee_schedule (investor_id, fund_id, effective_date, fee_pct)
    VALUES (v_sam, v_xrp_fund_id, '2025-01-01', 16);
    
    INSERT INTO ib_commission_schedule (investor_id, fund_id, effective_date, ib_percentage)
    VALUES (v_sam, v_xrp_fund_id, '2025-01-01', 4);

    UPDATE profiles SET ib_parent_id = v_ryan_ib WHERE id = v_sam;

    DELETE FROM yield_allocations WHERE fund_id = v_xrp_fund_id;
    DELETE FROM fee_allocations WHERE fund_id = v_xrp_fund_id;
    DELETE FROM ib_commission_ledger WHERE fund_id = v_xrp_fund_id;
    DELETE FROM transactions_v2 WHERE fund_id = v_xrp_fund_id AND tx_date >= '2025-11-01';
    DELETE FROM investor_positions WHERE fund_id = v_xrp_fund_id;
    DELETE FROM yield_distributions WHERE fund_id = v_xrp_fund_id AND effective_date >= '2025-11-01';

    v_result := apply_investor_transaction(v_xrp_fund_id, v_sam, 'DEPOSIT', 135003, '2025-11-17', 'test-xrp-1', v_admin_id);
    v_result := apply_investor_transaction(v_xrp_fund_id, v_sam, 'DEPOSIT', 49000, '2025-11-25', 'test-xrp-2', v_admin_id);
    v_result := apply_segmented_yield_distribution_v5(v_xrp_fund_id, '2025-11-30', 184358, 'reporting', NULL, v_admin_id);

    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_sam AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 184287.00 THEN RAISE EXCEPTION 'TEST2 (30/11) FAILED: Sam expected 184287, got %', v_actual; END IF;

    SELECT COALESCE(current_value, 0) INTO v_actual FROM investor_positions WHERE investor_id = v_ryan_ib AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 14.20 THEN RAISE EXCEPTION 'TEST2 (30/11) FAILED: Ryan expected 14.20, got %', v_actual; END IF;

    SELECT COALESCE(current_value, 0) INTO v_actual FROM investor_positions WHERE investor_id = v_fees_account AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 56.80 THEN RAISE EXCEPTION 'TEST2 (30/11) FAILED: Fees expected 56.80, got %', v_actual; END IF;

    v_result := apply_investor_transaction(v_xrp_fund_id, v_sam, 'DEPOSIT', 45000, '2025-11-30', 'test-xrp-3', v_admin_id);
    v_result := apply_segmented_yield_distribution_v5(v_xrp_fund_id, '2025-12-08', 229731, 'transaction', NULL, v_admin_id);

    SELECT current_value INTO v_actual FROM investor_positions WHERE investor_id = v_sam AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 229585.31 THEN RAISE EXCEPTION 'TEST2 (08/12) FAILED: Sam expected 229585.31, got %', v_actual; END IF;

    SELECT COALESCE(current_value, 0) INTO v_actual FROM investor_positions WHERE investor_id = v_ryan_ib AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 29.13 THEN RAISE EXCEPTION 'TEST2 (08/12) FAILED: Ryan expected 29.13, got %', v_actual; END IF;

    SELECT COALESCE(current_value, 0) INTO v_actual FROM investor_positions WHERE investor_id = v_fees_account AND fund_id = v_xrp_fund_id;
    IF ROUND(v_actual, 2) != 116.56 THEN RAISE EXCEPTION 'TEST2 (08/12) FAILED: Fees expected 116.56, got %', v_actual; END IF;

    -- ALL PASS. Rollback using an uncaught exception so the MCP tool reports it directly.
    RAISE EXCEPTION 'TEST_SUCCESS_ALL_PASSED_ROLLBACK_NOW';
END $$;
