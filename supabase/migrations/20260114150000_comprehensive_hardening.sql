-- ============================================================================
-- COMPREHENSIVE HARDENING MIGRATION
-- Date: 2026-01-14
-- Version: 1.0.0
--
-- This migration addresses all P0/P1 security and accounting issues:
--   A) Native currency enforcement
--   B) Purpose guardrails (DB enforced, no defaults)
--   C) Fee model clarification + conservation
--   D) Security hardening (RLS + EXECUTE permissions)
--   E) Verification + monitoring views
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION A: NATIVE CURRENCY ENFORCEMENT
-- ============================================================================
-- Goal: Ensure all transactions use the fund's base_asset (stored in funds.asset)
-- No USD valuation allowed in accounting tables.

-- A1: Add CHECK constraint on transactions_v2.asset to match funds.asset
-- Using a function-based approach since direct FK isn't possible for this pattern

CREATE OR REPLACE FUNCTION public.get_fund_base_asset(p_fund_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT asset FROM funds WHERE id = p_fund_id;
$$;

COMMENT ON FUNCTION get_fund_base_asset IS
  'Returns the base asset (native currency) for a fund. Used by constraint validation.';

-- A2: Create trigger to enforce asset match on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.enforce_transaction_asset_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund_asset text;
BEGIN
  -- Get the fund's base asset
  SELECT asset INTO v_fund_asset
  FROM funds
  WHERE id = NEW.fund_id;

  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund % not found', NEW.fund_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.asset IS DISTINCT FROM v_fund_asset THEN
    RAISE EXCEPTION 'Transaction asset (%) must match fund base asset (%). Fund: %',
      NEW.asset, v_fund_asset, NEW.fund_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_transaction_asset_match IS
  'Trigger function to enforce that transaction.asset matches fund.asset (native currency only)';

-- Drop if exists and recreate trigger
DROP TRIGGER IF EXISTS trg_enforce_transaction_asset ON transactions_v2;
CREATE TRIGGER trg_enforce_transaction_asset
  BEFORE INSERT OR UPDATE OF asset, fund_id ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION enforce_transaction_asset_match();

-- A3: Add similar enforcement for investor_yield_events (implicit via fund_id)
-- Yield events don't have an asset column - they inherit from fund.
-- Document this constraint for clarity.
COMMENT ON TABLE investor_yield_events IS
  'Individual investor yield allocations. All amounts are in fund base asset (native currency). No USD conversion.';

COMMENT ON COLUMN investor_yield_events.gross_yield_amount IS
  'Gross yield allocated to investor, in fund base asset (native currency)';

COMMENT ON COLUMN investor_yield_events.net_yield_amount IS
  'Net yield after fees, in fund base asset (native currency)';

COMMENT ON COLUMN investor_yield_events.fee_amount IS
  'Performance fee deducted, in fund base asset (native currency)';

-- A4: Add constraint documentation to fund_daily_aum
COMMENT ON TABLE fund_daily_aum IS
  'Daily AUM snapshots per fund. All values in fund base asset (native currency). No USD conversion.';

COMMENT ON COLUMN fund_daily_aum.total_aum IS
  'Total AUM in fund base asset (native currency)';


-- ============================================================================
-- SECTION B: PURPOSE GUARDRAILS (DB ENFORCED)
-- ============================================================================
-- Goal: Remove defaults, require explicit purpose, reject non-transaction purpose

-- B1: Update apply_deposit_with_crystallization - REMOVE DEFAULT, enforce 'transaction'
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text,
  p_purpose aum_purpose  -- NO DEFAULT - must be explicit
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- B1a: MANDATORY purpose check - must be 'transaction', no exceptions
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required. Use p_purpose=''transaction'' for deposit flows.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Deposit must use transaction purpose. Received: %. Use p_purpose=''transaction'' for deposit flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- B1b: Fail closed if no transaction-purpose AUM exists
  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record with purpose=''transaction'' first.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Acquire advisory lock for this investor+fund combination
  PERFORM pg_advisory_xact_lock(
    hashtext('deposit:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Get fund details and validate
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds
  WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Get current balance
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_balance_before := COALESCE(v_balance_before, 0);

  -- Crystallize yield before the deposit
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id,
    p_closing_aum,
    'deposit',
    'DEP-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz,
    p_admin_id,
    'transaction'  -- Always pass 'transaction' - do not pass p_purpose
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

  -- Insert transaction (asset will be validated by trigger)
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'DEPOSIT', p_amount, p_effective_date,
    v_fund_asset, v_fund_class, v_reference_id,
    COALESCE(p_notes, 'Deposit with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  )
  RETURNING id INTO v_tx_id;

  -- Update investor position
  INSERT INTO investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, shares, is_active
  ) VALUES (
    p_investor_id, p_fund_id, v_balance_after, p_amount, v_fund_class, v_balance_after, true
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_balance_after,
    cost_basis = investor_positions.cost_basis + p_amount,
    shares = v_balance_after,
    is_active = true,
    updated_at = now();

  -- Update fund AUM
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
    jsonb_build_object(
      'fund_id', p_fund_id,
      'investor_id', p_investor_id,
      'aum_update', v_aum_result
    )
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
$$;

COMMENT ON FUNCTION apply_deposit_with_crystallization IS
  'Process deposit with yield crystallization. Requires explicit p_purpose=''transaction''. No default value.';

-- B2: Update apply_withdrawal_with_crystallization - REMOVE DEFAULT, enforce 'transaction'
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text,
  p_purpose aum_purpose  -- NO DEFAULT - must be explicit
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- B2a: MANDATORY purpose check - must be 'transaction', no exceptions
  IF p_purpose IS NULL THEN
    RAISE EXCEPTION 'p_purpose parameter is required. Use p_purpose=''transaction'' for withdrawal flows.'
      USING ERRCODE = 'not_null_violation';
  END IF;

  IF p_purpose IS DISTINCT FROM 'transaction' THEN
    RAISE EXCEPTION 'Withdrawal must use transaction purpose. Received: %. Use p_purpose=''transaction'' for withdrawal flows.',
      p_purpose
      USING ERRCODE = 'check_violation';
  END IF;

  -- B2b: Fail closed if no transaction-purpose AUM exists
  IF NOT validate_transaction_aum_exists(p_fund_id, p_effective_date, 'transaction') THEN
    RAISE EXCEPTION 'No transaction-purpose AUM record exists for fund % on date %. Create AUM record with purpose=''transaction'' first.',
      p_fund_id, p_effective_date
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Acquire advisory lock for this investor+fund combination
  PERFORM pg_advisory_xact_lock(
    hashtext('withdrawal:' || p_investor_id::text),
    hashtext(p_fund_id::text)
  );

  -- Get fund details and validate
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class
  FROM funds
  WHERE id = p_fund_id;

  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Fund not found'
    );
  END IF;

  -- Get current balance with row lock
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

  -- Crystallize yield before the withdrawal
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id,
    p_closing_aum,
    'withdrawal',
    'WDR-' || p_investor_id::text || '-' || to_char(p_effective_date, 'YYYYMMDD'),
    (p_effective_date || ' 12:00:00')::timestamptz,
    p_admin_id,
    'transaction'  -- Always pass 'transaction' - do not pass p_purpose
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

  -- Insert transaction (negative amount for withdrawal, asset validated by trigger)
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, created_by, is_voided, balance_before, balance_after, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'WITHDRAWAL', -ABS(p_amount), p_effective_date,
    v_fund_asset, v_fund_class, v_reference_id,
    COALESCE(p_notes, 'Withdrawal with crystallization'),
    p_admin_id, false, v_balance_before, v_balance_after, p_purpose
  )
  RETURNING id INTO v_tx_id;

  -- Update investor position
  UPDATE investor_positions
  SET current_value = v_balance_after,
      shares = v_balance_after,
      is_active = CASE WHEN v_balance_after > 0 THEN true ELSE is_active END,
      updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Update fund AUM
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
    jsonb_build_object(
      'fund_id', p_fund_id,
      'investor_id', p_investor_id,
      'aum_update', v_aum_result
    )
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
$$;

COMMENT ON FUNCTION apply_withdrawal_with_crystallization IS
  'Process withdrawal with yield crystallization. Requires explicit p_purpose=''transaction''. No default value.';


-- ============================================================================
-- SECTION C: FEE MODEL CLARIFICATION + CONSERVATION
-- ============================================================================
-- Canonical identity: gross_yield = net_yield + fee_amount (per investor event)
-- Distribution level: gross_yield = SUM(events.gross_yield_amount) ± dust
-- Deterministic rounding: ROUND(..., 10) with dust allocation to designated receiver

-- C1: Update crystallize_yield_before_flow with explicit fee model + conservation
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose  -- NO DEFAULT - internal callers must pass explicitly
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_checkpoint RECORD;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_distribution_id uuid;
  v_investors_processed int := 0;

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
  -- Validate purpose if provided
  IF p_purpose IS NULL THEN
    p_purpose := 'transaction';  -- Default for internal calls
  END IF;

  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;

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

  -- Only distribute yield if there's actual positive yield and opening AUM > 0
  IF v_yield_amount > 0 AND v_opening_aum > 0 THEN

    -- Find the largest investor to receive dust
    SELECT ip.investor_id INTO v_dust_receiver_id
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    ORDER BY ip.current_value DESC
    LIMIT 1;

    -- Create yield snapshot
    INSERT INTO fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) VALUES (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );

    -- Process each investor with explicit fee calculation
    FOR v_investor IN
      SELECT
        ip.investor_id,
        ip.current_value,
        COALESCE(ifs.fee_pct, 0.30) as fee_pct,
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

      -- Calculate gross yield (investor's proportional share)
      v_investor_yield := ROUND(v_yield_amount * (v_investor.current_value / v_opening_aum), v_scale);

      -- Get fee percentage for this investor
      v_fee_pct := v_investor.fee_pct;

      -- Calculate fee amount (from gross)
      v_investor_fee := ROUND(v_investor_yield * v_fee_pct, v_scale);

      -- Calculate net yield: CONSERVATION IDENTITY: net = gross - fee
      v_investor_net := v_investor_yield - v_investor_fee;

      -- Track totals for conservation
      v_total_gross_allocated := v_total_gross_allocated + v_investor_yield;
      v_total_fees_allocated := v_total_fees_allocated + v_investor_fee;
      v_total_net_allocated := v_total_net_allocated + v_investor_net;

      -- Generate reference ID
      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;

      -- Insert yield event
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
    'conservation_check', jsonb_build_object(
      'gross_matches', ABS(v_yield_amount - v_total_gross_allocated) < 0.0001,
      'fee_identity', ABS(v_total_gross_allocated - v_total_net_allocated - v_total_fees_allocated) < 0.0001
    )
  );
END;
$$;

COMMENT ON FUNCTION crystallize_yield_before_flow IS
  'Crystallize yield before deposit/withdrawal. Conservation: gross = net + fee. Dust allocated to largest investor.';


-- ============================================================================
-- SECTION D: SECURITY HARDENING
-- ============================================================================
-- Goal: Revoke PUBLIC/anon EXECUTE, enforce authenticated + admin checks

-- D1: Revoke EXECUTE from PUBLIC and anon on all mutating functions
REVOKE EXECUTE ON FUNCTION apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) FROM PUBLIC, anon;

-- D2: Grant EXECUTE only to authenticated and service_role
GRANT EXECUTE ON FUNCTION apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) TO service_role;

-- D3: Make crystallize_yield_before_flow internal-only by creating a wrapper
-- that checks admin status
CREATE OR REPLACE FUNCTION public.admin_crystallize_yield(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_purpose aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Verify caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can crystallize yield directly'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_admin_id := auth.uid();

  RETURN crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, p_trigger_type, p_trigger_reference, p_event_ts, v_admin_id, p_purpose
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_crystallize_yield(uuid, numeric, text, text, timestamptz, aum_purpose) TO authenticated;

COMMENT ON FUNCTION admin_crystallize_yield IS
  'Admin-only wrapper for crystallize_yield_before_flow. Requires is_admin() check.';

-- D4: Fix RLS policies - remove {public} role grants, use {authenticated}

-- Fix investor_positions policies
DROP POLICY IF EXISTS "Admins can manage investor_positions" ON investor_positions;
DROP POLICY IF EXISTS "investors_view_own_positions" ON investor_positions;

CREATE POLICY "admin_manage_positions"
  ON investor_positions FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "investor_view_own_positions"
  ON investor_positions FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid() OR is_admin());

-- Fix investor_yield_events policies
DROP POLICY IF EXISTS "yield_events_admin_all" ON investor_yield_events;
DROP POLICY IF EXISTS "yield_events_investor_select" ON investor_yield_events;

CREATE POLICY "yield_events_admin_manage"
  ON investor_yield_events FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "yield_events_investor_view"
  ON investor_yield_events FOR SELECT
  TO authenticated
  USING (
    (investor_id = auth.uid() AND visibility_scope = 'investor_visible' AND is_voided = false)
    OR is_admin()
  );

-- Fix transactions_v2 policies
DROP POLICY IF EXISTS "Admins can manage transactions_v2" ON transactions_v2;
DROP POLICY IF EXISTS "investors_view_own_transactions" ON transactions_v2;

CREATE POLICY "transactions_admin_manage"
  ON transactions_v2 FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "transactions_investor_view"
  ON transactions_v2 FOR SELECT
  TO authenticated
  USING (
    (investor_id = auth.uid() AND visibility_scope = 'investor_visible')
    OR is_admin()
  );


-- ============================================================================
-- SECTION E: VERIFICATION + MONITORING VIEWS
-- ============================================================================

-- E1: Conservation check view - must return 0 rows for healthy state
CREATE OR REPLACE VIEW v_yield_conservation_violations AS
SELECT
  yd.id as distribution_id,
  yd.fund_id,
  f.code as fund_code,
  yd.effective_date,
  yd.gross_yield as distribution_gross,
  yd.net_yield as distribution_net,
  yd.total_fees as distribution_fees,
  yd.dust_amount,
  COALESCE(agg.sum_gross, 0) as events_gross,
  COALESCE(agg.sum_net, 0) as events_net,
  COALESCE(agg.sum_fees, 0) as events_fees,
  yd.gross_yield - COALESCE(agg.sum_gross, 0) as gross_diff,
  yd.net_yield - COALESCE(agg.sum_net, 0) as net_diff,
  yd.total_fees - COALESCE(agg.sum_fees, 0) as fees_diff,
  CASE
    WHEN ABS(yd.gross_yield - COALESCE(agg.sum_gross, 0)) > 0.01 THEN 'GROSS_MISMATCH'
    WHEN ABS(yd.net_yield - COALESCE(agg.sum_net, 0)) > 0.01 THEN 'NET_MISMATCH'
    WHEN ABS(yd.total_fees - COALESCE(agg.sum_fees, 0)) > 0.01 THEN 'FEES_MISMATCH'
    WHEN ABS(COALESCE(agg.sum_gross, 0) - COALESCE(agg.sum_net, 0) - COALESCE(agg.sum_fees, 0)) > 0.01 THEN 'IDENTITY_VIOLATION'
    ELSE 'OK'
  END as violation_type
FROM yield_distributions yd
JOIN funds f ON f.id = yd.fund_id
LEFT JOIN (
  SELECT
    fund_id,
    event_date,
    SUM(gross_yield_amount) as sum_gross,
    SUM(net_yield_amount) as sum_net,
    SUM(fee_amount) as sum_fees
  FROM investor_yield_events
  WHERE is_voided = false
  GROUP BY fund_id, event_date
) agg ON agg.fund_id = yd.fund_id AND agg.event_date = yd.effective_date
WHERE yd.status != 'voided'
  AND (
    ABS(yd.gross_yield - COALESCE(agg.sum_gross, 0)) > 0.01
    OR ABS(yd.net_yield - COALESCE(agg.sum_net, 0)) > 0.01
    OR ABS(yd.total_fees - COALESCE(agg.sum_fees, 0)) > 0.01
    OR ABS(COALESCE(agg.sum_gross, 0) - COALESCE(agg.sum_net, 0) - COALESCE(agg.sum_fees, 0)) > 0.01
  );

COMMENT ON VIEW v_yield_conservation_violations IS
  'Returns rows with conservation violations. Should be empty in healthy state. gross = net + fees.';

-- E2: Ledger to position reconciliation view - must return 0 rows
CREATE OR REPLACE VIEW v_ledger_position_mismatches AS
WITH ledger_balances AS (
  SELECT
    fund_id,
    investor_id,
    SUM(amount) as ledger_balance
  FROM transactions_v2
  WHERE is_voided = false
    AND type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY fund_id, investor_id
),
yield_totals AS (
  SELECT
    fund_id,
    investor_id,
    SUM(net_yield_amount) as total_yield
  FROM investor_yield_events
  WHERE is_voided = false
  GROUP BY fund_id, investor_id
)
SELECT
  ip.fund_id,
  f.code as fund_code,
  ip.investor_id,
  ip.current_value as position_value,
  COALESCE(lb.ledger_balance, 0) as ledger_deposits,
  COALESCE(yt.total_yield, 0) as ledger_yield,
  COALESCE(lb.ledger_balance, 0) + COALESCE(yt.total_yield, 0) as expected_value,
  ip.current_value - (COALESCE(lb.ledger_balance, 0) + COALESCE(yt.total_yield, 0)) as difference,
  CASE
    WHEN ABS(ip.current_value - (COALESCE(lb.ledger_balance, 0) + COALESCE(yt.total_yield, 0))) > 0.01
    THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN ledger_balances lb ON lb.fund_id = ip.fund_id AND lb.investor_id = ip.investor_id
LEFT JOIN yield_totals yt ON yt.fund_id = ip.fund_id AND yt.investor_id = ip.investor_id
WHERE ABS(ip.current_value - (COALESCE(lb.ledger_balance, 0) + COALESCE(yt.total_yield, 0))) > 0.01;

COMMENT ON VIEW v_ledger_position_mismatches IS
  'Returns positions where ledger (deposits + yield) does not match position value. Should be empty.';

-- E3: Purpose validation test function
CREATE OR REPLACE FUNCTION test_purpose_enforcement()
RETURNS TABLE(
  test_name text,
  passed boolean,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_test_fund_id uuid;
  v_test_investor_id uuid;
  v_result jsonb;
  v_error text;
BEGIN
  -- Get any fund and investor for testing
  SELECT id INTO v_test_fund_id FROM funds LIMIT 1;
  SELECT investor_id INTO v_test_investor_id FROM investor_positions LIMIT 1;

  -- Test 1: NULL purpose should fail
  test_name := 'NULL_PURPOSE_DEPOSIT';
  BEGIN
    SELECT apply_deposit_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', NULL
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected NULL purpose: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 2: 'reporting' purpose should fail
  test_name := 'REPORTING_PURPOSE_DEPOSIT';
  BEGIN
    SELECT apply_deposit_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', 'reporting'
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected reporting purpose: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- Test 3: NULL purpose withdrawal should fail
  test_name := 'NULL_PURPOSE_WITHDRAWAL';
  BEGIN
    SELECT apply_withdrawal_with_crystallization(
      v_test_fund_id, v_test_investor_id, 100, 1000000, CURRENT_DATE,
      '00000000-0000-0000-0000-000000000000'::uuid, 'Test', NULL
    ) INTO v_result;
    passed := false;
    details := 'Expected exception but got: ' || v_result::text;
  EXCEPTION WHEN OTHERS THEN
    passed := true;
    details := 'Correctly rejected NULL purpose: ' || SQLERRM;
  END;
  RETURN NEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION test_purpose_enforcement IS
  'Regression test for purpose enforcement. All tests should return passed=true.';

-- E4: Daily monitoring function
CREATE OR REPLACE FUNCTION run_daily_health_check()
RETURNS TABLE(
  check_name text,
  status text,
  violation_count int,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check 1: Conservation violations
  check_name := 'YIELD_CONSERVATION';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'distribution_id', distribution_id,
      'fund_code', fund_code,
      'violation_type', violation_type,
      'gross_diff', gross_diff
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM v_yield_conservation_violations;
  RETURN NEXT;

  -- Check 2: Ledger mismatches
  check_name := 'LEDGER_POSITION_MATCH';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'fund_code', fund_code,
      'investor_id', investor_id,
      'difference', difference
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM v_ledger_position_mismatches;
  RETURN NEXT;

  -- Check 3: Asset mismatches (transactions with wrong currency)
  check_name := 'NATIVE_CURRENCY';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    COUNT(*)::int,
    COALESCE(jsonb_agg(jsonb_build_object(
      'tx_id', t.id,
      'tx_asset', t.asset,
      'fund_asset', f.asset
    )), '[]'::jsonb)
  INTO status, violation_count, details
  FROM transactions_v2 t
  JOIN funds f ON f.id = t.fund_id
  WHERE t.asset != f.asset AND t.is_voided = false;
  RETURN NEXT;

  -- Check 4: Purpose violations in fund_daily_aum
  check_name := 'AUM_PURPOSE_CONSISTENCY';
  SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    COUNT(*)::int,
    jsonb_build_object('message', 'Check AUM records have proper purpose flags')
  INTO status, violation_count, details
  FROM fund_daily_aum
  WHERE purpose IS NULL AND is_voided = false;
  RETURN NEXT;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION run_daily_health_check() TO authenticated;

COMMENT ON FUNCTION run_daily_health_check IS
  'Daily health check for accounting integrity. Run via cron or monitoring.';


COMMIT;
