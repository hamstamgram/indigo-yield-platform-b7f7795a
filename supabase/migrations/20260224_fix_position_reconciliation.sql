-- Fix position reconciliation functions
-- 1. reconcile_investor_position_internal: Use SUM(amount) instead of per-type categorization
--    (missing FEE, INTERNAL_WITHDRAWAL, IB_DEBIT, DUST_SWEEP)
-- 2. fn_ledger_drives_position: Add unvoid support (is_voided: true -> false)
-- 3. cleanup_dormant_positions: Use is_voided = false instead of voided_at IS NULL

-- ============================================================================
-- 1. reconcile_investor_position_internal
--    Simplified: SUM(amount) works because amounts are already signed
--    (withdrawals stored as negative). No types can be missed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_investor_position_internal(
  p_fund_id uuid,
  p_investor_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calculated_position numeric(28,10);
  v_cost_basis numeric(28,10);
BEGIN
  -- Calculate position from ledger using SUM(amount)
  -- Amounts are already signed: deposits positive, withdrawals negative
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_calculated_position
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.investor_id = p_investor_id
    AND t.is_voided = false;

  -- Calculate cost basis from deposits and withdrawals only
  SELECT COALESCE(SUM(
    CASE
      WHEN t.type = 'DEPOSIT' THEN ABS(t.amount)
      WHEN t.type = 'WITHDRAWAL' THEN -ABS(t.amount)
      ELSE 0
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.investor_id = p_investor_id
    AND t.is_voided = false;

  -- Ensure cost_basis doesn't go negative
  v_cost_basis := GREATEST(v_cost_basis, 0);

  -- Update position (use BOTH config vars for compatibility)
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  UPDATE investor_positions
  SET current_value = v_calculated_position,
      shares = v_calculated_position,
      cost_basis = v_cost_basis,
      updated_at = now()
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id;

  -- If no position exists, create one
  IF NOT FOUND AND v_calculated_position != 0 THEN
    INSERT INTO investor_positions (investor_id, fund_id, shares, current_value, cost_basis)
    VALUES (p_investor_id, p_fund_id, v_calculated_position, v_calculated_position, v_cost_basis);
  END IF;
END;
$$;

-- ============================================================================
-- 2. fn_ledger_drives_position
--    Added UNVOID branch: when is_voided goes from true to false,
--    restore the transaction's effect on the position.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_delta numeric;
BEGIN
  v_delta := NEW.amount;

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        updated_at = NOW(),
        last_transaction_date = GREATEST(last_transaction_date, NEW.tx_date),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END,
        last_yield_crystallization_date = GREATEST(last_yield_crystallization_date, NEW.tx_date)
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    -- VOID: Reverse the effect of the transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value - v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = false AND OLD.is_voided = true) THEN
    -- UNVOID: Restore the effect of the transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. cleanup_dormant_positions
--    Changed voided_at IS NULL to is_voided = false (canonical convention)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_dormant_positions(p_dry_run boolean DEFAULT true) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_dormant RECORD;
BEGIN
  FOR v_dormant IN
    SELECT ip.investor_id, ip.fund_id
    FROM investor_positions ip
    WHERE ip.current_value = 0
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
      )
  LOOP
    IF NOT p_dry_run THEN
      DELETE FROM investor_positions
      WHERE investor_id = v_dormant.investor_id
        AND fund_id = v_dormant.fund_id;
    END IF;
    v_archived_count := v_archived_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', p_dry_run,
    'dormant_positions_found', v_archived_count
  );
END;
$$;
