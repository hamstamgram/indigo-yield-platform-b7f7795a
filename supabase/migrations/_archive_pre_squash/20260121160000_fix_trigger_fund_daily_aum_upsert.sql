-- Migration: Fix trigger functions that use ON CONFLICT with fund_daily_aum
-- Created: 2026-01-21
--
-- BUG: These trigger functions use ON CONFLICT (fund_id, aum_date, purpose) WHERE is_voided = false
-- PostgreSQL cannot use partial unique indexes with ON CONFLICT (columns) syntax directly.
-- The workaround is to use ON CONFLICT ON CONSTRAINT constraint_name, but since it's an index
-- not a constraint, we need to use UPDATE-then-INSERT pattern.
--
-- FIX: Use UPDATE-then-INSERT pattern for all fund_daily_aum upserts in triggers

-- ============================================================================
-- FIX 1: sync_aum_on_position_change
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_aum_on_position_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_id uuid;
  v_new_aum numeric(28,10);
  v_aum_date date;
  v_tx_date_str text;
  v_already_synced text;
  v_updated_rows int;
BEGIN
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);

  -- Check if AUM was already synced by transaction trigger
  BEGIN
    v_already_synced := current_setting('indigo.aum_synced', true);
    IF v_already_synced = 'true' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Get transaction date from session variable
  BEGIN
    v_tx_date_str := current_setting('indigo.current_tx_date', true);
    IF v_tx_date_str IS NOT NULL AND v_tx_date_str != '' THEN
      v_aum_date := v_tx_date_str::date;
    ELSE
      v_aum_date := CURRENT_DATE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_aum_date := CURRENT_DATE;
  END;

  PERFORM public.set_canonical_rpc(true);

  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true;

  -- FIX: Use UPDATE-then-INSERT pattern (cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_new_aum,
      source = 'tx_position_sync',
      updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = v_aum_date
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
    VALUES (v_fund_id, v_aum_date, v_new_aum, 'tx_position_sync', 'transaction', false);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- ============================================================================
-- FIX 2: sync_aum_on_transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_aum_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_aum numeric(28,10);
  v_tx_date date;
  v_updated_rows int;
BEGIN
  -- Only process non-voided transactions
  IF NEW.is_voided = true THEN
    RETURN NEW;
  END IF;

  -- Use the transaction's date, not current date
  v_tx_date := NEW.tx_date;

  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Calculate new AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = NEW.fund_id AND is_active = true;

  -- Set session variables for position triggers
  PERFORM set_config('indigo.current_tx_date', v_tx_date::text, true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  -- FIX: Use UPDATE-then-INSERT pattern (cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_new_aum,
      source = 'tx_sync',
      updated_at = now()
  WHERE fund_id = NEW.fund_id
    AND aum_date = v_tx_date
    AND purpose = 'transaction'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided)
    VALUES (NEW.fund_id, v_tx_date, v_new_aum, 'transaction', 'tx_sync', false);
  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- FIX 3: sync_fund_aum_after_position
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_fund_aum_after_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_id uuid;
  v_calculated_aum numeric(28,10);
  v_updated_rows int;
BEGIN
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);

  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Calculate total AUM from all active positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_calculated_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true;

  -- FIX: Use UPDATE-then-INSERT pattern (cannot use ON CONFLICT with partial unique index)
  UPDATE fund_daily_aum
  SET total_aum = v_calculated_aum,
      source = 'trigger:position_sync',
      updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = CURRENT_DATE
    AND purpose = 'reporting'
    AND is_voided = false;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided, updated_at)
    VALUES (v_fund_id, CURRENT_DATE, v_calculated_aum, 'reporting', 'trigger:position_sync', false, now());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION sync_aum_on_position_change IS
'Trigger to sync AUM when positions change. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';

COMMENT ON FUNCTION sync_aum_on_transaction IS
'Trigger to sync AUM when transactions are created. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';

COMMENT ON FUNCTION sync_fund_aum_after_position IS
'Trigger to sync fund AUM after position changes. FIX: Uses UPDATE-then-INSERT for fund_daily_aum (partial unique index).';
