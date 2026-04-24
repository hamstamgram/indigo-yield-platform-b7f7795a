-- Migration: Restrict WITHDRAWAL to only flow through withdrawal_requests workflow
-- Fixes: D-CRIT.1, D-CRIT.2, D-CRIT.3 from security audit
-- Date: 2026-04-24

-- =============================================================================
-- 1. Remove WITHDRAWAL from apply_transaction_with_crystallization valid types
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."apply_transaction_with_crystallization"(
  "p_fund_id" "uuid", "p_investor_id" "uuid", "p_tx_type" "text",
  "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text",
  "p_new_total_aum" numeric DEFAULT NULL::numeric,
  "p_admin_id" "uuid" DEFAULT NULL::"uuid",
  "p_notes" "text" DEFAULT NULL::"text",
  "p_purpose" "text" DEFAULT 'transaction'::"text",
  "p_distribution_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_fund_last_crystal_date date;
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_crystal_amount numeric := 0;
  v_admin uuid;
  v_existing_tx uuid;
  v_lock_key bigint;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- CRITICAL: WITHDRAWAL must flow through withdrawal_requests + approve_and_complete_withdrawal
  IF p_tx_type NOT IN ('DEPOSIT', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Use approve_and_complete_withdrawal for withdrawals.', p_tx_type;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;

  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_existing_tx);
  END IF;

  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Crystallization
  IF p_tx_type IN ('DEPOSIT', 'ADJUSTMENT') THEN
    SELECT MAX(ip.last_yield_crystallization_date)
    INTO v_fund_last_crystal_date
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

    IF v_fund_last_crystal_date IS NOT NULL AND v_fund_last_crystal_date < p_tx_date THEN
      IF p_new_total_aum IS NULL THEN
        SELECT total_aum INTO p_new_total_aum
        FROM fund_daily_aum
        WHERE fund_id = p_fund_id AND aum_date <= p_tx_date AND is_voided = false
        ORDER BY aum_date DESC LIMIT 1;
      END IF;

      IF p_new_total_aum IS NOT NULL AND p_new_total_aum > 0 THEN
        v_crystal_result := crystallize_yield_before_flow(
          p_fund_id, p_new_total_aum, 'transaction', p_reference_id,
          (p_tx_date::timestamp + interval '12 hours'), v_admin, p_purpose::aum_purpose
        );
        v_crystal_amount := COALESCE((v_crystal_result->>'gross_yield')::numeric, 0);
      END IF;
    END IF;
  END IF;

  -- Get or create position
  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (investor_id, fund_id, shares, cost_basis, current_value, last_yield_crystallization_date, is_active)
    VALUES (p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true)
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN v_balance_after := v_balance_before + p_amount;
    ELSE v_balance_after := v_balance_before + ABS(p_amount);
  END CASE;

  -- Insert transaction - cast purpose to aum_purpose
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided, distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type = 'FEE' THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose::aum_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  )
  RETURNING id INTO v_tx_id;

  -- Update AUM
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose::aum_purpose, 'transaction', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id, 'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'is_new_investor', v_is_new_investor
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx FROM transactions_v2 WHERE reference_id = p_reference_id AND is_voided = false LIMIT 1;
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'tx_id', v_existing_tx);
END;
$$;

-- =============================================================================
-- 2. Remove WITHDRAWAL from apply_investor_transaction valid types
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."apply_investor_transaction"(
  "p_investor_id" "uuid", "p_fund_id" "uuid", "p_tx_type" "text",
  "p_amount" numeric, "p_tx_date" "date", "p_reference_id" "text",
  "p_notes" "text" DEFAULT NULL::"text",
  "p_admin_id" "uuid" DEFAULT NULL::"uuid",
  "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose",
  "p_distribution_id" "uuid" DEFAULT NULL::"uuid",
  "p_new_total_aum" numeric DEFAULT NULL::numeric
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_admin uuid;
  v_post_aum numeric;
  v_is_new_investor boolean := false;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- CRITICAL: WITHDRAWAL must flow through withdrawal_requests + approve_and_complete_withdrawal
  IF p_tx_type NOT IN ('DEPOSIT', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD', 'DUST') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Use approve_and_complete_withdrawal for withdrawals.', p_tx_type;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get or create position
  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    v_is_new_investor := true;
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  CASE p_tx_type
    WHEN 'DEPOSIT' THEN v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'FEE' THEN v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'DUST' THEN v_balance_after := v_balance_before + p_amount;
    ELSE v_balance_after := v_balance_before + p_amount;
  END CASE;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type = 'FEE' THEN -ABS(p_amount) ELSE p_amount END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false, p_distribution_id
  ) RETURNING id INTO v_tx_id;

  SELECT COALESCE(SUM(current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  RETURN jsonb_build_object(
    'success', true, 'tx_id', v_tx_id,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'post_transaction_aum', v_post_aum,
    'is_new_investor', v_is_new_investor
  );
END;
$$;

-- =============================================================================
-- 3. Restrict apply_withdrawal_with_crystallization to internal use only
--    It should only be called from complete_withdrawal (which is called by
--    approve_and_complete_withdrawal). Direct calls are blocked.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."apply_withdrawal_with_crystallization"(
  "p_fund_id" "uuid", "p_investor_id" "uuid", "p_amount" numeric,
  "p_new_total_aum" numeric, "p_tx_date" "date", "p_admin_id" "uuid",
  "p_notes" "text" DEFAULT NULL::"text",
  "p_purpose" "text" DEFAULT 'transaction'::"text",
  "p_tx_hash" "text" DEFAULT NULL::"text",
  "p_tx_subtype" "text" DEFAULT NULL::"text"
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_trigger_reference text;
  v_crystallization_result jsonb;
  v_snapshot_id uuid;
  v_admin uuid;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  -- CRITICAL: This function is internal-only. It must be called from complete_withdrawal.
  -- Direct RPC calls are blocked to ensure all withdrawals go through withdrawal_requests.
  IF current_setting('indigo.withdrawal_internal_call', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Direct calls to apply_withdrawal_with_crystallization are blocked. Use approve_and_complete_withdrawal instead.';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT asset, class INTO v_fund_asset, v_fund_class
  FROM funds WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  v_trigger_reference := 'wd_' || substr(md5(random()::text), 1, 12);

  -- Crystallize yield before withdrawal
  v_crystallization_result := crystallize_yield_before_flow(
    p_fund_id, p_new_total_aum, 'transaction', v_trigger_reference,
    (p_tx_date::timestamp + interval '12 hours'), v_admin, p_purpose::aum_purpose
  );

  -- Apply the withdrawal transaction
  SELECT apply_investor_transaction(
    p_investor_id, p_fund_id, 'WITHDRAWAL', p_amount,
    p_tx_date, v_trigger_reference, p_notes, v_admin, p_purpose::aum_purpose
  )::json INTO v_result;

  v_tx_id := (v_result->>'tx_id')::uuid;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'crystallization', v_crystallization_result,
    'fund_asset', v_fund_asset,
    'fund_class', v_fund_class
  );
END;
$$;

-- =============================================================================
-- 4. Update complete_withdrawal to set the internal call flag
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."complete_withdrawal"(
  "p_request_id" "uuid",
  "p_closing_aum" numeric,
  "p_event_ts" timestamp with time zone,
  "p_transaction_hash" "text",
  "p_admin_notes" "text"
) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_request RECORD;
  v_fund_id uuid;
  v_result json;
  v_withdrawal_tx_id uuid;
BEGIN
  v_admin := auth.uid();

  IF NOT is_admin(v_admin) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  -- Set internal flag so apply_withdrawal_with_crystallization allows the call
  PERFORM set_config('indigo.withdrawal_internal_call', 'true', true);

  -- Fetch withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status::text <> 'processing' THEN
    RAISE EXCEPTION 'Can only complete withdrawals in processing status. Current: %', v_request.status;
  END IF;

  IF v_request.processed_amount IS NULL OR v_request.processed_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has no processed amount';
  END IF;

  -- Execute withdrawal with crystallization (atomic position + AUM update)
  v_result := public.apply_withdrawal_with_crystallization(
    p_fund_id := v_request.fund_id,
    p_investor_id := v_request.investor_id,
    p_amount := ABS(v_request.processed_amount)::numeric(28,10),
    p_new_total_aum := p_closing_aum,
    p_tx_date := CURRENT_DATE,
    p_admin_id := v_admin,
    p_notes := p_admin_notes,
    p_purpose := 'transaction'
  );

  v_withdrawal_tx_id := (v_result->>'transaction_id')::uuid;

  -- Update request status
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    tx_hash = COALESCE(p_transaction_hash, tx_hash),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_request.processed_amount,
      'tx_hash', p_transaction_hash,
      'withdrawal_tx_id', v_withdrawal_tx_id,
      'crystallization', v_result->'crystallization',
      'completed_by', v_admin
    )
  );

  RETURN TRUE;
END;
$$;

-- =============================================================================
-- 5. Update trigger error messages to reflect new canonical RPCs
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."enforce_canonical_position_write"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$ BEGIN IF public.is_canonical_rpc() THEN RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END; END IF; RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on investor_positions is blocked. Use canonical RPC functions like apply_transaction_with_crystallization.', TG_OP USING HINT = 'Set indigo.canonical_rpc = true via set_canonical_rpc() in your RPC function.', ERRCODE = 'P0001'; END; $$;

CREATE OR REPLACE FUNCTION "public"."enforce_canonical_transaction_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO public
AS $$ BEGIN IF public.is_canonical_rpc() THEN RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END; END IF; RAISE EXCEPTION 'CANONICAL_MUTATION_REQUIRED: Direct % on transactions_v2 is blocked. Use canonical RPC functions: apply_transaction_with_crystallization or apply_investor_transaction.', TG_OP USING HINT = 'Set indigo.canonical_rpc = true via set_canonical_rpc() in your RPC function.', ERRCODE = 'P0001'; END; $$;

COMMENT ON TRIGGER "trg_enforce_canonical_position" ON "public"."investor_positions" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs like apply_transaction_with_crystallization.';
COMMENT ON TRIGGER "trg_enforce_canonical_transaction" ON "public"."transactions_v2" IS 'Blocks direct INSERT/UPDATE/DELETE. Use canonical RPCs: apply_transaction_with_crystallization or apply_investor_transaction.';
