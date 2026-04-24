-- Migration: Database consistency fixes from security audit
-- Fixes: D-HIGH.1, D-HIGH.2, D-HIGH.4, D-MED.1, D-MED.2
-- Date: 2026-04-24

-- =============================================================================
-- 1. D-HIGH.1: Standardize ADJUSTMENT sign handling
-- apply_transaction_with_crystallization was storing ABS(p_amount) for ADJUSTMENT
-- while apply_investor_transaction preserved raw sign. Align to preserve sign.
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

  -- Insert transaction - preserve raw sign for ADJUSTMENT
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided, distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, p_tx_date, v_fund.asset,
    CASE
      WHEN p_tx_type = 'FEE' THEN -ABS(p_amount)
      WHEN p_tx_type = 'ADJUSTMENT' THEN p_amount
      ELSE ABS(p_amount)
    END,
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
-- 2. D-MED.2: Add INTERNAL_WITHDRAWAL to validate_transaction_type trigger
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."validate_transaction_type"()
RETURNS TRIGGER
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_current_value numeric;
BEGIN
  -- SKIP validation entirely when voiding a transaction
  IF TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false THEN
    RETURN NEW;
  END IF;

  -- Force negative amounts for outflow transaction types
  IF NEW.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') AND NEW.amount > 0 THEN
    NEW.amount := -ABS(NEW.amount);
  END IF;

  -- Check sufficient balance for withdrawals only (INSERT operations)
  IF TG_OP = 'INSERT' AND NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
    SELECT COALESCE(current_value, 0) INTO v_current_value
    FROM investor_positions
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    IF v_current_value IS NULL OR v_current_value < ABS(NEW.amount) THEN
      RAISE EXCEPTION 'Insufficient balance for withdrawal. Current: %, Requested: %', v_current_value, ABS(NEW.amount);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. D-HIGH.4: Remove manual_admin source bypass from enforce_transaction_via_rpc
-- All admin mutations must go through canonical RPCs with audit logging.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."enforce_transaction_via_rpc"()
RETURNS TRIGGER
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  -- Allow if called from a known RPC (check source column)
  IF NEW.source IN (
    'rpc_canonical',
    'crystallization',
    'system',
    'migration',
    'yield_distribution',
    'ib_allocation',
    'fee_allocation',
    'system_bootstrap',
    'internal_routing',
    'yield_correction',
    'withdrawal_completion',
    'investor_wizard',
    'stress_test'
  ) THEN
    RETURN NEW;
  END IF;

  -- Block all other sources (including manual_admin)
  RAISE EXCEPTION 'Direct transaction inserts are not allowed. Use apply_transaction_with_crystallization() RPC. Source: %', COALESCE(NEW.source::text, 'NULL');
END;
$$;

-- =============================================================================
-- 4. D-MED.1: Standardize is_canonical_rpc to check both flag namespaces
-- Some RPCs set app.canonical_rpc, others set indigo.canonical_rpc.
-- The trigger checks both; is_canonical_rpc() should too.
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."is_canonical_rpc"()
RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true'
      OR COALESCE(current_setting('app.canonical_rpc', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =============================================================================
-- 5. D-HIGH.2: Rename stale transaction_type enum to legacy_transaction_type
-- The transactions_v2 table uses tx_type (13 values). This old enum (5 values)
-- is unused and risks accidental reuse.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public' AND t.typname = 'transaction_type'
  ) THEN
    -- Only rename if no columns depend on it
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE data_type = 'USER-DEFINED'
        AND udt_name = 'transaction_type'
    ) THEN
      ALTER TYPE "public"."transaction_type" RENAME TO "legacy_transaction_type";
    END IF;
  END IF;
END $$;
