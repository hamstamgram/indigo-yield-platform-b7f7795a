-- Migration: Deploy Canonical RPC Functions
-- Created: 2026-01-19
-- Purpose: Deploy all canonical mutation RPC functions with proper security and triggers
--
-- These functions bypass the canonical_rpc protection triggers by setting the
-- appropriate session variables before performing mutations.

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
  v_total_credits NUMERIC := 0;
  v_total_debits NUMERIC := 0;
  v_net_balance NUMERIC := 0;
  v_existing_position RECORD;
  v_rows_affected INTEGER := 0;
BEGIN
  -- Set canonical RPC flag to bypass mutation protection
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate inputs
  IF p_investor_id IS NULL OR p_fund_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'investor_id and fund_id are required',
      'investor_id', p_investor_id,
      'fund_id', p_fund_id
    );
  END IF;

  -- Calculate total credits (transactions that ADD to position)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status = 'completed'
    AND transaction_type IN (
      'DEPOSIT',
      'YIELD',
      'INTEREST',
      'IB_CREDIT',
      'FEE_CREDIT',
      'INTERNAL_CREDIT'
    );

  -- Calculate total debits (transactions that SUBTRACT from position)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debits
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status = 'completed'
    AND transaction_type IN (
      'WITHDRAWAL',
      'FEE',
      'IB_DEBIT',
      'INTERNAL_WITHDRAWAL'
    );

  -- Calculate net balance
  v_net_balance := v_total_credits - v_total_debits;

  -- Check if position already exists
  SELECT * INTO v_existing_position
  FROM investor_positions
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  IF FOUND THEN
    -- Update existing position
    UPDATE investor_positions
    SET
      total_amount = v_net_balance,
      updated_at = NOW()
    WHERE investor_id = p_investor_id
      AND fund_id = p_fund_id;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  ELSE
    -- Insert new position if balance is non-zero
    IF v_net_balance > 0 THEN
      INSERT INTO investor_positions (
        investor_id,
        fund_id,
        total_amount,
        created_at,
        updated_at
      ) VALUES (
        p_investor_id,
        p_fund_id,
        v_net_balance,
        NOW(),
        NOW()
      );

      GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    END IF;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'total_credits', v_total_credits,
    'total_debits', v_total_debits,
    'net_balance', v_net_balance,
    'rows_affected', v_rows_affected,
    'operation', CASE
      WHEN v_existing_position IS NOT NULL THEN 'update'
      WHEN v_net_balance > 0 THEN 'insert'
      ELSE 'no_change'
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'investor_id', p_investor_id,
      'fund_id', p_fund_id
    );
END;
$$;

COMMENT ON FUNCTION public.recompute_investor_position IS
'Recalculates investor position based on completed transactions. Bypasses canonical RPC protection.';

-- ============================================================================
-- Function: admin_fix_position
-- Purpose: Administrative function to fix/recalculate a position with logging
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
  v_old_amount NUMERIC;
  v_new_amount NUMERIC;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Get old position value
  SELECT total_amount INTO v_old_amount
  FROM investor_positions
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  -- Recompute position
  SELECT recompute_investor_position(p_investor_id, p_fund_id) INTO v_result;

  -- Get new position value
  SELECT total_amount INTO v_new_amount
  FROM investor_positions
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id;

  -- Add admin fix metadata
  v_result := v_result || jsonb_build_object(
    'admin_fix', true,
    'old_amount', v_old_amount,
    'new_amount', v_new_amount,
    'delta', COALESCE(v_new_amount, 0) - COALESCE(v_old_amount, 0),
    'fixed_at', NOW()
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'investor_id', p_investor_id,
      'fund_id', p_fund_id,
      'admin_fix', true
    );
END;
$$;

COMMENT ON FUNCTION public.admin_fix_position IS
'Administrative function to fix investor positions with change tracking.';

-- ============================================================================
-- Function: set_fund_daily_aum
-- Purpose: Set or update fund daily AUM records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id UUID,
  p_aum_date DATE,
  p_total_aum NUMERIC,
  p_purpose TEXT DEFAULT 'manual_entry'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_record RECORD;
  v_rows_affected INTEGER := 0;
  v_operation TEXT;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Validate inputs
  IF p_fund_id IS NULL OR p_aum_date IS NULL OR p_total_aum IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'fund_id, aum_date, and total_aum are required'
    );
  END IF;

  IF p_total_aum < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'total_aum cannot be negative',
      'provided_aum', p_total_aum
    );
  END IF;

  -- Check for existing record
  SELECT * INTO v_existing_record
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date;

  IF FOUND THEN
    -- Update existing record
    UPDATE fund_daily_aum
    SET
      total_aum = p_total_aum,
      updated_at = NOW()
    WHERE fund_id = p_fund_id
      AND aum_date = p_aum_date;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    v_operation := 'update';
  ELSE
    -- Insert new record
    INSERT INTO fund_daily_aum (
      fund_id,
      aum_date,
      total_aum,
      created_at,
      updated_at
    ) VALUES (
      p_fund_id,
      p_aum_date,
      p_total_aum,
      NOW(),
      NOW()
    );

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    v_operation := 'insert';
  END IF;

  -- Also create an AUM event record
  INSERT INTO fund_aum_events (
    fund_id,
    event_date,
    aum_amount,
    event_type,
    created_at
  ) VALUES (
    p_fund_id,
    p_aum_date,
    p_total_aum,
    p_purpose,
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'aum_date', p_aum_date,
    'total_aum', p_total_aum,
    'operation', v_operation,
    'rows_affected', v_rows_affected,
    'purpose', p_purpose,
    'old_aum', v_existing_record.total_aum
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'fund_id', p_fund_id,
      'aum_date', p_aum_date
    );
END;
$$;

COMMENT ON FUNCTION public.set_fund_daily_aum IS
'Sets or updates fund daily AUM records with event logging.';

-- ============================================================================
-- Function: batch_reconcile_all_positions
-- Purpose: Reconcile all investor positions in the system
-- ============================================================================
CREATE OR REPLACE FUNCTION public.batch_reconcile_all_positions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position RECORD;
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_count INTEGER := 0;
  v_errors JSONB[] := ARRAY[]::JSONB[];
  v_start_time TIMESTAMP := NOW();
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Get all unique investor/fund combinations from transactions
  FOR v_position IN
    SELECT DISTINCT
      investor_id,
      fund_id
    FROM transactions_v2
    WHERE status = 'completed'
    ORDER BY investor_id, fund_id
  LOOP
    v_total_count := v_total_count + 1;

    -- Recompute each position
    SELECT recompute_investor_position(
      v_position.investor_id,
      v_position.fund_id
    ) INTO v_result;

    -- Check if successful
    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
      v_errors := array_append(v_errors, v_result);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_positions', v_total_count,
    'successful', v_success_count,
    'failed', v_error_count,
    'errors', to_jsonb(v_errors),
    'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
    'completed_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'total_positions', v_total_count,
      'successful', v_success_count,
      'failed', v_error_count
    );
END;
$$;

COMMENT ON FUNCTION public.batch_reconcile_all_positions IS
'Reconciles all investor positions in the system based on completed transactions.';

-- ============================================================================
-- Function: sync_all_fund_aum
-- Purpose: Sync AUM for all funds based on current positions
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
  v_result JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_total_count INTEGER := 0;
  v_total_aum NUMERIC := 0;
  v_fund_aum NUMERIC;
  v_errors JSONB[] := ARRAY[]::JSONB[];
  v_start_time TIMESTAMP := NOW();
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Iterate through all funds
  FOR v_fund IN
    SELECT DISTINCT fund_id
    FROM investor_positions
    WHERE total_amount > 0
  LOOP
    v_total_count := v_total_count + 1;

    -- Calculate total AUM for this fund
    SELECT COALESCE(SUM(total_amount), 0) INTO v_fund_aum
    FROM investor_positions
    WHERE fund_id = v_fund.fund_id
      AND total_amount > 0;

    -- Set the AUM record
    BEGIN
      SELECT set_fund_daily_aum(
        v_fund.fund_id,
        p_target_date,
        v_fund_aum,
        'auto_sync'
      ) INTO v_result;

      IF (v_result->>'success')::boolean THEN
        v_success_count := v_success_count + 1;
        v_total_aum := v_total_aum + v_fund_aum;
      ELSE
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, v_result);
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_errors := array_append(v_errors, jsonb_build_object(
          'fund_id', v_fund.fund_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'sync_date', p_target_date,
    'total_funds', v_total_count,
    'successful', v_success_count,
    'failed', v_error_count,
    'total_aum', v_total_aum,
    'errors', to_jsonb(v_errors),
    'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time)),
    'completed_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_detail', SQLSTATE,
      'total_funds', v_total_count,
      'successful', v_success_count
    );
END;
$$;

COMMENT ON FUNCTION public.sync_all_fund_aum IS
'Syncs AUM for all funds based on current investor positions.';

-- ============================================================================
-- Trigger: Auto-recompute position on transaction changes
-- Purpose: Automatically recompute positions when transactions change
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_recompute_position ON transactions_v2;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trg_auto_recompute_position_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_investor_id UUID;
  v_fund_id UUID;
  v_result JSONB;
BEGIN
  -- Determine which investor/fund to recompute
  IF TG_OP = 'DELETE' THEN
    v_investor_id := OLD.investor_id;
    v_fund_id := OLD.fund_id;
  ELSE
    v_investor_id := NEW.investor_id;
    v_fund_id := NEW.fund_id;
  END IF;

  -- Only recompute if transaction is completed or status changed
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.amount != NEW.amount) OR
     (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN

    -- Recompute the position asynchronously (fire and forget)
    -- In a real system, you might queue this for background processing
    PERFORM recompute_investor_position(v_investor_id, v_fund_id);

  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Auto-recompute position failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
END;
$$;

-- Create the trigger
CREATE TRIGGER trg_auto_recompute_position
  AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION trg_auto_recompute_position_fn();

COMMENT ON TRIGGER trg_auto_recompute_position ON transactions_v2 IS
'Automatically recomputes investor positions when completed transactions change.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.recompute_investor_position(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fix_position(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_fund_daily_aum(UUID, DATE, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_reconcile_all_positions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_fund_aum(DATE) TO authenticated;

-- Grant execute on trigger function (needed for trigger execution)
GRANT EXECUTE ON FUNCTION public.trg_auto_recompute_position_fn() TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260119_deploy_canonical_rpcs.sql completed successfully';
  RAISE NOTICE 'Deployed functions:';
  RAISE NOTICE '  - recompute_investor_position(investor_id, fund_id)';
  RAISE NOTICE '  - admin_fix_position(investor_id, fund_id)';
  RAISE NOTICE '  - set_fund_daily_aum(fund_id, aum_date, total_aum, purpose)';
  RAISE NOTICE '  - batch_reconcile_all_positions()';
  RAISE NOTICE '  - sync_all_fund_aum(target_date)';
  RAISE NOTICE 'Deployed triggers:';
  RAISE NOTICE '  - trg_auto_recompute_position on transactions_v2';
END $$;
