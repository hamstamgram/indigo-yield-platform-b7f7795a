-- Comprehensive ADJUSTMENT fixes:
-- C1: Standardize advisory lock key to match DEPOSIT/WITHDRAWAL path
-- C2: Add reference_id for idempotency
-- C3: Include ADJUSTMENT in cost_basis (fn_ledger_drives_position)
-- H1: Scope backfill UPDATE to investor account types only
-- H4: Reject zero-amount adjustments
-- H5: Max-length on reason (1000 chars)

-- 1. Replace adjust_investor_position with all fixes
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_tx_date date,
  p_reason text,
  p_admin_id uuid DEFAULT NULL::uuid
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
  v_lock_key bigint;
  v_reference_id text;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());

  -- C1: Use same lock key derivation as apply_transaction_with_crystallization
  v_lock_key := ('x' || substr(md5(p_investor_id::text || p_fund_id::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Auth check
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- H4: Reject zero-amount adjustments
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment amount cannot be zero');
  END IF;

  -- H5: Max-length on reason
  IF LENGTH(TRIM(COALESCE(p_reason, ''))) > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be 1000 characters or fewer');
  END IF;

  IF LENGTH(TRIM(COALESCE(p_reason, ''))) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason is required (minimum 3 characters)');
  END IF;

  -- Look up fund
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current balance (may be NULL for new investor)
  SELECT COALESCE(current_value, 0) INTO v_balance_before
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id
  FOR UPDATE;

  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;

  IF v_balance_after < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance');
  END IF;

  -- C2: Generate deterministic reference_id for idempotency
  v_reference_id := 'adjustment:' || p_fund_id::text || ':' || p_investor_id::text || ':' || p_tx_date::text || ':' || gen_random_uuid()::text;

  -- Insert with canonical_rpc flag so trigger guards pass
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    notes, created_by, is_voided, balance_before, balance_after,
    source, visibility_scope, reference_id, purpose
  ) VALUES (
    p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class,
    p_reason, v_actor, false, v_balance_before, v_balance_after,
    'manual_admin', 'investor_visible', v_reference_id, 'transaction'
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'balance_after', v_balance_after);
END;
$function$;

-- 2. C3: Update fn_ledger_drives_position to handle ADJUSTMENT in cost_basis
-- ADJUSTMENT is treated as a capital correction: positive adds to cost_basis, negative subtracts
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric(28,10);
BEGIN
  -- Only handle INSERT (new transactions) and UPDATE of is_voided (voids/unvoids)
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    -- For WITHDRAWAL, delta is negative (amount is stored positive, but effect is negative)
    IF NEW.type = 'WITHDRAWAL' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    -- ADJUSTMENT amount is already signed, use as-is

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type = 'DEPOSIT' THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type = 'DEPOSIT' THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle void/unvoid
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      -- Transaction is being voided: reverse the effect
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      -- Transaction is being unvoided: re-apply the effect
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Update recompute_investor_position to include ADJUSTMENT in cost_basis
CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_fund_id uuid,
  p_investor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(28,10);
  v_cost_basis numeric(28,10);
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- current_value = sum of all non-voided signed transaction amounts
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      ELSE amount
    END
  ), 0) INTO v_current_value
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  -- cost_basis = sum of capital flows (deposits, withdrawals, adjustments)
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount  -- signed: positive adds, negative subtracts
      ELSE 0
    END
  ), 0) INTO v_cost_basis
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  -- Ensure cost_basis never goes negative
  IF v_cost_basis < 0 THEN
    v_cost_basis := 0;
  END IF;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active, updated_at)
  VALUES (p_investor_id, p_fund_id, v_current_value, v_cost_basis, 0, v_current_value > 0, now())
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$function$;

-- 4. H1: Fix backfill to scope to investor account types only
-- Undo the broad update from previous migration, then re-apply scoped
UPDATE transactions_v2 t
SET visibility_scope = 'investor_visible'
WHERE t.type = 'ADJUSTMENT'
  AND t.visibility_scope = 'admin_only'
  AND t.is_voided = false
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = t.investor_id
      AND p.account_type = 'investor'
  );
