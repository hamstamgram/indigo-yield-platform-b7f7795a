-- ============================================================================
-- Migration: Deploy Canonical RPC Functions V2
-- Created: 2026-01-19
-- Purpose: Deploy all canonical mutation RPC functions with CORRECT column names
-- ============================================================================

-- ============================================================================
-- Function: recompute_investor_position
-- Purpose: Recalculates an investor's position for a specific fund
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id UUID,
  p_fund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_credits NUMERIC(28,10) := 0;
  v_total_debits NUMERIC(28,10) := 0;
  v_net_balance NUMERIC(28,10) := 0;
  v_old_value NUMERIC(28,10) := 0;
  v_rows_affected INTEGER := 0;
  v_position_exists BOOLEAN := FALSE;
BEGIN
  -- Set canonical RPC flag to bypass mutation protection
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate inputs
  IF p_investor_id IS NULL OR p_fund_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'investor_id and fund_id are required'
    );
  END IF;

  -- Get old position value
  SELECT current_value, TRUE INTO v_old_value, v_position_exists
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_old_value := COALESCE(v_old_value, 0);

  -- Calculate total credits (transactions that ADD to position)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false
    AND type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT');

  -- Calculate total debits (transactions that SUBTRACT from position)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debits
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false
    AND type IN ('WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL');

  -- Calculate net balance
  v_net_balance := v_total_credits - v_total_debits;

  IF v_position_exists THEN
    -- Update existing position
    UPDATE investor_positions
    SET
      current_value = v_net_balance,
      shares = v_net_balance,
      is_active = (v_net_balance > 0),
      updated_at = NOW()
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN jsonb_build_object(
      'success', true,
      'investor_id', p_investor_id,
      'fund_id', p_fund_id,
      'old_value', v_old_value,
      'new_value', v_net_balance,
      'variance', v_old_value - v_net_balance,
      'total_credits', v_total_credits,
      'total_debits', v_total_debits,
      'operation', 'update'
    );
  ELSE
    -- Insert new position if balance is positive
    IF v_net_balance > 0 THEN
      INSERT INTO investor_positions (
        investor_id, fund_id, current_value, shares, cost_basis,
        is_active, created_at, updated_at
      ) VALUES (
        p_investor_id, p_fund_id, v_net_balance, v_net_balance, v_net_balance,
        true, NOW(), NOW()
      );

      RETURN jsonb_build_object(
        'success', true,
        'investor_id', p_investor_id,
        'fund_id', p_fund_id,
        'old_value', 0,
        'new_value', v_net_balance,
        'variance', -v_net_balance,
        'total_credits', v_total_credits,
        'total_debits', v_total_debits,
        'operation', 'insert'
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'investor_id', p_investor_id,
        'fund_id', p_fund_id,
        'old_value', 0,
        'new_value', 0,
        'variance', 0,
        'operation', 'no_change'
      );
    END IF;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'investor_id', p_investor_id,
      'fund_id', p_fund_id
    );
END;
$$;

-- ============================================================================
-- Function: admin_fix_position
-- Purpose: Administrative function to fix a position with audit logging
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_fix_position(
  p_investor_id UUID,
  p_fund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_old_value NUMERIC(28,10);
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Get old position value
  SELECT current_value INTO v_old_value
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Recompute position
  SELECT recompute_investor_position(p_investor_id, p_fund_id) INTO v_result;

  -- Log the correction if there was a variance
  IF (v_result->>'success')::boolean AND ABS((v_result->>'variance')::numeric) > 0.01 THEN
    INSERT INTO position_correction_log (
      investor_id, fund_id, old_value, new_value, variance, corrected_by, notes
    ) VALUES (
      p_investor_id, p_fund_id,
      v_old_value,
      (v_result->>'new_value')::numeric,
      (v_result->>'variance')::numeric,
      'admin_fix_position',
      'Automated reconciliation via RPC'
    );
  END IF;

  RETURN v_result || jsonb_build_object('admin_fix', true, 'logged', true);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE,
      'admin_fix', true
    );
END;
$$;

-- ============================================================================
-- Function: set_fund_daily_aum
-- Purpose: Set or update fund daily AUM records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id UUID,
  p_aum_date DATE,
  p_total_aum NUMERIC,
  p_purpose TEXT DEFAULT 'transaction'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_aum NUMERIC;
  v_operation TEXT;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate inputs
  IF p_fund_id IS NULL OR p_aum_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'fund_id and aum_date are required'
    );
  END IF;

  -- Check for existing record
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_aum_date AND purpose = p_purpose;

  IF FOUND THEN
    -- Update existing record
    UPDATE fund_daily_aum
    SET total_aum = p_total_aum, updated_at = NOW()
    WHERE fund_id = p_fund_id AND aum_date = p_aum_date AND purpose = p_purpose;
    v_operation := 'update';
  ELSE
    -- Insert new record
    INSERT INTO fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, is_voided, created_at, updated_at
    ) VALUES (
      p_fund_id, p_aum_date, p_total_aum, p_purpose, false, NOW(), NOW()
    );
    v_operation := 'insert';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'aum_date', p_aum_date,
    'old_aum', v_old_aum,
    'new_aum', p_total_aum,
    'operation', v_operation
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- ============================================================================
-- Function: batch_reconcile_all_positions
-- Purpose: Reconcile ALL investor positions in one call
-- ============================================================================
CREATE OR REPLACE FUNCTION public.batch_reconcile_all_positions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pos RECORD;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_variance NUMERIC := 0;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Loop through all positions
  FOR v_pos IN
    SELECT DISTINCT investor_id, fund_id FROM investor_positions
    WHERE investor_id IS NOT NULL AND fund_id IS NOT NULL
  LOOP
    SELECT admin_fix_position(v_pos.investor_id, v_pos.fund_id) INTO v_result;

    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
      v_total_variance := v_total_variance + ABS(COALESCE((v_result->>'variance')::numeric, 0));
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_positions', v_success_count + v_error_count,
    'fixed', v_success_count,
    'errors', v_error_count,
    'total_variance_fixed', v_total_variance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- Function: sync_all_fund_aum
-- Purpose: Sync AUM for all funds based on positions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_all_fund_aum(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_aum NUMERIC;
  v_result JSONB;
  v_funds_synced INTEGER := 0;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  FOR v_fund IN SELECT id, code FROM funds LOOP
    -- Calculate AUM from positions
    SELECT COALESCE(SUM(current_value), 0) INTO v_aum
    FROM investor_positions
    WHERE fund_id = v_fund.id AND is_active = true;

    -- Set AUM
    SELECT set_fund_daily_aum(v_fund.id, p_target_date, v_aum, 'transaction') INTO v_result;

    IF (v_result->>'success')::boolean THEN
      v_funds_synced := v_funds_synced + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'funds_synced', v_funds_synced,
    'sync_date', p_target_date
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- Trigger: Auto-recompute position on transaction changes
-- ============================================================================
DROP TRIGGER IF EXISTS trg_auto_recompute_position ON transactions_v2;

CREATE OR REPLACE FUNCTION public.trg_auto_recompute_position_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_investor_id UUID;
  v_fund_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
    v_fund_id := OLD.fund_id;
  ELSE
    v_investor_id := NEW.investor_id;
    v_fund_id := NEW.fund_id;
  END IF;

  -- Recompute on: new non-voided tx, void status change, amount change
  IF (TG_OP = 'INSERT' AND NOT NEW.is_voided) OR
     (TG_OP = 'UPDATE' AND OLD.is_voided != NEW.is_voided) OR
     (TG_OP = 'UPDATE' AND NOT NEW.is_voided AND OLD.amount != NEW.amount) OR
     (TG_OP = 'DELETE' AND NOT OLD.is_voided) THEN
    PERFORM recompute_investor_position(v_investor_id, v_fund_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Auto-recompute failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_auto_recompute_position
  AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION trg_auto_recompute_position_fn();

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.recompute_investor_position(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_fix_position(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_fund_daily_aum(UUID, DATE, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.batch_reconcile_all_positions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_fund_aum(DATE) TO authenticated, service_role;

-- ============================================================================
-- IMMEDIATE RECONCILIATION
-- Run batch reconciliation right after deploying
-- ============================================================================
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Set canonical flags
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Run batch reconciliation
  SELECT batch_reconcile_all_positions() INTO v_result;
  RAISE NOTICE 'Batch reconciliation result: %', v_result;

  -- Sync all fund AUM
  SELECT sync_all_fund_aum(CURRENT_DATE) INTO v_result;
  RAISE NOTICE 'AUM sync result: %', v_result;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Deployed: recompute_investor_position, admin_fix_position,';
  RAISE NOTICE '          set_fund_daily_aum, batch_reconcile_all_positions,';
  RAISE NOTICE '          sync_all_fund_aum, trg_auto_recompute_position';
  RAISE NOTICE '====================================';
END $$;
