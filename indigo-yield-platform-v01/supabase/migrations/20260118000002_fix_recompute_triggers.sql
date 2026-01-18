-- =============================================================================
-- TRIGGER FIXES FOR POSITION AND AUM SYNCHRONIZATION
-- Migration: 20260118000002_fix_recompute_triggers.sql
-- Purpose: Fix triggers for void status changes and AUM synchronization
-- CTO Sign-off Required: YES (Architecture Change)
-- =============================================================================

-- 1) Create trigger function for void status changes
-- When a transaction is voided/unvoided, recompute the investor position
CREATE OR REPLACE FUNCTION public.recompute_on_void()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when is_voided actually changes
  IF OLD.is_voided IS DISTINCT FROM NEW.is_voided THEN
    -- Set canonical flag so we can update positions (app.canonical_rpc is the correct parameter name)
    PERFORM set_config('app.canonical_rpc', 'true', true);

    -- Recompute the investor position
    PERFORM reconcile_investor_position_with_audit(
      NEW.investor_id,
      NEW.fund_id,
      NULL,
      'trigger:void_status_change'
    );

    -- Log the void status change
    INSERT INTO audit_log (
      action,
      entity_type,
      entity_id,
      details,
      created_at
    ) VALUES (
      CASE WHEN NEW.is_voided THEN 'TRANSACTION_VOIDED' ELSE 'TRANSACTION_UNVOIDED' END,
      'TRANSACTION',
      NEW.id::TEXT,
      jsonb_build_object(
        'transaction_id', NEW.id,
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'amount', NEW.amount,
        'type', NEW.type,
        'old_is_voided', OLD.is_voided,
        'new_is_voided', NEW.is_voided
      ),
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_recompute_on_void ON public.transactions_v2;

-- Create the trigger on void status change
CREATE TRIGGER trg_recompute_on_void
  AFTER UPDATE OF is_voided ON public.transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.recompute_on_void();

-- 2) Create AUM sync trigger function
-- After position updates, sync the fund's daily AUM
CREATE OR REPLACE FUNCTION public.sync_fund_aum_after_position()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calculated_aum NUMERIC(28,10);
  v_old_aum NUMERIC(28,10);
BEGIN
  -- Only act if current_value actually changed
  IF OLD.current_value IS DISTINCT FROM NEW.current_value THEN
    -- Set canonical flag (app.canonical_rpc is the correct parameter name)
    PERFORM set_config('app.canonical_rpc', 'true', true);

    -- Calculate total AUM for the fund
    SELECT COALESCE(SUM(current_value), 0) INTO v_calculated_aum
    FROM investor_positions
    WHERE fund_id = NEW.fund_id
      AND is_active = true;

    -- Get old AUM for audit logging
    SELECT total_aum INTO v_old_aum
    FROM fund_daily_aum
    WHERE fund_id = NEW.fund_id
      AND aum_date = CURRENT_DATE;

    -- Upsert the daily AUM record
    INSERT INTO fund_daily_aum (
      fund_id,
      aum_date,
      total_aum,
      purpose,
      source,
      updated_at
    ) VALUES (
      NEW.fund_id,
      CURRENT_DATE,
      v_calculated_aum,
      'reporting',
      'trigger:position_sync',
      now()
    )
    ON CONFLICT (fund_id, aum_date, purpose)
    DO UPDATE SET
      total_aum = EXCLUDED.total_aum,
      source = EXCLUDED.source,
      updated_at = now();

    -- Log AUM change if significant (>$1 difference)
    IF v_old_aum IS NOT NULL AND ABS(v_old_aum - v_calculated_aum) > 1 THEN
      INSERT INTO audit_log (
        action,
        entity_type,
        entity_id,
        details,
        created_at
      ) VALUES (
        'AUM_SYNCED',
        'FUND',
        NEW.fund_id::TEXT,
        jsonb_build_object(
          'fund_id', NEW.fund_id,
          'old_aum', v_old_aum,
          'new_aum', v_calculated_aum,
          'change', v_calculated_aum - v_old_aum,
          'triggered_by_position', NEW.id,
          'triggered_by_investor', NEW.investor_id
        ),
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_aum_after_position ON public.investor_positions;

-- Create the AUM sync trigger
CREATE TRIGGER trg_sync_aum_after_position
  AFTER UPDATE OF current_value ON public.investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_fund_aum_after_position();

-- 3) Create a pre-yield AUM validation function
-- Called before applying yield to ensure positions are reconciled
CREATE OR REPLACE FUNCTION public.validate_pre_yield_aum(
  p_fund_id UUID,
  p_tolerance_percentage NUMERIC DEFAULT 1.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reconciliation JSONB;
  v_recorded_aum NUMERIC(28,10);
  v_calculated_aum NUMERIC(28,10);
  v_discrepancy_pct NUMERIC(10,4);
  v_is_valid BOOLEAN;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check AUM reconciliation
  SELECT check_aum_reconciliation(p_fund_id, 0.01) INTO v_reconciliation;

  v_recorded_aum := (v_reconciliation->>'recorded_aum')::NUMERIC;
  v_calculated_aum := (v_reconciliation->>'calculated_aum')::NUMERIC;

  -- Calculate percentage discrepancy
  IF v_calculated_aum > 0 THEN
    v_discrepancy_pct := ABS(v_recorded_aum - v_calculated_aum) / v_calculated_aum * 100;
  ELSIF v_recorded_aum > 0 THEN
    v_discrepancy_pct := 100;
  ELSE
    v_discrepancy_pct := 0;
  END IF;

  v_is_valid := TRUE;

  -- Check for zero AUM
  IF v_calculated_aum <= 0 THEN
    v_errors := array_append(v_errors,
      format('Cannot apply yield: Calculated AUM is %s. Ensure positions are populated.', v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for significant discrepancy
  IF v_discrepancy_pct > p_tolerance_percentage THEN
    v_errors := array_append(v_errors,
      format('AUM discrepancy of %.2f%% exceeds tolerance of %.2f%%. Recorded: %s, Calculated: %s. Run reconciliation first.',
             v_discrepancy_pct, p_tolerance_percentage, v_recorded_aum, v_calculated_aum));
    v_is_valid := FALSE;
  END IF;

  -- Check for positions with zero value that have non-voided transactions
  IF EXISTS (
    SELECT 1
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value = 0
      AND EXISTS (
        SELECT 1
        FROM transactions_v2 t
        WHERE t.investor_id = ip.investor_id
          AND t.fund_id = ip.fund_id
          AND t.is_voided = false
          AND t.type IN ('DEPOSIT', 'YIELD', 'INTEREST')
      )
  ) THEN
    v_warnings := array_append(v_warnings,
      'Some positions have zero value but non-voided inflow transactions. Consider reconciliation.');
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'recorded_aum', v_recorded_aum,
    'calculated_aum', v_calculated_aum,
    'discrepancy_percentage', v_discrepancy_pct,
    'tolerance_percentage', p_tolerance_percentage,
    'errors', v_errors,
    'warnings', v_warnings,
    'checked_at', now()
  );
END;
$$;

-- 4) Create enhanced yield application gate
-- Wraps the yield apply function with pre-validation
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_validation(
  p_fund_id UUID,
  p_yield_date DATE,
  p_gross_yield_pct NUMERIC,
  p_created_by UUID,
  p_purpose TEXT DEFAULT 'transaction',
  p_skip_validation BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_validation JSONB;
  v_result JSONB;
BEGIN
  -- Pre-yield validation (unless explicitly skipped by super admin)
  IF NOT p_skip_validation THEN
    SELECT validate_pre_yield_aum(p_fund_id, 1.0) INTO v_validation;

    IF NOT (v_validation->>'is_valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pre-yield validation failed',
        'validation_errors', v_validation->'errors',
        'validation_warnings', v_validation->'warnings',
        'recorded_aum', v_validation->'recorded_aum',
        'calculated_aum', v_validation->'calculated_aum'
      );
    END IF;
  END IF;

  -- Call the existing yield apply function
  SELECT apply_daily_yield_to_fund_v3(
    p_fund_id,
    p_yield_date,
    p_gross_yield_pct,
    p_created_by,
    p_purpose::TEXT
  ) INTO v_result;

  -- Add validation info to result
  IF v_validation IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('validation', v_validation);
  END IF;

  RETURN v_result;
END;
$$;

-- 5) Grant execute permissions
GRANT EXECUTE ON FUNCTION public.recompute_on_void TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_fund_aum_after_position TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pre_yield_aum TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_with_validation TO authenticated;

-- 6) Log migration
INSERT INTO public.audit_log (
  action,
  entity_type,
  entity_id,
  details,
  created_at
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  '20260118000002',
  jsonb_build_object(
    'migration', '20260118000002_fix_recompute_triggers',
    'description', 'Trigger fixes for void status changes and AUM synchronization',
    'triggers_created', ARRAY['trg_recompute_on_void', 'trg_sync_aum_after_position'],
    'functions_created', ARRAY['recompute_on_void', 'sync_fund_aum_after_position', 'validate_pre_yield_aum', 'apply_daily_yield_with_validation']
  ),
  now()
);
