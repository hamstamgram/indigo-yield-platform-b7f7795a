-- ============================================================================
-- P0-OPS OPERATIONAL FIXES MIGRATION
-- Date: 2026-01-14
-- Version: 1.0.0
--
-- Fixes operational issues encountered in production:
--   P0-OPS-001: Preflow AUM reuse (don't create duplicate AUM for same fund/date/purpose)
--   P0-OPS-002: Void & Reissue workflow (immutable ledger pattern)
--   P0-OPS-003: Date correctness (no implicit CURRENT_DATE defaults)
--   P0-OPS-004: Allow negative/zero yield in AUM recording
--   P0-OPS-005: Strict period as-of filtering
-- ============================================================================

BEGIN;

-- ============================================================================
-- P0-OPS-001: PREFLOW AUM REUSE
-- If a preflow AUM checkpoint already exists for this fund/date/purpose,
-- reuse it instead of creating a duplicate.
-- ============================================================================

-- Helper function to get existing preflow AUM or NULL
CREATE OR REPLACE FUNCTION get_existing_preflow_aum(
  p_fund_id uuid,
  p_event_date date,
  p_purpose aum_purpose
)
RETURNS TABLE(
  aum_event_id uuid,
  closing_aum numeric(28,10),
  event_ts timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, closing_aum, event_ts
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND event_date = p_event_date
    AND purpose = p_purpose
    AND is_voided = false
    AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
  ORDER BY event_ts DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_existing_preflow_aum IS
  'Returns existing preflow AUM for fund/date/purpose. Used to avoid duplicate AUM entries.';

-- Update crystallize_yield_before_flow to reuse existing preflow AUM
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose  -- NO DEFAULT - MUST be explicit
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_checkpoint RECORD;
  v_existing_preflow RECORD;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;
  v_reused_preflow boolean := false;

  -- Conservation tracking
  v_total_gross_allocated numeric(28,10) := 0;
  v_total_fees_allocated numeric(28,10) := 0;
  v_total_net_allocated numeric(28,10) := 0;
  v_dust_amount numeric(28,10) := 0;
  v_dust_receiver_id uuid;

  v_investor RECORD;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_investor_share_pct numeric(18,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
  v_scale int := 10;  -- Precision for rounding
BEGIN
  -- P0-OPS-001a: MANDATORY purpose check - must not be NULL
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required. Must be explicitly specified.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;

  -- ============================================================
  -- P0-OPS-001: CHECK FOR EXISTING PREFLOW AUM
  -- If we already have a preflow AUM for this fund/date/purpose,
  -- reuse it instead of creating a duplicate.
  -- ============================================================
  SELECT * INTO v_existing_preflow
  FROM get_existing_preflow_aum(p_fund_id, v_event_date, p_purpose);

  IF v_existing_preflow.aum_event_id IS NOT NULL THEN
    -- Reuse existing preflow - just return success with existing snapshot
    v_reused_preflow := true;
    v_snapshot_id := v_existing_preflow.aum_event_id;

    -- Still need to calculate opening AUM for the return value
    SELECT
      id,
      COALESCE(post_flow_aum, closing_aum) as effective_aum,
      event_ts,
      event_date
    INTO v_last_checkpoint
    FROM fund_aum_events
    WHERE fund_id = p_fund_id
      AND is_voided = false
      AND purpose = p_purpose
      AND event_ts < v_existing_preflow.event_ts
    ORDER BY event_ts DESC
    LIMIT 1;

    IF v_last_checkpoint.id IS NULL THEN
      v_opening_aum := 0;
      v_period_start := v_event_date;
    ELSE
      v_opening_aum := v_last_checkpoint.effective_aum;
      v_period_start := v_last_checkpoint.event_date;
    END IF;

    v_yield_amount := v_existing_preflow.closing_aum - v_opening_aum;
    IF v_opening_aum > 0 THEN
      v_yield_pct := ROUND((v_yield_amount / v_opening_aum) * 100, v_scale);
    ELSE
      v_yield_pct := 0;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'snapshot_id', v_snapshot_id,
      'fund_id', p_fund_id,
      'trigger_date', v_event_date,
      'trigger_type', p_trigger_type,
      'period_start', v_period_start,
      'opening_aum', v_opening_aum,
      'closing_aum', v_existing_preflow.closing_aum,
      'fund_yield_pct', v_yield_pct,
      'gross_yield', v_yield_amount,
      'reused_preflow', true,
      'message', 'Reused existing preflow AUM for this fund/date/purpose'
    );
  END IF;

  -- No existing preflow - proceed with normal crystallization

  -- Get last checkpoint - USE post_flow_aum if available, otherwise closing_aum
  SELECT
    id,
    COALESCE(post_flow_aum, closing_aum) as effective_aum,
    event_ts,
    event_date
  INTO v_last_checkpoint
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND is_voided = false
    AND purpose = p_purpose
    AND event_ts < p_event_ts
  ORDER BY event_ts DESC
  LIMIT 1;

  -- Determine opening AUM and period start
  IF v_last_checkpoint.id IS NULL THEN
    v_opening_aum := 0;
    v_period_start := v_event_date;
  ELSE
    v_opening_aum := v_last_checkpoint.effective_aum;
    v_period_start := v_last_checkpoint.event_date;
  END IF;

  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;

  IF v_opening_aum > 0 THEN
    v_yield_pct := ROUND((v_yield_amount / v_opening_aum) * 100, v_scale);
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Insert the AUM checkpoint event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_snapshot_id;

  -- ============================================================
  -- P0-OPS-004: ALLOW NEGATIVE AND ZERO YIELD
  -- Changed from: IF v_yield_amount > 0 AND v_opening_aum > 0
  -- To: IF v_opening_aum > 0 (process yield regardless of sign)
  -- ============================================================
  IF v_opening_aum > 0 THEN

    -- Find the largest investor to receive dust
    SELECT ip.investor_id INTO v_dust_receiver_id
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
    LIMIT 1;

    -- Create yield snapshot (even for negative yield)
    INSERT INTO fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) VALUES (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    -- Process each investor with explicit fee calculation (PERFORMANCE FEE ONLY, no mgmt fee)
    FOR v_investor IN
      SELECT
        ip.investor_id,
        ip.current_value,
        COALESCE(ifs.fee_pct, 0.30) as fee_pct,  -- Default 30% performance fee
        ROW_NUMBER() OVER (ORDER BY ip.current_value DESC) as rank
      FROM investor_positions ip
      LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
        AND ifs.fund_id = p_fund_id
        AND ifs.effective_date <= v_event_date
        AND (ifs.end_date IS NULL OR ifs.end_date >= v_event_date)
      WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    LOOP
      -- Calculate investor's share percentage
      v_investor_share_pct := ROUND((v_investor.current_value / v_opening_aum) * 100, v_scale);

      -- Calculate gross yield (investor's proportional share - can be negative)
      v_investor_yield := ROUND(v_yield_amount * (v_investor.current_value / v_opening_aum), v_scale);

      -- P0-OPS-004: Handle negative yield - no fees on losses
      IF v_investor_yield > 0 THEN
        -- Get fee percentage (PERFORMANCE FEE ONLY)
        v_fee_pct := v_investor.fee_pct;
        -- Calculate performance fee amount (from gross)
        v_investor_fee := ROUND(v_investor_yield * v_fee_pct, v_scale);
      ELSE
        -- No fees on negative yield (losses)
        v_fee_pct := 0;
        v_investor_fee := 0;
      END IF;

      -- CONSERVATION IDENTITY: net = gross - fee
      v_investor_net := v_investor_yield - v_investor_fee;

      -- Track totals for conservation
      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      -- Generate reference ID
      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      -- Insert yield event with all fee fields populated
      INSERT INTO investor_yield_events (
        investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
        fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
        fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
        period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
      ) VALUES (
        v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
        CASE WHEN p_trigger_reference ~ '^[0-9a-f-]{36}$' THEN p_trigger_reference::uuid ELSE NULL END,
        v_opening_aum, p_closing_aum, v_investor.current_value,
        v_investor_share_pct, v_yield_pct, v_investor_yield,
        v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
        v_days_in_period, 'admin_only', v_reference_id, p_admin_id
      );

      v_investors_processed := v_investors_processed + 1;
    END LOOP;

    -- Calculate dust (rounding difference)
    v_dust_amount := v_yield_amount - v_total_gross_allocated;

    -- Create distribution record with conservation data
    INSERT INTO yield_distributions (
      fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
      gross_yield, net_yield, total_fees, investor_count, distribution_type, status,
      period_start, period_end, dust_amount, dust_receiver_id, created_by,
      reference_id
    ) VALUES (
      p_fund_id, v_event_date, p_purpose, false, p_closing_aum, v_opening_aum,
      v_yield_amount, v_total_net_allocated, v_total_fees_allocated,
      v_investors_processed, p_trigger_type, 'completed',
      v_period_start, v_event_date, v_dust_amount, v_dust_receiver_id, p_admin_id,
      'DIST-' || p_fund_id::text || '-' || v_event_date::text
    )
    RETURNING id INTO v_distribution_id;

    -- If dust is significant (>0.0001), allocate to largest investor
    IF ABS(v_dust_amount) > 0.0001 AND v_dust_receiver_id IS NOT NULL THEN
      UPDATE investor_yield_events
      SET gross_yield_amount = gross_yield_amount + v_dust_amount,
          net_yield_amount = net_yield_amount + v_dust_amount
      WHERE investor_id = v_dust_receiver_id
        AND fund_id = p_fund_id
        AND event_date = v_event_date
        AND reference_id LIKE 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':%';

      -- Update conservation totals
      v_total_gross_allocated := v_total_gross_allocated + v_dust_amount;
      v_total_net_allocated := v_total_net_allocated + v_dust_amount;
    END IF;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'fund_yield_pct', v_yield_pct,
    'gross_yield', v_yield_amount,
    'investors_processed', v_investors_processed,
    'total_gross_allocated', v_total_gross_allocated,
    'total_fees_allocated', v_total_fees_allocated,
    'total_net_allocated', v_total_net_allocated,
    'dust_amount', v_dust_amount,
    'dust_receiver_id', v_dust_receiver_id,
    'reused_preflow', false,
    'conservation_check', jsonb_build_object(
      'gross_matches', ABS(v_yield_amount - v_total_gross_allocated) < 0.0001,
      'fee_identity_holds', ABS(v_total_gross_allocated - v_total_net_allocated - v_total_fees_allocated) < 0.0001
    )
  );
END;
$$;

COMMENT ON FUNCTION crystallize_yield_before_flow IS
  'Crystallize yield before deposit/withdrawal. NO DEFAULT PURPOSE. P0-OPS-001: Reuses existing preflow AUM. P0-OPS-004: Allows negative yield.';


-- ============================================================================
-- P0-OPS-002: VOID & REISSUE WORKFLOW
-- Immutable ledger pattern - no editing, only void + reissue
-- ============================================================================

-- Drop existing void functions to avoid signature conflicts
-- Existing signature: void_transaction(p_transaction_id uuid, p_reason text, p_actor_id uuid)
DROP FUNCTION IF EXISTS void_transaction(uuid, text, uuid);
DROP FUNCTION IF EXISTS void_transaction(uuid, uuid, text);
DROP FUNCTION IF EXISTS void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text);

-- Void a transaction and cascade void to related records
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_voided_count int := 0;
  v_related_events int := 0;
  v_related_distributions int := 0;
BEGIN
  -- Check admin permission
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can void transactions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get transaction details
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
  END IF;

  IF v_tx.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction already voided');
  END IF;

  -- Void the transaction
  UPDATE transactions_v2
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;
  v_voided_count := 1;

  -- Cascade void to related yield events (same investor/fund/date)
  UPDATE investor_yield_events
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id,
      void_reason = 'Cascade from void_transaction: ' || p_reason
  WHERE fund_id = v_tx.fund_id
    AND investor_id = v_tx.investor_id
    AND event_date = v_tx.tx_date
    AND is_voided = false;
  GET DIAGNOSTICS v_related_events = ROW_COUNT;

  -- Cascade void to related yield distributions
  UPDATE yield_distributions
  SET status = 'voided',
      voided_at = now(),
      voided_by = p_admin_id
  WHERE fund_id = v_tx.fund_id
    AND effective_date = v_tx.tx_date
    AND status != 'voided';
  GET DIAGNOSTICS v_related_distributions = ROW_COUNT;

  -- Cascade void to AUM events triggered by this transaction
  UPDATE fund_aum_events
  SET is_voided = true,
      voided_at = now(),
      voided_by = p_admin_id
  WHERE fund_id = v_tx.fund_id
    AND event_date = v_tx.tx_date
    AND trigger_reference LIKE '%' || v_tx.investor_id::text || '%'
    AND is_voided = false;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'VOID_TRANSACTION',
    'transactions_v2',
    p_transaction_id::text,
    p_admin_id,
    jsonb_build_object(
      'reason', p_reason,
      'voided_events', v_related_events,
      'voided_distributions', v_related_distributions,
      'original_amount', v_tx.amount,
      'original_type', v_tx.type
    ),
    jsonb_build_object('fund_id', v_tx.fund_id, 'investor_id', v_tx.investor_id, 'tx_date', v_tx.tx_date)
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_transaction', true,
    'voided_yield_events', v_related_events,
    'voided_distributions', v_related_distributions,
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION void_transaction(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION void_transaction IS
  'Void a transaction and cascade void to related yield events and distributions. Immutable ledger pattern - use void + reissue instead of edit.';


-- Void & reissue a transaction (atomic replacement)
CREATE OR REPLACE FUNCTION void_and_reissue_transaction(
  p_original_tx_id uuid,
  p_new_amount numeric,
  p_new_date date,
  p_new_notes text,
  p_closing_aum numeric,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_void_result jsonb;
  v_new_result jsonb;
BEGIN
  -- Check admin permission
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can void and reissue transactions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get original transaction
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_original_tx_id;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Original transaction not found');
  END IF;

  IF v_tx.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Original transaction already voided');
  END IF;

  -- P0-OPS-003: Date must be explicit
  IF p_new_date IS NULL THEN
    RAISE EXCEPTION 'p_new_date is required. Cannot use implicit date.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- Void the original
  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void for reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to void original transaction',
      'void_result', v_void_result
    );
  END IF;

  -- Recalculate position from ledger after void
  PERFORM admin_reconcile_position(v_tx.fund_id, v_tx.investor_id, p_admin_id);

  -- Create the new transaction based on type
  IF v_tx.type = 'DEPOSIT' THEN
    v_new_result := apply_deposit_with_crystallization(
      v_tx.fund_id,
      v_tx.investor_id,
      ABS(COALESCE(p_new_amount, v_tx.amount)),
      p_closing_aum,
      COALESCE(p_new_date, v_tx.tx_date),
      p_admin_id,
      COALESCE(p_new_notes, 'Reissued from ' || p_original_tx_id::text || ': ' || p_reason),
      'transaction'::aum_purpose
    );
  ELSIF v_tx.type = 'WITHDRAWAL' THEN
    v_new_result := apply_withdrawal_with_crystallization(
      v_tx.fund_id,
      v_tx.investor_id,
      ABS(COALESCE(p_new_amount, ABS(v_tx.amount))),
      p_closing_aum,
      COALESCE(p_new_date, v_tx.tx_date),
      p_admin_id,
      COALESCE(p_new_notes, 'Reissued from ' || p_original_tx_id::text || ': ' || p_reason),
      'transaction'::aum_purpose
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot reissue transaction type: ' || v_tx.type,
      'void_result', v_void_result
    );
  END IF;

  -- Audit log for reissue
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_TRANSACTION',
    'transactions_v2',
    p_original_tx_id::text,
    p_admin_id,
    jsonb_build_object(
      'original_id', p_original_tx_id,
      'new_amount', p_new_amount,
      'new_date', p_new_date,
      'reason', p_reason,
      'new_result', v_new_result
    ),
    jsonb_build_object('fund_id', v_tx.fund_id, 'investor_id', v_tx.investor_id)
  );

  RETURN jsonb_build_object(
    'success', COALESCE((v_new_result->>'success')::boolean, false),
    'void_result', v_void_result,
    'new_transaction_result', v_new_result,
    'original_tx_id', p_original_tx_id,
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) TO authenticated;

COMMENT ON FUNCTION void_and_reissue_transaction IS
  'Void original transaction and create corrected replacement. P0-OPS-002 immutable ledger pattern.';


-- ============================================================================
-- P0-OPS-003: DATE CORRECTNESS
-- Remove implicit CURRENT_DATE defaults - require explicit dates
-- ============================================================================

-- Update deposit function to reject NULL dates
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,  -- NO DEFAULT
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
  -- P0-OPS-003: Date must be explicit
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'p_effective_date is required. Cannot use implicit date. Received NULL.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- P0: Enforce transaction purpose
  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Deposit must use transaction purpose. Received: %. Use p_purpose=''transaction'' for deposit flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- P0: Validate AUM exists for transaction date
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

COMMENT ON FUNCTION apply_deposit_with_crystallization IS
  'Process deposit with yield crystallization. P0-OPS-003: Date must be explicit (no NULL). P0-OPS-001: Reuses existing preflow AUM.';


-- Update withdrawal function to reject NULL dates
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,  -- NO DEFAULT
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
  -- P0-OPS-003: Date must be explicit
  IF p_effective_date IS NULL THEN
    RAISE EXCEPTION 'p_effective_date is required. Cannot use implicit date. Received NULL.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  -- P0: Enforce transaction purpose
  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Withdrawal must use transaction purpose. Received: %. Use p_purpose=''transaction'' for withdrawal flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- P0: Validate AUM exists for transaction date
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

COMMENT ON FUNCTION apply_withdrawal_with_crystallization IS
  'Process withdrawal with yield crystallization. P0-OPS-003: Date must be explicit (no NULL). P0-OPS-001: Reuses existing preflow AUM.';


-- ============================================================================
-- P0-OPS-005: STRICT PERIOD AS-OF FILTERING
-- Create helper functions for as-of filtering
-- ============================================================================

-- Get investor position as of a specific date
CREATE OR REPLACE FUNCTION get_investor_position_as_of(
  p_investor_id uuid,
  p_fund_id uuid,
  p_as_of_date date
)
RETURNS TABLE(
  investor_id uuid,
  fund_id uuid,
  position_value numeric(28,10),
  as_of_date date,
  last_transaction_date date,
  deposits_total numeric(28,10),
  withdrawals_total numeric(28,10),
  yield_total numeric(28,10)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH tx_summary AS (
    SELECT
      t.investor_id,
      t.fund_id,
      SUM(CASE WHEN t.type = 'DEPOSIT' AND t.tx_date <= p_as_of_date THEN t.amount ELSE 0 END) as deposits,
      SUM(CASE WHEN t.type = 'WITHDRAWAL' AND t.tx_date <= p_as_of_date THEN ABS(t.amount) ELSE 0 END) as withdrawals,
      MAX(t.tx_date) FILTER (WHERE t.tx_date <= p_as_of_date) as last_tx_date
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.is_voided = false
      AND t.tx_date <= p_as_of_date
    GROUP BY t.investor_id, t.fund_id
  ),
  yield_summary AS (
    SELECT
      ye.investor_id,
      ye.fund_id,
      SUM(ye.net_yield_amount) as yield_total
    FROM investor_yield_events ye
    WHERE ye.investor_id = p_investor_id
      AND ye.fund_id = p_fund_id
      AND ye.is_voided = false
      AND ye.event_date <= p_as_of_date
    GROUP BY ye.investor_id, ye.fund_id
  )
  SELECT
    p_investor_id,
    p_fund_id,
    COALESCE(tx.deposits, 0) - COALESCE(tx.withdrawals, 0) + COALESCE(ys.yield_total, 0) as position_value,
    p_as_of_date,
    tx.last_tx_date,
    COALESCE(tx.deposits, 0),
    COALESCE(tx.withdrawals, 0),
    COALESCE(ys.yield_total, 0)
  FROM tx_summary tx
  FULL JOIN yield_summary ys ON tx.investor_id = ys.investor_id AND tx.fund_id = ys.fund_id
  WHERE tx.investor_id IS NOT NULL OR ys.investor_id IS NOT NULL;
$$;

COMMENT ON FUNCTION get_investor_position_as_of IS
  'Get investor position value as of a specific date. P0-OPS-005 strict as-of filtering.';


-- Get fund AUM as of a specific date
CREATE OR REPLACE FUNCTION get_fund_aum_as_of(
  p_fund_id uuid,
  p_as_of_date date,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS TABLE(
  fund_id uuid,
  fund_code text,
  as_of_date date,
  purpose aum_purpose,
  aum_value numeric(28,10),
  aum_source text,
  event_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    f.id,
    f.code,
    p_as_of_date,
    p_purpose,
    COALESCE(ae.closing_aum, 0),
    CASE
      WHEN ae.id IS NOT NULL THEN 'aum_event'
      ELSE 'no_data'
    END,
    ae.id
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT id, closing_aum
    FROM fund_aum_events
    WHERE fund_id = f.id
      AND event_date <= p_as_of_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY event_date DESC, event_ts DESC
    LIMIT 1
  ) ae ON true
  WHERE f.id = p_fund_id;
$$;

COMMENT ON FUNCTION get_fund_aum_as_of IS
  'Get fund AUM as of a specific date with purpose filtering. P0-OPS-005 strict as-of filtering.';


-- Get all investor yield events in a date range
CREATE OR REPLACE FUNCTION get_investor_yield_events_in_range(
  p_investor_id uuid,
  p_fund_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  event_id uuid,
  event_date date,
  gross_yield numeric(28,10),
  fee_amount numeric(28,10),
  net_yield numeric(28,10),
  fee_pct numeric(10,6),
  fund_yield_pct numeric(18,10),
  trigger_type text,
  reference_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ye.id,
    ye.event_date,
    ye.gross_yield_amount,
    ye.fee_amount,
    ye.net_yield_amount,
    ye.fee_pct,
    ye.fund_yield_pct,
    ye.trigger_type,
    ye.reference_id
  FROM investor_yield_events ye
  WHERE ye.investor_id = p_investor_id
    AND ye.fund_id = p_fund_id
    AND ye.event_date >= p_start_date
    AND ye.event_date <= p_end_date
    AND ye.is_voided = false
  ORDER BY ye.event_date, ye.created_at;
$$;

COMMENT ON FUNCTION get_investor_yield_events_in_range IS
  'Get all investor yield events in a date range. P0-OPS-005 strict as-of filtering.';


-- ============================================================================
-- UPDATE PERMISSIONS
-- ============================================================================

-- Void functions
GRANT EXECUTE ON FUNCTION void_transaction(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION void_and_reissue_transaction(uuid, numeric, date, text, numeric, uuid, text) TO authenticated;

-- Helper functions
GRANT EXECUTE ON FUNCTION get_existing_preflow_aum(uuid, date, aum_purpose) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_investor_position_as_of(uuid, uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_fund_aum_as_of(uuid, date, aum_purpose) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_investor_yield_events_in_range(uuid, uuid, date, date) TO authenticated, service_role;

-- Crystallize function remains service_role only
REVOKE EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) TO service_role;


-- ============================================================================
-- UPDATE COMPREHENSIVE HEALTH CHECK
-- Add checks for P0-OPS fixes
-- ============================================================================

DROP FUNCTION IF EXISTS run_comprehensive_health_check();

CREATE OR REPLACE FUNCTION run_comprehensive_health_check()
RETURNS TABLE(
  check_name text,
  category text,
  check_status text,
  violation_count int,
  severity text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Yield Conservation (P0)
  check_name := 'YIELD_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'violation_type', violation_type,
      'gross_diff', gross_diff
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_yield_conservation_violations;
  RETURN NEXT;

  -- Check 2: Ledger Position Match (P0)
  check_name := 'LEDGER_POSITION_MATCH';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', r.fund_code,
      'investor_id', r.investor_id,
      'difference', r.difference
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM v_position_ledger_reconciliation r
  WHERE r.status = 'MISMATCH';
  RETURN NEXT;

  -- Check 3: Native Currency (P0)
  check_name := 'NATIVE_CURRENCY';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', t.id,
      'tx_asset', t.asset,
      'fund_asset', f.asset
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  WHERE t.asset != f.asset AND t.is_voided = false;
  RETURN NEXT;

  -- Check 4: Management Fee (P0) - must be 0 everywhere
  check_name := 'NO_MANAGEMENT_FEE';
  category := 'POLICY';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Funds with non-zero mgmt_fee_bps')
  INTO check_status, violation_count, details
  FROM funds
  WHERE mgmt_fee_bps != 0;
  RETURN NEXT;

  -- Check 5: Investor Event Conservation (P0)
  check_name := 'EVENT_CONSERVATION';
  category := 'ACCOUNTING';
  severity := 'CRITICAL';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'event_id', id,
      'gross', gross_yield_amount,
      'net', net_yield_amount,
      'fee', fee_amount,
      'diff', gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM investor_yield_events
  WHERE is_voided = false
    AND ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) >= 0.0001;
  RETURN NEXT;

  -- Check 6: AUM Purpose Consistency (P1)
  check_name := 'AUM_PURPOSE_CONSISTENCY';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'AUM records with NULL purpose')
  INTO check_status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  -- Check 7: Dust Tolerance (P1)
  check_name := 'DUST_TOLERANCE';
  category := 'ACCOUNTING';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', id,
      'dust_amount', dust_amount
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM yield_distributions
  WHERE dust_amount IS NOT NULL AND ABS(dust_amount) > 0.01 AND status != 'voided';
  RETURN NEXT;

  -- Check 8: Duplicate Preflow AUM (P0-OPS-001)
  check_name := 'DUPLICATE_PREFLOW_AUM';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', fund_id,
      'event_date', event_date,
      'purpose', purpose,
      'count', cnt
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM (
    SELECT fund_id, event_date, purpose, COUNT(*) as cnt
    FROM fund_aum_events
    WHERE is_voided = false
      AND trigger_type IN ('deposit', 'withdrawal', 'preflow')
    GROUP BY fund_id, event_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  RETURN NEXT;

  -- Check 9: Voided Transaction Cascade (P0-OPS-002)
  check_name := 'VOID_CASCADE_INTEGRITY';
  category := 'DATA_QUALITY';
  severity := 'WARNING';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_id', t.fund_id,
      'tx_date', t.tx_date,
      'voided_tx_count', 1,
      'active_events_for_date', (
        SELECT COUNT(*) FROM investor_yield_events ye
        WHERE ye.fund_id = t.fund_id
          AND ye.investor_id = t.investor_id
          AND ye.event_date = t.tx_date
          AND ye.is_voided = false
      )
    )), '[]'::jsonb)
  INTO check_status, violation_count, details
  FROM transactions_v2 t
  WHERE t.is_voided = true
    AND EXISTS (
      SELECT 1 FROM investor_yield_events ye
      WHERE ye.fund_id = t.fund_id
        AND ye.investor_id = t.investor_id
        AND ye.event_date = t.tx_date
        AND ye.is_voided = false
    );
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION run_comprehensive_health_check() TO authenticated;

COMMENT ON FUNCTION run_comprehensive_health_check IS
  'Comprehensive health check for all P0/P1 requirements including P0-OPS fixes. Run daily via cron or monitoring.';


COMMIT;
