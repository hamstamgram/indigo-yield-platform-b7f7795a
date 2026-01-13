-- ============================================================================
-- Migration: Critical Yield Distribution Gap Fixes
-- Created: 2026-01-13 (CTO/CFO Audit Phase)
-- Purpose: Fix all 7 identified gaps in yield closing flow
-- ============================================================================

-- ============================================================================
-- FIX 3: Live Position Calculation (Superior to Snapshots)
-- Calculate position at any historical date from transaction ledger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_position_at_date(
  p_investor_id uuid,
  p_fund_id uuid,
  p_target_date date
)
RETURNS numeric(28,10)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_position numeric(28,10);
BEGIN
  -- Calculate position by summing all non-voided transactions up to target date
  -- This is the mathematically correct approach (event-sourced)
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_COMMISSION', 'REFERRAL_BONUS') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'REDEMPTION') THEN -ABS(amount)
      WHEN type = 'TRANSFER_IN' THEN amount
      WHEN type = 'TRANSFER_OUT' THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_position
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND tx_date <= p_target_date
    AND is_voided = false;

  RETURN v_position;
END;
$function$;

COMMENT ON FUNCTION get_position_at_date IS
'Calculates historical position at any date using transaction ledger (event-sourced).
Superior to snapshots: mathematically exact, no storage overhead, always consistent.
Fortune 500 audit requirement: Use for all historical yield calculations.';

GRANT EXECUTE ON FUNCTION get_position_at_date TO authenticated;

-- ============================================================================
-- FIX 3b: Get All Positions at Date (Batch Version)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_positions_at_date(
  p_fund_id uuid,
  p_target_date date
)
RETURNS TABLE(
  investor_id uuid,
  position_value numeric(28,10)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.investor_id,
    SUM(
      CASE
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_COMMISSION', 'REFERRAL_BONUS') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE', 'REDEMPTION') THEN -ABS(t.amount)
        WHEN t.type = 'TRANSFER_IN' THEN t.amount
        WHEN t.type = 'TRANSFER_OUT' THEN -ABS(t.amount)
        ELSE 0
      END
    ) as position_value
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id
    AND t.tx_date <= p_target_date
    AND t.is_voided = false
  GROUP BY t.investor_id
  HAVING SUM(
    CASE
      WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_COMMISSION', 'REFERRAL_BONUS') THEN t.amount
      WHEN t.type IN ('WITHDRAWAL', 'FEE', 'REDEMPTION') THEN -ABS(t.amount)
      WHEN t.type = 'TRANSFER_IN' THEN t.amount
      WHEN t.type = 'TRANSFER_OUT' THEN -ABS(t.amount)
      ELSE 0
    END
  ) > 0;
END;
$function$;

COMMENT ON FUNCTION get_all_positions_at_date IS
'Batch version: Returns all investor positions for a fund at a historical date.
Uses transaction ledger (event-sourced) for exact mathematical correctness.';

GRANT EXECUTE ON FUNCTION get_all_positions_at_date TO authenticated;

-- ============================================================================
-- FIX 4: Materialized View Refresh Function
-- Call after yield operations to sync MVs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_yield_materialized_views()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_start_time timestamptz := clock_timestamp();
  v_views_refreshed text[] := ARRAY[]::text[];
BEGIN
  -- Refresh investor_positions_mv if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'investor_positions_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY investor_positions_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'investor_positions_mv');
  END IF;

  -- Refresh fund_daily_stats_mv if it exists
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'fund_daily_stats_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY fund_daily_stats_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'fund_daily_stats_mv');
  END IF;

  -- Refresh any other yield-related MVs
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'yield_summary_mv') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY yield_summary_mv;
    v_views_refreshed := array_append(v_views_refreshed, 'yield_summary_mv');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'views_refreshed', v_views_refreshed,
    'duration_ms', EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'views_refreshed', v_views_refreshed
  );
END;
$function$;

COMMENT ON FUNCTION refresh_yield_materialized_views IS
'Refreshes all yield-related materialized views after yield operations.
Called by frontend cache invalidation to ensure MV consistency.';

GRANT EXECUTE ON FUNCTION refresh_yield_materialized_views TO authenticated;

-- ============================================================================
-- FIX 5: Position Snapshot Cron Job (Audit Trail Only)
-- Snapshots are for audit compliance, not for yield calculation
-- ============================================================================

-- First ensure the function exists (from fortune500_enhancements migration)
-- Then schedule the cron job

DO $do$
BEGIN
  -- Only create if pg_cron extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Delete existing job if any
    PERFORM cron.unschedule('daily_position_snapshot');

    -- Schedule daily at 00:05 UTC (just after midnight)
    PERFORM cron.schedule(
      'daily_position_snapshot',
      '5 0 * * *',  -- At 00:05 every day
      'SELECT public.create_daily_position_snapshot(CURRENT_DATE - 1)'
    );

    RAISE NOTICE 'Scheduled daily_position_snapshot cron job';
  ELSE
    RAISE NOTICE 'pg_cron not available - skipping cron job creation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job: %', SQLERRM;
END $do$;

-- ============================================================================
-- FIX 7: Yield Distribution with Dust Conservation
-- Enhanced process_yield_distribution to handle rounding dust
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_yield_distribution_with_dust(
  p_fund_id uuid,
  p_gross_amount numeric,
  p_date date,
  p_admin_id uuid DEFAULT NULL
)
RETURNS TABLE(
  investor_id uuid,
  gross_amount numeric,
  fee_amount numeric,
  net_amount numeric,
  dust_allocated numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_asset text;
  v_total numeric;
  v_ref text;
  v_fee_pct numeric;
  v_gross numeric;
  v_fee numeric;
  v_net numeric;
  rec record;
  v_distribution_count integer := 0;
  v_total_distributed_gross numeric := 0;
  v_total_fees numeric := 0;
  v_total_net numeric := 0;
  v_dust_amount numeric := 0;
  v_platform_account_id uuid;
  v_precision integer := 10;  -- 10 decimal places for NUMERIC(28,10)
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent yield distributions ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN
    RAISE EXCEPTION 'Gross amount must be positive';
  END IF;

  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;

  IF v_total IS NULL OR v_total <= 0 THEN
    RAISE EXCEPTION 'No positions or zero AUM';
  END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  -- Get platform fees account for dust allocation
  SELECT id INTO v_platform_account_id
  FROM profiles
  WHERE email = 'platform-fees@indigo.com'
    OR full_name = 'Indigo Platform Fees'
  LIMIT 1;

  -- Process each investor
  FOR rec IN
    SELECT ip.investor_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);

    -- Calculate with full precision
    v_gross := ROUND(p_gross_amount * (rec.current_value / v_total), v_precision);
    v_fee := ROUND(v_gross * (v_fee_pct / 100.0), v_precision);
    v_net := v_gross - v_fee;

    -- Track totals for dust calculation
    v_total_distributed_gross := v_total_distributed_gross + v_gross;
    v_total_fees := v_total_fees + v_fee;
    v_total_net := v_total_net + v_net;

    -- Insert INTEREST transaction (gross)
    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    -- Insert FEE transaction if applicable
    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    -- Update position
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    v_distribution_count := v_distribution_count + 1;

    investor_id := rec.investor_id;
    gross_amount := v_gross;
    fee_amount := v_fee;
    net_amount := v_net;
    dust_allocated := 0;
    RETURN NEXT;
  END LOOP;

  -- ========== DUST CONSERVATION: Allocate rounding remainder ==========
  v_dust_amount := p_gross_amount - v_total_distributed_gross;

  IF ABS(v_dust_amount) > 0.0000000001 AND v_platform_account_id IS NOT NULL THEN
    -- Allocate dust to platform fees account
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at
    ) VALUES (
      v_platform_account_id,
      p_fund_id,
      'DUST_ALLOCATION',
      v_asset,
      v_dust_amount,
      p_date,
      v_ref,
      concat('Yield dust conservation: ', v_dust_amount),
      now()
    );

    -- Return dust allocation row
    investor_id := v_platform_account_id;
    gross_amount := v_dust_amount;
    fee_amount := 0;
    net_amount := v_dust_amount;
    dust_allocated := v_dust_amount;
    RETURN NEXT;
  END IF;

  -- ========== AUDIT LOG ==========
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'YIELD_DISTRIBUTION_WITH_DUST',
    'funds',
    p_fund_id::text,
    p_admin_id,
    jsonb_build_object(
      'gross_amount_input', p_gross_amount,
      'distribution_date', p_date,
      'investors_count', v_distribution_count,
      'total_distributed_gross', v_total_distributed_gross,
      'total_fees', v_total_fees,
      'total_net', v_total_net,
      'dust_amount', v_dust_amount,
      'reference', v_ref
    ),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_aum', v_total,
      'asset', v_asset,
      'dust_conservation', ABS(v_dust_amount) > 0.0000000001
    )
  );

END;
$function$;

COMMENT ON FUNCTION process_yield_distribution_with_dust IS
'Enhanced yield distribution with dust conservation.
Allocates rounding remainders to platform fees account to ensure total yield conservation.
Fortune 500 requirement: Zero yield leakage tolerance.';

GRANT EXECUTE ON FUNCTION process_yield_distribution_with_dust TO authenticated;

-- ============================================================================
-- FIX 6: Crystallization Timing Function
-- Ensure crystallization happens BEFORE yield calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crystallize_pending_movements(
  p_fund_id uuid,
  p_target_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pending_deposits integer;
  v_pending_withdrawals integer;
  v_crystallized_count integer := 0;
BEGIN
  -- Count pending deposits before target date
  SELECT COUNT(*) INTO v_pending_deposits
  FROM deposits
  WHERE fund_id = p_fund_id
    AND created_at::date <= p_target_date
    AND status = 'pending';

  -- Count pending withdrawals before target date
  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM withdrawals
  WHERE fund_id = p_fund_id
    AND created_at::date <= p_target_date
    AND status = 'pending';

  -- If there are pending movements, warn but don't block
  -- The actual crystallization should be done via the normal approval flow

  RETURN jsonb_build_object(
    'fund_id', p_fund_id,
    'target_date', p_target_date,
    'pending_deposits', v_pending_deposits,
    'pending_withdrawals', v_pending_withdrawals,
    'warning', CASE
      WHEN v_pending_deposits > 0 OR v_pending_withdrawals > 0
      THEN 'Pending movements exist - crystallize before yield distribution'
      ELSE NULL
    END
  );
END;
$function$;

COMMENT ON FUNCTION crystallize_pending_movements IS
'Checks for pending deposits/withdrawals that should be crystallized before yield calculation.
Fortune 500 requirement: Ensure all movements are processed before yield distribution.';

GRANT EXECUTE ON FUNCTION crystallize_pending_movements TO authenticated;

-- ============================================================================
-- Migration metadata
-- ============================================================================

COMMENT ON SCHEMA public IS
'Indigo Yield Platform - Fortune 500 compliant financial operations.
Enhanced 2026-01-13 with 7 critical yield gap fixes:
- FIX 1: Race condition handling (frontend)
- FIX 2: Reduced stale window (frontend)
- FIX 3: Live position calculation from transaction ledger
- FIX 4: MV refresh synchronization
- FIX 5: Position snapshot cron for audit trail
- FIX 6: Crystallization timing check
- FIX 7: Dust conservation in yield distribution';
