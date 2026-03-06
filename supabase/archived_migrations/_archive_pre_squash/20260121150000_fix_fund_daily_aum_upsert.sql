-- Migration: Fix fund_daily_aum upsert in deposit/withdrawal functions
-- Created: 2026-01-21
--
-- BUG: The ON CONFLICT clause fails because fund_daily_aum uses a PARTIAL unique index
-- (fund_daily_aum_unique_active) that only applies WHERE is_voided = false.
-- PostgreSQL cannot use partial unique indexes with ON CONFLICT (columns) syntax.
--
-- FIX: Use UPDATE-then-INSERT pattern instead of ON CONFLICT

-- ============================================================================
-- FIX: apply_deposit_with_crystallization - fix fund_daily_aum upsert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_updated_rows int;
BEGIN
  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Get fund asset and class
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fund not found',
      'fund_id', p_fund_id
    );
  END IF;

  -- Build unique trigger reference INCLUDING the date
  v_trigger_reference := 'deposit:' || p_investor_id::text || ':' || p_effective_date::text;

  -- Perform crystallization first - records preflow AUM
  v_crystallization_result := public.crystallize_yield_before_flow(
    p_fund_id,
    p_closing_aum,
    'deposit'::text,
    v_trigger_reference,
    (p_effective_date::timestamp + interval '09:00:00')::timestamptz,
    p_admin_id,
    p_purpose::public.aum_purpose
  );

  -- Get the snapshot ID from crystallization result
  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;

  -- Create the deposit transaction
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    notes,
    created_by,
    is_system_generated,
    visibility_scope,
    purpose,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    'DEPOSIT'::public.tx_type,
    ABS(p_amount),
    v_fund_asset,
    v_fund_class,
    p_effective_date,
    COALESCE(p_notes, 'Deposit via canonical RPC'),
    p_admin_id,
    false,
    'admin_only'::public.visibility_scope,
    p_purpose::public.aum_purpose,
    'rpc_canonical'
  )
  RETURNING id INTO v_tx_id;

  -- FIX: Update post_flow_aum = preflow_aum + deposit_amount
  v_post_flow_aum := p_closing_aum + ABS(p_amount);

  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events
    SET post_flow_aum = v_post_flow_aum,
        closing_aum = v_post_flow_aum
    WHERE id = v_snapshot_id;
  END IF;

  -- FIX: Use UPDATE-then-INSERT pattern for fund_daily_aum
  -- (Cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_post_flow_aum,
      is_voided = false,
      updated_at = now(),
      updated_by = p_admin_id
  WHERE fund_id = p_fund_id
    AND aum_date = p_effective_date
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_by, is_voided)
    VALUES (p_fund_id, p_effective_date, v_post_flow_aum, p_purpose::aum_purpose, p_admin_id, false);
  END IF;

  v_result := json_build_object(
    'success', true,
    'message', 'Deposit applied successfully',
    'amount', p_amount,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transaction_id', v_tx_id,
    'preflow_aum', p_closing_aum,
    'post_flow_aum', v_post_flow_aum
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$;


-- ============================================================================
-- FIX: apply_withdrawal_with_crystallization - fix fund_daily_aum upsert
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_new_total_aum numeric,
  p_tx_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL::text,
  p_purpose text DEFAULT 'transaction'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_current_position numeric;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_post_flow_aum numeric;
  v_updated_rows int;
BEGIN
  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Get fund asset and class
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds
  WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fund not found',
      'fund_id', p_fund_id
    );
  END IF;

  -- Check investor has sufficient balance
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_current_position IS NULL OR v_current_position < ABS(p_amount) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'available', COALESCE(v_current_position, 0),
      'requested', ABS(p_amount)
    );
  END IF;

  -- Build unique trigger reference INCLUDING the date
  v_trigger_reference := 'withdrawal:' || p_investor_id::text || ':' || p_tx_date::text;

  -- Perform crystallization first - records preflow AUM
  v_crystallization_result := public.crystallize_yield_before_flow(
    p_fund_id,
    p_new_total_aum,
    'withdrawal'::text,
    v_trigger_reference,
    (p_tx_date::timestamp + interval '09:00:00')::timestamptz,
    p_admin_id,
    p_purpose::public.aum_purpose
  );

  -- Get the snapshot ID from crystallization result
  v_snapshot_id := (v_crystallization_result->>'snapshot_id')::uuid;

  -- Create the withdrawal transaction (negative amount)
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    notes,
    created_by,
    is_system_generated,
    visibility_scope,
    purpose,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    'WITHDRAWAL'::public.tx_type,
    -1 * ABS(p_amount),
    v_fund_asset,
    v_fund_class,
    p_tx_date,
    COALESCE(p_notes, 'Withdrawal via canonical RPC'),
    p_admin_id,
    false,
    'admin_only'::public.visibility_scope,
    p_purpose::public.aum_purpose,
    'rpc_canonical'
  )
  RETURNING id INTO v_tx_id;

  -- FIX: Update post_flow_aum = preflow_aum - withdrawal_amount
  v_post_flow_aum := p_new_total_aum - ABS(p_amount);

  IF v_snapshot_id IS NOT NULL THEN
    UPDATE fund_aum_events
    SET post_flow_aum = v_post_flow_aum,
        closing_aum = v_post_flow_aum
    WHERE id = v_snapshot_id;
  END IF;

  -- FIX: Use UPDATE-then-INSERT pattern for fund_daily_aum
  -- (Cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_post_flow_aum,
      is_voided = false,
      updated_at = now(),
      updated_by = p_admin_id
  WHERE fund_id = p_fund_id
    AND aum_date = p_tx_date
    AND purpose = p_purpose::aum_purpose
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, created_by, is_voided)
    VALUES (p_fund_id, p_tx_date, v_post_flow_aum, p_purpose::aum_purpose, p_admin_id, false);
  END IF;

  v_result := json_build_object(
    'success', true,
    'message', 'Withdrawal applied successfully',
    'amount', p_amount,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transaction_id', v_tx_id,
    'preflow_aum', p_new_total_aum,
    'post_flow_aum', v_post_flow_aum
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$function$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION apply_deposit_with_crystallization IS
'Apply a deposit with crystallize-before-flow accounting. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';

COMMENT ON FUNCTION apply_withdrawal_with_crystallization IS
'Apply a withdrawal with crystallize-before-flow accounting. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';
