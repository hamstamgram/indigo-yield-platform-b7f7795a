-- ============================================================================
-- ADMIN GATES: Finance RPCs (Deposit/Withdrawal/Preflow)
-- Date: 2026-01-14
--
-- Non-negotiables:
-- - Finance mutations must be ADMIN-only (enforced via is_admin() inside function body)
-- - Do NOT introduce USD columns/conversions
-- - Do NOT introduce management fee (performance fee only)
-- ============================================================================

BEGIN;

-- ============================================================================
-- ensure_preflow_aum: add ADMIN gate (idempotent)
-- Signature must remain: (fund_id, date, purpose, total_aum, admin_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_preflow_aum(
  p_fund_id uuid,
  p_date date,
  p_purpose aum_purpose,
  p_total_aum numeric,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_new_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can manage preflow AUM'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_existing
  FROM get_existing_preflow_aum(p_fund_id, p_date, p_purpose);

  IF v_existing.aum_event_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'reused_existing',
      'aum_event_id', v_existing.aum_event_id,
      'closing_aum', v_existing.closing_aum,
      'message', 'Reused existing preflow AUM for this fund/date/purpose'
    );
  END IF;

  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, p_date, (p_date || ' 00:00:00')::timestamptz, 'preflow',
    'PREFLOW-' || p_fund_id::text || '-' || p_date::text,
    0, p_total_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created_new',
    'aum_event_id', v_new_id,
    'closing_aum', p_total_aum,
    'message', 'Created new preflow AUM entry'
  );
END;
$$;

COMMENT ON FUNCTION public.ensure_preflow_aum IS
  'Idempotent preflow AUM creation. ADMIN-only via is_admin().';

-- ============================================================================
-- apply_deposit_with_crystallization: add ADMIN gate (keep existing logic)
-- ============================================================================

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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can apply deposits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'p_effective_date is required. Cannot use implicit date. Received NULL.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Deposit must use transaction purpose. Received: %. Use p_purpose=''transaction'' for deposit flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record first using ensure_transaction_aum() or manual entry.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('deposit:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_balance_before := COALESCE(v_balance_before, 0);

  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit',
    'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz, p_admin_id, p_purpose
  );

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

  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', ABS(p_amount), p_effective_date, v_fund_asset, v_fund_class,
    v_reference_id, COALESCE(p_notes, 'Deposit with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  ) RETURNING id INTO v_tx_id;

  INSERT INTO investor_positions (
    investor_id, fund_id, current_value, shares, is_active, updated_at
  )
  VALUES (
    p_investor_id, p_fund_id, v_balance_after, v_balance_after, true, now()
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    is_active = true,
    updated_at = now();

  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_effective_date, p_purpose, p_admin_id);

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

COMMENT ON FUNCTION public.apply_deposit_with_crystallization IS
  'Process deposit with yield crystallization. ADMIN-only via is_admin().';

-- ============================================================================
-- apply_withdrawal_with_crystallization: add ADMIN gate (keep existing logic)
-- ============================================================================

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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can apply withdrawals'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'p_effective_date is required. Cannot use implicit date. Received NULL.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Withdrawal must use transaction purpose. Received: %. Use p_purpose=''transaction'' for withdrawal flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record first using ensure_transaction_aum() or manual entry.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('withdrawal:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_balance_before IS NULL OR v_balance_before < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient balance. Available: %s, Requested: %s',
        COALESCE(v_balance_before, 0), p_amount)
    );
  END IF;

  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'withdrawal',
    'WDR-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz, p_admin_id, p_purpose
  );

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

  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -ABS(p_amount), p_effective_date, v_fund_asset, v_fund_class,
    v_reference_id, COALESCE(p_notes, 'Withdrawal with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  ) RETURNING id INTO v_tx_id;

  UPDATE investor_positions SET
    current_value = v_balance_after,
    shares = v_balance_after,
    is_active = CASE WHEN v_balance_after > 0 THEN true ELSE is_active END,
    updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_aum_result := recalculate_fund_aum_for_date(p_fund_id, p_effective_date, p_purpose, p_admin_id);

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

COMMENT ON FUNCTION public.apply_withdrawal_with_crystallization IS
  'Process withdrawal with yield crystallization. ADMIN-only via is_admin().';

COMMIT;

