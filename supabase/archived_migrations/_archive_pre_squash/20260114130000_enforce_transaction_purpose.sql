-- Migration: Enforce transaction purpose in deposit/withdrawal RPCs
-- Fixes: P0 blocking issues identified in audit
-- Date: 2026-01-14

-- ============================================================
-- FIX 1: Update apply_deposit_with_crystallization to enforce purpose
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
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
  v_balance_before numeric(28,10) := 0;
  v_balance_after numeric(28,10);
  v_aum_result jsonb;
BEGIN
  -- ============================================================
  -- NEW: P0 FIX - Enforce transaction purpose
  -- ============================================================
  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Deposit must use transaction purpose. Received: %. Use p_purpose=''transaction'' for deposit flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- ============================================================
  -- NEW: P0 FIX - Validate AUM exists for transaction date
  -- ============================================================
  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record first using ensure_transaction_aum() or manual entry.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Advisory lock to prevent concurrent modifications
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

  -- Get current balance (with proper NULL handling)
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_balance_before := COALESCE(v_balance_before, 0);

  -- Crystallize yield before deposit
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit',
    'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz, p_admin_id, p_purpose
  );

  -- Validate crystallization succeeded
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
    'deposit_tx_id', v_tx_id,
    'reference_id', v_reference_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'crystallization', v_crystal_result,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION apply_deposit_with_crystallization IS 'Process deposit with yield crystallization. ENFORCES transaction purpose. Validates AUM exists.';

-- ============================================================
-- FIX 2: Update apply_withdrawal_with_crystallization to enforce purpose
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
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
  -- ============================================================
  -- NEW: P0 FIX - Enforce transaction purpose
  -- ============================================================
  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Withdrawal must use transaction purpose. Received: %. Use p_purpose=''transaction'' for withdrawal flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- ============================================================
  -- NEW: P0 FIX - Validate AUM exists for transaction date
  -- ============================================================
  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record first using ensure_transaction_aum() or manual entry.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

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

  -- Get balance WITH FOR UPDATE lock to prevent race condition
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

  -- Validate crystallization succeeded
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
    'withdrawal_tx_id', v_tx_id,
    'reference_id', v_reference_id,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'crystallization', v_crystal_result,
    'aum_update', v_aum_result
  );
END;
$function$;

COMMENT ON FUNCTION apply_withdrawal_with_crystallization IS 'Process withdrawal with yield crystallization. ENFORCES transaction purpose. Validates AUM exists.';

-- ============================================================
-- Verification query (run after migration)
-- ============================================================
-- SELECT proname, prosrc LIKE '%p_purpose IS DISTINCT FROM%' as has_purpose_check,
--        prosrc LIKE '%validate_transaction_aum_exists%' as has_aum_check
-- FROM pg_proc WHERE proname IN ('apply_deposit_with_crystallization', 'apply_withdrawal_with_crystallization');
