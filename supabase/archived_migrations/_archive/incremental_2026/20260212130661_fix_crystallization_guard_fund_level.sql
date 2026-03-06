-- Migration: Fix Crystallization Guard to Fund-Level Check
-- Date: 2026-02-12
--
-- Bug: When a NEW investor deposits, apply_transaction_with_crystallization creates
-- their position with last_yield_crystallization_date = p_tx_date BEFORE checking
-- if crystallization is needed. The guard check (v_last_crystal_date < p_tx_date)
-- then fails because the newly created date equals p_tx_date, causing crystallization
-- to be skipped for the entire fund.
--
-- Fix 1: Move crystallization check BEFORE position creation. Use fund-level
-- MAX(last_yield_crystallization_date) from existing positions instead of
-- the depositor's own crystal date.
--
-- Fix 2: fn_ledger_drives_position should only advance crystal date on
-- DEPOSIT/WITHDRAWAL/ADJUSTMENT, not on YIELD/FEE_CREDIT/IB_CREDIT.
-- Otherwise yield transactions from crystallization advance the date,
-- potentially causing next crystallization guard to skip.

-- ============================================================================
-- FIX 1: apply_transaction_with_crystallization - fund-level guard
-- ============================================================================

DROP FUNCTION IF EXISTS public.apply_transaction_with_crystallization(uuid, uuid, text, numeric, date, text, text, uuid, numeric, aum_purpose, uuid);

CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_new_total_aum numeric DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF p_tx_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'FEE', 'ADJUSTMENT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, FEE, ADJUSTMENT, INTEREST, FEE_CREDIT, IB_CREDIT, YIELD', p_tx_type;
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'Transaction amount must be non-zero';
  END IF;

  IF p_reference_id IS NULL OR p_reference_id = '' THEN
    RAISE EXCEPTION 'Reference ID is required for idempotency';
  END IF;

  -- Idempotency check
  SELECT id INTO v_existing_tx
  FROM transactions_v2
  WHERE reference_id = p_reference_id AND is_voided = false
  LIMIT 1;

  IF v_existing_tx IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists with this reference_id'
    );
  END IF;

  -- Advisory lock on investor+fund
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- ====================================================================
  -- FIX 1: Fund-level crystallization check BEFORE position creation.
  -- Check MAX(last_yield_crystallization_date) across ALL existing fund
  -- positions. This ensures crystallization fires for the FUND even when
  -- the depositor is a brand new investor with no prior position.
  -- ====================================================================
  IF p_tx_type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT') THEN
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
          p_fund_id := p_fund_id,
          p_closing_aum := p_new_total_aum,
          p_trigger_type := 'transaction',
          p_trigger_reference := p_reference_id,
          p_event_ts := (p_tx_date::timestamp + interval '12 hours'),
          p_admin_id := v_admin,
          p_purpose := p_purpose
        );

        v_crystal_amount := COALESCE((v_crystal_result->>'gross_yield')::numeric, 0);
      END IF;
    END IF;
  END IF;

  -- Get or create position (AFTER crystallization ran for existing investors)
  SELECT * INTO v_position FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  IF v_position IS NULL THEN
    INSERT INTO investor_positions (
      investor_id, fund_id, shares, cost_basis, current_value,
      last_yield_crystallization_date, is_active
    ) VALUES (
      p_investor_id, p_fund_id, 0, 0, 0, p_tx_date, true
    )
    RETURNING * INTO v_position;
  END IF;

  v_balance_before := v_position.current_value;

  -- Calculate balance after (in-memory for record keeping)
  CASE p_tx_type
    WHEN 'DEPOSIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    WHEN 'WITHDRAWAL' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
      IF v_balance_after < -0.00000001 THEN
        RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_balance_before, ABS(p_amount);
      END IF;
    WHEN 'FEE' THEN
      v_balance_after := v_balance_before - ABS(p_amount);
    WHEN 'ADJUSTMENT' THEN
      v_balance_after := v_balance_before + p_amount;
    WHEN 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT' THEN
      v_balance_after := v_balance_before + ABS(p_amount);
    ELSE
      v_balance_after := v_balance_before + p_amount;
  END CASE;

  -- Insert transaction (trg_ledger_sync handles position update)
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    balance_before, balance_after, reference_id, notes,
    approved_by, approved_at, created_by, purpose, source, is_voided,
    distribution_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_date, p_tx_date, v_fund.asset,
    CASE WHEN p_tx_type IN ('WITHDRAWAL', 'FEE') THEN -ABS(p_amount) ELSE ABS(p_amount) END,
    p_tx_type::tx_type, v_balance_before, v_balance_after,
    p_reference_id, p_notes, v_admin, NOW(), v_admin,
    p_purpose, 'rpc_canonical'::tx_source, false,
    p_distribution_id
  )
  RETURNING id INTO v_tx_id;

  -- AUM auto-recording after transaction
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_post_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, v_post_aum, p_purpose, 'transaction', v_admin)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE (is_voided = false)
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 'idempotent', false, 'tx_id', v_tx_id,
    'crystallized_yield_amount', v_crystal_amount,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'last_crystallized_at', p_tx_date, 'tx_type', p_tx_type, 'amount', p_amount,
    'post_transaction_aum', v_post_aum
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_tx
    FROM transactions_v2
    WHERE reference_id = p_reference_id AND is_voided = false LIMIT 1;

    RETURN jsonb_build_object(
      'success', true, 'idempotent', true, 'tx_id', v_existing_tx,
      'message', 'Transaction already exists (race condition handled)'
    );
END;
$function$;


-- ============================================================================
-- FIX 2: fn_ledger_drives_position - only advance crystal date on capital flows
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric;
BEGIN
  v_delta := NEW.amount; -- Amount is already signed in transactions_v2

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.investor_positions
    SET
        -- CORE INTEGRITY: Value driven by Ledger
        current_value = current_value + v_delta,

        -- Metadata Updates
        updated_at = NOW(),
        last_transaction_date = GREATEST(last_transaction_date, NEW.tx_date),

        -- Cost Basis Logic: capital in/out (aligned with recompute_investor_position)
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END,

        -- FIX 2: Only advance crystal date on capital flow types.
        -- YIELD/FEE_CREDIT/IB_CREDIT from crystallization should NOT advance
        -- the date, or the next deposit's guard check may skip crystallization.
        last_yield_crystallization_date = CASE
            WHEN NEW.type IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT')
              THEN GREATEST(last_yield_crystallization_date, NEW.tx_date)
            ELSE last_yield_crystallization_date
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    -- Reverse the effect of voided transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value - v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = false AND OLD.is_voided = true) THEN
    -- Restore the effect of an unvoided transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  END IF;

  RETURN NEW;
END;
$function$;
