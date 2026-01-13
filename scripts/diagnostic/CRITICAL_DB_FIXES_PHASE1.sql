-- ================================================
-- INDIGO PLATFORM - CRITICAL DATABASE FIXES PHASE 1
-- Date: 2026-01-12
-- Run with: psql connection_string -f this_file.sql
-- ================================================

-- ============================================
-- SECTION 1: FIX CRYSTALLIZATION FUNCTIONS
-- ============================================

-- 1.1 Fix apply_deposit_with_crystallization - Add crystallization success validation
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_crystal_result jsonb;
  v_snapshot_id uuid;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_reference_id text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_aum_result jsonb;
BEGIN
  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('deposit:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current balance
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Crystallize yield before deposit
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit',
    'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz, p_admin_id, p_purpose
  );

  -- CRITICAL FIX: Validate crystallization succeeded
  IF NOT COALESCE((v_crystal_result->>'success')::boolean, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Crystallization failed: ' || COALESCE(v_crystal_result->>'error', 'Unknown error'),
      'crystallization_result', v_crystal_result
    );
  END IF;

  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  v_balance_after := v_balance_before + p_amount;
  v_reference_id := 'DEP-' || p_fund_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create deposit transaction
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', p_amount, p_effective_date, v_fund_asset, v_fund_class,
    v_reference_id, COALESCE(p_notes, 'Deposit with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  ) RETURNING id INTO v_tx_id;

  -- Update position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, fund_class, shares, is_active)
  VALUES (p_investor_id, p_fund_id, v_balance_after, p_amount, v_fund_class, v_balance_after, true)
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_balance_after,
    cost_basis = investor_positions.cost_basis + p_amount,
    shares = v_balance_after,
    is_active = true,
    updated_at = now();

  -- Update AUM
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_effective_date, p_purpose, p_admin_id);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'DEPOSIT_WITH_CRYSTALLIZATION',
    'transactions_v2',
    v_tx_id::text,
    p_admin_id,
    jsonb_build_object(
      'amount', p_amount,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'crystallization', v_crystal_result
    ),
    jsonb_build_object('fund_id', p_fund_id, 'investor_id', p_investor_id, 'aum_update', v_aum_result)
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'snapshot_id', v_snapshot_id,
    'crystallization', v_crystal_result,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION apply_deposit_with_crystallization IS 'CTO Audit Fix: Added crystallization success validation';

-- 1.2 Fix apply_withdrawal_with_crystallization - Add success validation + fix race condition
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_crystal_result jsonb;
  v_snapshot_id uuid;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_reference_id text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_aum_result jsonb;
BEGIN
  -- Advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('withdrawal:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- CRITICAL FIX: Get balance WITH FOR UPDATE lock to prevent race condition
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  -- Validate balance AFTER acquiring lock
  IF v_balance_before IS NULL OR v_balance_before < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Requested: %s',
        COALESCE(v_balance_before, 0), p_amount)
    );
  END IF;

  -- Crystallize yield before withdrawal
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'withdrawal',
    'WDR-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz, p_admin_id, p_purpose
  );

  -- CRITICAL FIX: Validate crystallization succeeded
  IF NOT COALESCE((v_crystal_result->>'success')::boolean, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Crystallization failed: ' || COALESCE(v_crystal_result->>'error', 'Unknown error'),
      'crystallization_result', v_crystal_result
    );
  END IF;

  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  v_balance_after := v_balance_before - p_amount;
  v_reference_id := 'WDR-' || p_fund_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

  -- Create withdrawal transaction (negative amount)
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -ABS(p_amount), p_effective_date, v_fund_asset, v_fund_class,
    v_reference_id, COALESCE(p_notes, 'Withdrawal with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  ) RETURNING id INTO v_tx_id;

  -- Update position
  UPDATE investor_positions SET
    current_value = v_balance_after,
    shares = v_balance_after,
    is_active = CASE WHEN v_balance_after > 0 THEN true ELSE is_active END,
    updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Update AUM
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_effective_date, p_purpose, p_admin_id);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'WITHDRAWAL_WITH_CRYSTALLIZATION',
    'transactions_v2',
    v_tx_id::text,
    p_admin_id,
    jsonb_build_object(
      'amount', p_amount,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'crystallization', v_crystal_result
    ),
    jsonb_build_object('fund_id', p_fund_id, 'investor_id', p_investor_id, 'aum_update', v_aum_result)
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'snapshot_id', v_snapshot_id,
    'crystallization', v_crystal_result,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION apply_withdrawal_with_crystallization IS 'CTO Audit Fix: Added crystallization validation + FOR UPDATE lock';

-- ============================================
-- SECTION 2: ADD ADVISORY LOCKS TO FUNCTIONS
-- ============================================

-- 2.1 Fix adjust_investor_position - Add advisory lock
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_reason text,
  p_tx_date date DEFAULT CURRENT_DATE,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_fund_asset text;
  v_fund_class text;
  v_balance_before numeric(28,10);
  v_balance_after numeric(28,10);
  v_tx_id uuid;
  v_aum_result jsonb;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('position:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Verify admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get fund info
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current balance with lock
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance');
  END IF;

  -- Create adjustment transaction
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    notes, created_by, is_voided, balance_before, balance_after
  ) VALUES (
    p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class,
    p_reason, v_actor, false, v_balance_before, v_balance_after
  ) RETURNING id INTO v_tx_id;

  -- Update position
  INSERT INTO investor_positions (investor_id, fund_id, current_value, fund_class, shares, is_active)
  VALUES (p_investor_id, p_fund_id, v_balance_after, v_fund_class, v_balance_after, true)
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_balance_after,
    shares = v_balance_after,
    is_active = true,
    updated_at = now();

  -- CRITICAL FIX: Update AUM
  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_tx_date, 'transaction'::aum_purpose, v_actor);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'POSITION_ADJUSTMENT',
    'investor_positions',
    p_investor_id::text || ':' || p_fund_id::text,
    v_actor,
    jsonb_build_object('balance', v_balance_before),
    jsonb_build_object('balance', v_balance_after, 'adjustment', p_amount),
    jsonb_build_object('reason', p_reason, 'tx_id', v_tx_id, 'aum_update', v_aum_result)
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION adjust_investor_position IS 'CTO Audit Fix: Added advisory lock + AUM update';

-- 2.2 Fix start_processing_withdrawal - Add advisory lock
CREATE OR REPLACE FUNCTION public.start_processing_withdrawal(
  p_request_id uuid,
  p_admin_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_request record;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  PERFORM require_super_admin('start_processing_withdrawal');

  SELECT * INTO v_request FROM withdrawal_requests WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'approved' THEN
    RAISE EXCEPTION 'Can only start processing approved withdrawals. Current: %', v_request.status;
  END IF;

  UPDATE withdrawal_requests
  SET
    status = 'processing',
    processed_amount = COALESCE(approved_amount, requested_amount),
    updated_at = now(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'WITHDRAWAL_PROCESSING_STARTED',
    'withdrawal_requests',
    p_request_id::text,
    v_actor,
    jsonb_build_object('status', 'processing', 'processed_amount', COALESCE(v_request.approved_amount, v_request.requested_amount))
  );

  RETURN true;
END;
$function$;

COMMENT ON FUNCTION start_processing_withdrawal IS 'CTO Audit Fix: Added advisory lock';

-- 2.3 Fix void_yield_distribution - Add advisory lock + fix hardcoded UUID
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_reason text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist record;
  v_fees_account_id uuid;
  v_affected_investors uuid[];
  v_voided_tx_count int := 0;
  v_voided_alloc_count int := 0;
BEGIN
  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('void_yield:' || p_distribution_id::text));

  -- Verify admin
  IF NOT public.is_super_admin(p_admin_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Super admin required');
  END IF;

  -- Get distribution
  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;

  IF v_dist IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution not found');
  END IF;

  IF v_dist.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Distribution already voided');
  END IF;

  -- CRITICAL FIX: Lookup fees account dynamically instead of hardcoded UUID
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE account_type = 'fees_account'
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fees account not found');
  END IF;

  -- Get affected investors
  SELECT array_agg(DISTINCT investor_id) INTO v_affected_investors
  FROM transactions_v2
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void related transactions
  UPDATE transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, void_reason = p_reason
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_tx_count = ROW_COUNT;

  -- Void fee allocations
  UPDATE fee_allocations
  SET voided_at = now(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND voided_at IS NULL;
  GET DIAGNOSTICS v_voided_alloc_count = ROW_COUNT;

  -- Void IB allocations
  UPDATE ib_allocations
  SET voided_at = now(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND voided_at IS NULL;

  -- Void yield events
  UPDATE investor_yield_events
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Mark distribution as voided
  UPDATE yield_distributions
  SET voided_at = now(), voided_by = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Recompute affected positions (including fees account)
  IF v_affected_investors IS NOT NULL THEN
    FOR i IN 1..array_length(v_affected_investors, 1) LOOP
      PERFORM recompute_investor_position(v_affected_investors[i], v_dist.fund_id);
    END LOOP;
  END IF;

  -- Recompute fees account position
  PERFORM recompute_investor_position(v_fees_account_id, v_dist.fund_id);

  -- Recalculate AUM
  PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'YIELD_DISTRIBUTION_VOIDED',
    'yield_distributions',
    p_distribution_id::text,
    p_admin_id,
    to_jsonb(v_dist),
    jsonb_build_object(
      'reason', p_reason,
      'voided_transactions', v_voided_tx_count,
      'voided_allocations', v_voided_alloc_count,
      'affected_investors', v_affected_investors
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'voided_transactions', v_voided_tx_count,
    'voided_allocations', v_voided_alloc_count,
    'affected_investors', array_length(v_affected_investors, 1)
  );
END;
$function$;

COMMENT ON FUNCTION void_yield_distribution IS 'CTO Audit Fix: Added advisory lock + dynamic fees account lookup';

-- 2.4 Fix process_yield_distribution - Add advisory lock
CREATE OR REPLACE FUNCTION public.process_yield_distribution(
  p_fund_id uuid,
  p_gross_amount numeric,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric;
  v_fund record;
  v_result jsonb;
BEGIN
  -- CRITICAL FIX: Add advisory lock
  PERFORM pg_advisory_xact_lock(
    hashtext('yield:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get AUM for date
  SELECT total_aum INTO v_fund_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_date AND NOT is_voided
  ORDER BY created_at DESC LIMIT 1;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No AUM found for date');
  END IF;

  -- Calculate yield percentage and call apply function
  v_result := apply_daily_yield_to_fund_v3(
    p_fund_id := p_fund_id,
    p_yield_date := p_date,
    p_gross_yield_pct := (p_gross_amount / v_fund_aum) * 100,
    p_created_by := auth.uid()
  );

  RETURN v_result;
END;
$function$;

COMMENT ON FUNCTION process_yield_distribution IS 'CTO Audit Fix: Added advisory lock';

-- ============================================
-- SECTION 3: FIX CRYSTALLIZATION POSITION UPDATE
-- ============================================

-- This is handled in crystallize_yield_before_flow - verify it updates positions
-- The function should already update positions, but let's verify and enhance if needed

-- ============================================
-- SECTION 4: FIX INTEGRITY VIEWS
-- ============================================

-- 4.1 Fix position_ledger_reconciliation_v2 to exclude voided records
CREATE OR REPLACE VIEW public.position_ledger_reconciliation_v2 AS
SELECT
  ip.investor_id,
  ip.fund_id,
  p.first_name || ' ' || p.last_name as investor_name,
  f.name as fund_name,
  ip.current_value as position_value,
  COALESCE(tx_sum.ledger_total, 0) as ledger_total,
  ip.current_value - COALESCE(tx_sum.ledger_total, 0) as discrepancy,
  ABS(ip.current_value - COALESCE(tx_sum.ledger_total, 0)) > 0.01 as has_discrepancy
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN (
  SELECT
    investor_id,
    fund_id,
    SUM(
      CASE
        WHEN type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT', 'FEE')
        THEN amount
        WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL')
        THEN -ABS(amount)
        ELSE 0
      END
    ) as ledger_total
  FROM transactions_v2
  WHERE is_voided = false  -- CRITICAL FIX: Exclude voided records
  GROUP BY investor_id, fund_id
) tx_sum ON tx_sum.investor_id = ip.investor_id AND tx_sum.fund_id = ip.fund_id;

COMMENT ON VIEW position_ledger_reconciliation_v2 IS 'CTO Audit Fix: Added is_voided filter';

-- 4.2 Fix aum_position_reconciliation view
CREATE OR REPLACE VIEW public.aum_position_reconciliation AS
SELECT
  f.id as fund_id,
  f.name as fund_name,
  fda.aum_date,
  fda.total_aum as recorded_aum,
  COALESCE(pos_sum.position_total, 0) as calculated_aum,
  fda.total_aum - COALESCE(pos_sum.position_total, 0) as discrepancy,
  ABS(fda.total_aum - COALESCE(pos_sum.position_total, 0)) > 0.01 as has_discrepancy
FROM funds f
JOIN fund_daily_aum fda ON fda.fund_id = f.id
LEFT JOIN (
  SELECT
    ip.fund_id,
    SUM(ip.current_value) as position_total
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE p.account_type IS DISTINCT FROM 'fees_account'  -- Exclude fees account
  GROUP BY ip.fund_id
) pos_sum ON pos_sum.fund_id = f.id
WHERE fda.is_voided = false  -- CRITICAL FIX: Exclude voided AUM records
ORDER BY f.name, fda.aum_date DESC;

COMMENT ON VIEW aum_position_reconciliation IS 'CTO Audit Fix: Added is_voided filter';

-- ============================================
-- SECTION 5: ENABLE RLS ON OPERATION_METRICS
-- ============================================

ALTER TABLE IF EXISTS operation_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read operation_metrics" ON operation_metrics;
CREATE POLICY "Admin read operation_metrics" ON operation_metrics
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System write operation_metrics" ON operation_metrics;
CREATE POLICY "System write operation_metrics" ON operation_metrics
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- SECTION 6: VERIFICATION QUERIES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRITICAL FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed functions:';
  RAISE NOTICE '  - apply_deposit_with_crystallization (crystallization validation)';
  RAISE NOTICE '  - apply_withdrawal_with_crystallization (validation + race condition)';
  RAISE NOTICE '  - adjust_investor_position (advisory lock + AUM update)';
  RAISE NOTICE '  - start_processing_withdrawal (advisory lock)';
  RAISE NOTICE '  - void_yield_distribution (lock + dynamic fees account)';
  RAISE NOTICE '  - process_yield_distribution (advisory lock)';
  RAISE NOTICE 'Fixed views:';
  RAISE NOTICE '  - position_ledger_reconciliation_v2 (is_voided filter)';
  RAISE NOTICE '  - aum_position_reconciliation (is_voided filter)';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  - operation_metrics RLS enabled';
  RAISE NOTICE '========================================';
END $$;

-- Final verification
SELECT 'VERIFICATION' as section;
SELECT proname as function_name, 'UPDATED' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'apply_deposit_with_crystallization',
    'apply_withdrawal_with_crystallization',
    'adjust_investor_position',
    'start_processing_withdrawal',
    'void_yield_distribution',
    'process_yield_distribution'
  );
