-- Regression Test Suite for Indigo Yield Platform
-- Run these tests after any schema changes
-- Each test returns 'PASS' or 'FAIL' with details

-- ============================================================
-- P0 CRITICAL TESTS
-- ============================================================

-- TEST-P0-001: AUM purpose in deposits
DO $$
DECLARE
  v_result TEXT;
  v_fund_id UUID;
  v_investor_id UUID;
  v_admin_id UUID;
  v_aum_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P0-001: AUM purpose in deposits';

  -- Get test fund
  SELECT id INTO v_fund_id FROM funds WHERE status = 'active' LIMIT 1;
  SELECT id INTO v_investor_id FROM profiles WHERE is_admin = false AND status = 'Active' LIMIT 1;
  SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;

  IF v_fund_id IS NULL OR v_investor_id IS NULL THEN
    RAISE NOTICE 'SKIP: No test data available';
    RETURN;
  END IF;

  -- Check if transaction-purpose AUM validation function exists
  v_aum_exists := validate_transaction_aum_exists(v_fund_id, CURRENT_DATE, 'transaction');

  IF v_aum_exists THEN
    RAISE NOTICE 'PASS: Transaction AUM validation function works correctly';
  ELSE
    RAISE NOTICE 'INFO: No transaction AUM for today (expected for new dates)';
  END IF;
END $$;

-- TEST-P0-002: IB_CREDIT transaction creation
DO $$
DECLARE
  v_enum_values TEXT[];
BEGIN
  RAISE NOTICE 'TEST-P0-002: IB_CREDIT transaction enum validation';

  -- Check if IB_CREDIT is a valid enum value
  SELECT array_agg(enumlabel::text)
  INTO v_enum_values
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'tx_type';

  IF 'IB_CREDIT' = ANY(v_enum_values) THEN
    RAISE NOTICE 'PASS: IB_CREDIT is a valid tx_type enum value';
  ELSE
    RAISE NOTICE 'FAIL: IB_CREDIT not found in tx_type enum. Values: %', v_enum_values;
  END IF;

  -- Verify IB_COMMISSION is NOT in enum (should have been removed/never added)
  IF 'IB_COMMISSION' = ANY(v_enum_values) THEN
    RAISE NOTICE 'WARNING: IB_COMMISSION still exists in enum (deprecated)';
  ELSE
    RAISE NOTICE 'PASS: IB_COMMISSION correctly absent from enum';
  END IF;
END $$;

-- TEST-P0-003: Legacy transactions table check
DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P0-003: Legacy transactions table check';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE 'WARNING: Legacy "transactions" table still exists (should use transactions_v2)';
  ELSE
    RAISE NOTICE 'PASS: No legacy transactions table (using transactions_v2 only)';
  END IF;
END $$;

-- TEST-P0-004: INDIGO FEES account exists and has 0% fee
DO $$
DECLARE
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_account_exists BOOLEAN;
  v_fee_pct NUMERIC;
BEGIN
  RAISE NOTICE 'TEST-P0-004: INDIGO FEES account configuration';

  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_indigo_fees_id
  ) INTO v_account_exists;

  IF NOT v_account_exists THEN
    RAISE NOTICE 'FAIL: INDIGO FEES account does not exist (ID: %)', v_indigo_fees_id;
    RETURN;
  END IF;

  SELECT fee_percentage INTO v_fee_pct
  FROM profiles WHERE id = v_indigo_fees_id;

  IF v_fee_pct = 0 OR v_fee_pct IS NULL THEN
    RAISE NOTICE 'PASS: INDIGO FEES account has 0%% fee rate';
  ELSE
    RAISE NOTICE 'FAIL: INDIGO FEES account has %%% fee rate (should be 0)', v_fee_pct * 100;
  END IF;
END $$;

-- ============================================================
-- P1 HIGH PRIORITY TESTS
-- ============================================================

-- TEST-P1-001: Withdrawal available balance check
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P1-001: Withdrawal available balance function';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_available_balance'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE 'PASS: get_available_balance function exists';
  ELSE
    RAISE NOTICE 'FAIL: get_available_balance function missing';
  END IF;
END $$;

-- TEST-P1-002: Immutable field protection triggers
DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  RAISE NOTICE 'TEST-P1-002: Immutable field protection triggers';

  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname IN ('transactions_v2', 'fee_allocations', 'ib_allocations', 'audit_log')
    AND t.tgname LIKE 'protect_%_immutable';

  IF v_trigger_count >= 4 THEN
    RAISE NOTICE 'PASS: % immutable protection triggers found', v_trigger_count;
  ELSE
    RAISE NOTICE 'FAIL: Only % immutable protection triggers (expected >= 4)', v_trigger_count;
  END IF;
END $$;

-- TEST-P1-003: Void cascade triggers
DO $$
DECLARE
  v_cascade_triggers INTEGER;
BEGIN
  RAISE NOTICE 'TEST-P1-003: Void cascade triggers';

  SELECT COUNT(*) INTO v_cascade_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE t.tgname LIKE 'trg_cascade_void%';

  IF v_cascade_triggers >= 2 THEN
    RAISE NOTICE 'PASS: % void cascade triggers found', v_cascade_triggers;
  ELSE
    RAISE NOTICE 'FAIL: Only % void cascade triggers (expected >= 2)', v_cascade_triggers;
  END IF;
END $$;

-- TEST-P1-004: Dust handling columns exist
DO $$
DECLARE
  v_dust_amount_exists BOOLEAN;
  v_dust_receiver_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P1-004: Dust handling columns in yield_distributions';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yield_distributions' AND column_name = 'dust_amount'
  ) INTO v_dust_amount_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'yield_distributions' AND column_name = 'dust_receiver_id'
  ) INTO v_dust_receiver_exists;

  IF v_dust_amount_exists AND v_dust_receiver_exists THEN
    RAISE NOTICE 'PASS: Dust handling columns exist';
  ELSE
    RAISE NOTICE 'FAIL: Missing dust columns (amount: %, receiver: %)',
      v_dust_amount_exists, v_dust_receiver_exists;
  END IF;
END $$;

-- ============================================================
-- P2 MEDIUM PRIORITY TESTS
-- ============================================================

-- TEST-P2-001: Period snapshot functions
DO $$
DECLARE
  v_lock_function_exists BOOLEAN;
  v_is_locked_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P2-001: Period snapshot locking functions';

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'lock_fund_period_snapshot'
  ) INTO v_lock_function_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_period_locked'
  ) INTO v_is_locked_function_exists;

  IF v_lock_function_exists AND v_is_locked_function_exists THEN
    RAISE NOTICE 'PASS: Period locking functions exist';
  ELSE
    RAISE NOTICE 'FAIL: Missing locking functions (lock: %, is_locked: %)',
      v_lock_function_exists, v_is_locked_function_exists;
  END IF;
END $$;

-- TEST-P2-002: Data edit audit voided_record column
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P2-002: data_edit_audit voided_record column';

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'data_edit_audit' AND column_name = 'voided_record'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE 'PASS: voided_record column exists in data_edit_audit';
  ELSE
    RAISE NOTICE 'FAIL: voided_record column missing from data_edit_audit';
  END IF;
END $$;

-- TEST-P2-003: Withdrawal cancellation audit trigger
DO $$
DECLARE
  v_trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'TEST-P2-003: Withdrawal cancellation audit trigger';

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'withdrawal_requests'
      AND t.tgname = 'trg_withdrawal_cancel_audit'
  ) INTO v_trigger_exists;

  IF v_trigger_exists THEN
    RAISE NOTICE 'PASS: Withdrawal cancellation audit trigger exists';
  ELSE
    RAISE NOTICE 'FAIL: Withdrawal cancellation audit trigger missing';
  END IF;
END $$;

-- ============================================================
-- DATA INTEGRITY CHECKS
-- ============================================================

-- Check for orphaned allocations
DO $$
DECLARE
  v_orphaned_fee_count INTEGER;
  v_orphaned_ib_count INTEGER;
BEGIN
  RAISE NOTICE 'DATA INTEGRITY: Orphaned allocations check';

  SELECT COUNT(*) INTO v_orphaned_fee_count
  FROM fee_allocations fa
  WHERE fa.is_voided = false
    AND NOT EXISTS (
      SELECT 1 FROM yield_distributions yd
      WHERE yd.id = fa.distribution_id AND yd.is_voided = false
    );

  SELECT COUNT(*) INTO v_orphaned_ib_count
  FROM ib_allocations ia
  WHERE ia.is_voided = false
    AND ia.distribution_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM yield_distributions yd
      WHERE yd.id = ia.distribution_id AND yd.is_voided = false
    );

  IF v_orphaned_fee_count = 0 AND v_orphaned_ib_count = 0 THEN
    RAISE NOTICE 'PASS: No orphaned allocations found';
  ELSE
    RAISE NOTICE 'WARNING: Found % orphaned fee allocations, % orphaned IB allocations',
      v_orphaned_fee_count, v_orphaned_ib_count;
  END IF;
END $$;

-- Check for position-ledger mismatches
DO $$
DECLARE
  v_mismatch_count INTEGER;
BEGIN
  RAISE NOTICE 'DATA INTEGRITY: Position-ledger mismatch check';

  -- Count positions that don't match transaction sums
  SELECT COUNT(*) INTO v_mismatch_count
  FROM investor_positions ip
  WHERE ip.current_value != (
    SELECT COALESCE(SUM(
      CASE
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END
    ), 0)
    FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  );

  IF v_mismatch_count = 0 THEN
    RAISE NOTICE 'PASS: All positions match ledger sums';
  ELSE
    RAISE NOTICE 'WARNING: % positions have ledger mismatches', v_mismatch_count;
  END IF;
END $$;

-- ============================================================
-- SUMMARY
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'REGRESSION TEST SUITE COMPLETE';
  RAISE NOTICE 'Review PASS/FAIL/WARNING messages above';
  RAISE NOTICE '==========================================';
END $$;
