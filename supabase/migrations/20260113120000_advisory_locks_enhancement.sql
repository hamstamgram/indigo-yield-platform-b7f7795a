-- =====================================================
-- INDIGO Platform: Advisory Locks Enhancement
-- Date: 2026-01-13
-- Purpose: Add pg_advisory_xact_lock to prevent race conditions
-- in critical financial functions
-- =====================================================

-- =====================================================
-- 1. reset_all_investor_positions
-- Lock: Global bulk operation lock
-- =====================================================
CREATE OR REPLACE FUNCTION public.reset_all_investor_positions(p_admin_id uuid, p_confirmation_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_positions_count INTEGER;
  v_performance_count INTEGER;
  v_aum_count INTEGER;
  v_transactions_count INTEGER;
  v_total_aum_before NUMERIC;
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent bulk resets ==========
  PERFORM pg_advisory_xact_lock(hashtext('bulk_reset_all_positions'));

  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Verify confirmation code matches expected pattern
  IF p_confirmation_code != 'RESET POSITIONS' THEN
    RAISE EXCEPTION 'Invalid confirmation code';
  END IF;

  -- Get total AUM before reset for logging
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_aum_before
  FROM investor_positions;

  -- Create reset log entry
  INSERT INTO position_reset_log (reset_batch_id, admin_user_id, confirmation_code, status)
  VALUES (v_batch_id, p_admin_id, p_confirmation_code, 'in_progress');

  -- Archive investor_positions
  INSERT INTO investor_positions_archive (
    reset_batch_id, archived_by, investor_id, fund_id, fund_class,
    shares, cost_basis, current_value, unrealized_pnl, realized_pnl,
    last_transaction_date, lock_until_date, high_water_mark,
    mgmt_fees_paid, perf_fees_paid, aum_percentage, original_updated_at
  )
  SELECT
    v_batch_id, p_admin_id, investor_id, fund_id, fund_class,
    shares, cost_basis, current_value, unrealized_pnl, realized_pnl,
    last_transaction_date, lock_until_date, high_water_mark,
    mgmt_fees_paid, perf_fees_paid, aum_percentage, updated_at
  FROM investor_positions;

  GET DIAGNOSTICS v_positions_count = ROW_COUNT;

  -- Archive investor_fund_performance
  INSERT INTO investor_fund_performance_archive (
    reset_batch_id, archived_by, id, period_id, investor_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income,
    mtd_ending_balance, mtd_rate_of_return, qtd_beginning_balance, qtd_additions,
    qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income,
    ytd_ending_balance, ytd_rate_of_return, itd_beginning_balance, itd_additions,
    itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
    original_created_at, original_updated_at
  )
  SELECT
    v_batch_id, p_admin_id, id, period_id, investor_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income,
    mtd_ending_balance, mtd_rate_of_return, qtd_beginning_balance, qtd_additions,
    qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income,
    ytd_ending_balance, ytd_rate_of_return, itd_beginning_balance, itd_additions,
    itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return,
    created_at, updated_at
  FROM investor_fund_performance;

  GET DIAGNOSTICS v_performance_count = ROW_COUNT;

  -- Archive fund_daily_aum
  INSERT INTO fund_daily_aum_archive (
    reset_batch_id, archived_by, id, fund_id, aum_date, total_aum,
    nav_per_share, total_shares, as_of_date, source, original_created_at
  )
  SELECT
    v_batch_id, p_admin_id, id, fund_id, aum_date, total_aum,
    nav_per_share, total_shares, as_of_date, source, created_at
  FROM fund_daily_aum;

  GET DIAGNOSTICS v_aum_count = ROW_COUNT;

  -- Archive transactions_v2
  INSERT INTO transactions_v2_archive (
    reset_batch_id, archived_by, id, investor_id, fund_id, type, asset,
    amount, tx_date, reference_id, notes, created_by, original_created_at
  )
  SELECT
    v_batch_id, p_admin_id, id, investor_id, fund_id, type, asset,
    amount, tx_date, reference_id, notes, created_by, created_at
  FROM transactions_v2;

  GET DIAGNOSTICS v_transactions_count = ROW_COUNT;

  -- RESET: Update all positions to zero (keep rows for structure)
  UPDATE investor_positions SET
    shares = 0,
    cost_basis = 0,
    current_value = 0,
    unrealized_pnl = 0,
    realized_pnl = 0,
    high_water_mark = 0,
    mgmt_fees_paid = 0,
    perf_fees_paid = 0,
    aum_percentage = 0,
    updated_at = now();

  -- DELETE derived tables
  DELETE FROM investor_fund_performance;
  DELETE FROM fund_daily_aum;
  DELETE FROM transactions_v2;

  -- Also clear related caches/snapshots
  DELETE FROM fund_period_snapshot;
  DELETE FROM investor_period_snapshot;

  -- Update reset log with success
  UPDATE position_reset_log SET
    status = 'completed',
    completed_at = now(),
    affected_counts = jsonb_build_object(
      'positions_reset', v_positions_count,
      'performance_archived', v_performance_count,
      'aum_archived', v_aum_count,
      'transactions_archived', v_transactions_count,
      'total_aum_before', v_total_aum_before
    )
  WHERE reset_batch_id = v_batch_id;

  -- Log to audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'RESET_ALL_POSITIONS',
    'system',
    v_batch_id::text,
    p_admin_id,
    jsonb_build_object(
      'positions_reset', v_positions_count,
      'performance_archived', v_performance_count,
      'aum_archived', v_aum_count,
      'transactions_archived', v_transactions_count,
      'total_aum_before', v_total_aum_before,
      'advisory_lock', 'bulk_reset_all_positions'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'positions_reset', v_positions_count,
    'performance_archived', v_performance_count,
    'aum_archived', v_aum_count,
    'transactions_archived', v_transactions_count,
    'total_aum_before', v_total_aum_before
  );

EXCEPTION WHEN OTHERS THEN
  -- Log failure
  UPDATE position_reset_log SET
    status = 'failed',
    completed_at = now(),
    error_message = SQLERRM
  WHERE reset_batch_id = v_batch_id;

  RAISE;
END;
$function$;

-- =====================================================
-- 2. rollback_yield_correction
-- Lock: Fund-specific yield rollback lock
-- =====================================================
CREATE OR REPLACE FUNCTION public.rollback_yield_correction(p_correction_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_correction RECORD;
  v_admin_id UUID := auth.uid();
  v_is_super_admin BOOLEAN;
  v_fund_id UUID;
  v_date DATE;
  v_purpose aum_purpose;
  v_tx RECORD;
  v_rollback_ref TEXT;
  v_rolled_back_count INTEGER := 0;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT public.is_super_admin() INTO v_is_super_admin;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters');
  END IF;

  SELECT yc.*, yd.fund_id, yd.effective_date, yd.purpose
  INTO v_correction
  FROM yield_corrections yc
  JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
  WHERE yc.id = p_correction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction not found');
  END IF;

  IF v_correction.status = 'rolled_back' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Correction already rolled back');
  END IF;

  v_fund_id := v_correction.fund_id;
  v_date := v_correction.effective_date;
  v_purpose := v_correction.purpose;

  -- ========== ADVISORY LOCK: Prevent concurrent rollbacks for same fund ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_rollback:' || v_fund_id::text),
    hashtext(p_correction_id::text)
  );

  FOR v_tx IN SELECT * FROM transactions_v2 WHERE correction_id = p_correction_id
  LOOP
    v_rollback_ref := format('rollback:%s:%s', p_correction_id, v_tx.reference_id);
    IF NOT EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_rollback_ref) THEN
      INSERT INTO transactions_v2 (id, investor_id, fund_id, type, asset, fund_class, amount, tx_date, reference_id, notes, created_by, created_at, purpose, distribution_id, correction_id, visibility_scope, is_system_generated, source)
      VALUES (gen_random_uuid(), v_tx.investor_id, v_tx.fund_id, v_tx.type, v_tx.asset, v_tx.fund_class, -v_tx.amount, v_date, v_rollback_ref, format('Rollback: %s', p_reason), v_admin_id, now(), v_tx.purpose, v_tx.distribution_id, p_correction_id, v_tx.visibility_scope, true, 'yield_correction_rollback');

      UPDATE investor_positions SET current_value = current_value - v_tx.amount, updated_at = now() WHERE investor_id = v_tx.investor_id AND fund_id = v_tx.fund_id;
      v_rolled_back_count := v_rolled_back_count + 1;
    END IF;
  END LOOP;

  UPDATE fund_daily_aum SET total_aum = v_correction.old_aum, source = format('rollback:%s', p_correction_id), updated_at = now(), updated_by = v_admin_id WHERE fund_id = v_fund_id AND aum_date = v_date AND purpose = v_purpose;
  UPDATE yield_corrections SET status = 'rolled_back', rolled_back_at = now(), rolled_back_by = v_admin_id WHERE id = p_correction_id;
  UPDATE yield_distributions SET status = 'rolled_back' WHERE id = v_correction.correction_distribution_id;

  -- Audit log with lock info
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES (
    'YIELD_CORRECTION_ROLLBACK',
    'yield_corrections',
    p_correction_id::text,
    v_admin_id,
    jsonb_build_object(
      'fund_id', v_fund_id,
      'transactions_reversed', v_rolled_back_count,
      'restored_aum', v_correction.old_aum,
      'advisory_lock', 'yield_rollback:' || v_fund_id::text
    )
  );

  RETURN jsonb_build_object('success', true, 'correction_id', p_correction_id, 'transactions_reversed', v_rolled_back_count, 'restored_aum', v_correction.old_aum);
END;
$function$;

-- =====================================================
-- 3. process_yield_distribution
-- Lock: Fund-specific yield distribution lock
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_yield_distribution(p_fund_id uuid, p_gross_amount numeric, p_date date)
 RETURNS TABLE(investor_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
BEGIN
  -- ========== ADVISORY LOCK: Prevent concurrent yield distributions for same fund ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_distribution:' || p_fund_id::text),
    hashtext(p_date::text)
  );

  IF p_gross_amount IS NULL OR p_gross_amount <= 0 THEN RAISE EXCEPTION 'Gross amount must be positive'; END IF;
  SELECT asset INTO v_asset FROM funds WHERE id = p_fund_id;
  SELECT SUM(current_value) INTO v_total FROM investor_positions WHERE fund_id = p_fund_id;
  IF v_total IS NULL OR v_total <= 0 THEN RAISE EXCEPTION 'No positions or zero AUM'; END IF;

  v_ref := concat('yield:', p_fund_id, ':', p_date::text);

  FOR rec IN SELECT ip.investor_id, ip.current_value FROM investor_positions ip WHERE ip.fund_id = p_fund_id AND ip.current_value > 0 LOOP
    v_fee_pct := public._resolve_investor_fee_pct(rec.investor_id, p_fund_id, p_date);
    v_gross := p_gross_amount * (rec.current_value / v_total);
    v_fee := v_gross * (v_fee_pct / 100.0);
    v_net := v_gross - v_fee;

    INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
    VALUES (rec.investor_id, p_fund_id, 'INTEREST', v_asset, v_gross, p_date, v_ref, 'Yield distribution (gross)', now());

    IF v_fee <> 0 THEN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, asset, amount, tx_date, reference_id, notes, created_at)
      VALUES (rec.investor_id, p_fund_id, 'FEE', v_asset, -v_fee, p_date, v_ref, concat('Fee ', v_fee_pct, '%'), now());
    END IF;

    UPDATE investor_positions SET current_value = current_value + v_net, updated_at = now()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;

    investor_id := rec.investor_id; gross_amount := v_gross; fee_amount := v_fee; net_amount := v_net;
    RETURN NEXT;
  END LOOP;
END;
$function$;

-- =====================================================
-- 4. apply_yield_correction_v2
-- Lock: Fund-specific yield correction lock
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(p_fund_id uuid, p_period_start date, p_period_end date, p_purpose text, p_new_aum numeric, p_reason text, p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_purpose_enum aum_purpose;
  v_is_month_closed BOOLEAN := false;  -- Always false since feature removed
  v_is_super_admin BOOLEAN;
  v_preview JSONB;
  v_summary JSONB;
  v_investor_rows JSONB;
  v_tx_diffs JSONB;
  v_original_dist_id UUID;
  v_correction_dist_id UUID := gen_random_uuid();
  v_correction_run_id UUID := gen_random_uuid();
  v_old_aum NUMERIC;
  v_delta_aum NUMERIC;
  v_admin_id UUID := auth.uid();
  v_fund RECORD;
  v_inv RECORD;
  v_ref_prefix TEXT;
  v_input_hash TEXT;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fee_credit_delta NUMERIC := 0;
BEGIN
  -- Admin check
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  SELECT public.is_super_admin() INTO v_is_super_admin;
  v_purpose_enum := p_purpose::aum_purpose;

  -- ========== ADVISORY LOCK: Prevent concurrent corrections for same fund/period ==========
  PERFORM pg_advisory_xact_lock(
    hashtext('yield_correction:' || p_fund_id::text),
    hashtext(p_period_end::text || ':' || p_purpose)
  );

  -- Validate confirmation (simplified since no month closure)
  IF p_confirmation != 'APPLY CORRECTION' AND p_confirmation != 'APPLY CLOSED MONTH CORRECTION' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation');
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters');
  END IF;

  -- Get preview with time-weighted calculations
  v_preview := public.preview_yield_correction_v2(p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum);

  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  v_summary := v_preview->'summary';
  v_investor_rows := v_preview->'investor_rows';
  v_tx_diffs := v_preview->'tx_diffs';
  v_original_dist_id := (v_summary->>'original_distribution_id')::uuid;
  v_old_aum := (v_summary->>'old_aum')::numeric;
  v_delta_aum := (v_summary->>'delta_aum')::numeric;
  v_input_hash := v_summary->>'input_hash';

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;

  -- IDEMPOTENCY CHECK: Try to insert correction_run, will fail if duplicate
  BEGIN
    INSERT INTO correction_runs (
      id, fund_id, period_id, period_start, period_end, purpose, input_hash,
      old_aum, new_aum, delta_aum, original_distribution_id, correction_distribution_id,
      status, investors_affected, total_fee_delta, total_ib_delta, reason, preview_json,
      created_by, applied_at, applied_by
    ) VALUES (
      v_correction_run_id, p_fund_id,
      (SELECT id FROM statement_periods WHERE period_end_date >= p_period_end ORDER BY period_end_date ASC LIMIT 1),
      p_period_start, p_period_end, v_purpose_enum, v_input_hash,
      v_old_aum, p_new_aum, v_delta_aum, v_original_dist_id, v_correction_dist_id,
      'applied', (v_summary->>'investors_affected')::integer,
      (v_summary->>'total_fee_delta')::numeric, (v_summary->>'total_ib_delta')::numeric,
      p_reason, v_preview, v_admin_id, now(), v_admin_id
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'This exact correction has already been applied (idempotency check)');
  END;

  -- Create distribution records
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, gross_yield,
    distribution_type, status, created_by, reason, summary_json
  )
  SELECT
    COALESCE(v_original_dist_id, gen_random_uuid()), p_fund_id, p_period_end, v_purpose_enum,
    COALESCE((SELECT is_month_end FROM fund_daily_aum WHERE id = v_original_dist_id), true),
    v_old_aum, (v_summary->>'old_gross_yield')::numeric, 'original', 'applied',
    v_admin_id, 'Original distribution (backfilled for correction tracking)', NULL
  ON CONFLICT DO NOTHING;

  IF v_original_dist_id IS NULL THEN
    SELECT id INTO v_original_dist_id
    FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date = p_period_end
      AND purpose = v_purpose_enum
      AND distribution_type = 'original';
  END IF;

  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum,
    gross_yield, distribution_type, parent_distribution_id, status, created_by,
    reason, summary_json
  ) VALUES (
    v_correction_dist_id, p_fund_id, p_period_end, v_purpose_enum, true,
    p_new_aum, v_old_aum, (v_summary->>'new_gross_yield')::numeric, 'correction',
    v_original_dist_id, 'applied', v_admin_id, p_reason, v_preview
  );

  -- Insert yield_corrections record
  INSERT INTO yield_corrections (
    id, original_distribution_id, correction_distribution_id, status,
    old_aum, new_aum, delta_aum, old_gross_yield, new_gross_yield, delta_gross_yield,
    investors_affected, total_fee_delta, total_ib_delta, preview_json,
    applied_at, applied_by, reason, created_by
  ) VALUES (
    v_correction_run_id, v_original_dist_id, v_correction_dist_id, 'applied',
    v_old_aum, p_new_aum, v_delta_aum,
    (v_summary->>'old_gross_yield')::numeric,
    (v_summary->>'new_gross_yield')::numeric,
    (v_summary->>'delta_gross_yield')::numeric,
    (v_summary->>'investors_affected')::integer,
    (v_summary->>'total_fee_delta')::numeric,
    (v_summary->>'total_ib_delta')::numeric,
    v_preview, now(), v_admin_id, p_reason, v_admin_id
  );

  -- Reference prefix for deterministic transaction IDs
  v_ref_prefix := format('corr:%s:', v_correction_run_id);

  -- Process investor transactions
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_investor_rows) LOOP
    -- INTEREST delta
    IF ABS((v_inv.value->>'delta_net')::numeric) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'INTEREST', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_net')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':INTEREST',
        format('Yield correction (time-weighted): %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      UPDATE investor_positions
      SET current_value = current_value + (v_inv.value->>'delta_net')::numeric,
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'investor_id')::uuid
        AND fund_id = p_fund_id;
    END IF;

    -- FEE delta
    IF ABS((v_inv.value->>'delta_fee')::numeric) > 0.00000001
       AND (v_inv.value->>'investor_id')::uuid != v_indigo_fees_id THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'FEE', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_fee')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':FEE',
        format('Fee correction: %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      v_total_fee_credit_delta := v_total_fee_credit_delta +
        (v_inv.value->>'delta_fee')::numeric -
        COALESCE((v_inv.value->>'delta_ib')::numeric, 0);
    END IF;

    -- IB_CREDIT delta
    IF (v_inv.value->>'ib_parent_id') IS NOT NULL
       AND ABS(COALESCE((v_inv.value->>'delta_ib')::numeric, 0)) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'ib_parent_id')::uuid, p_fund_id,
        'IB_CREDIT', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_ib')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':IB_CREDIT',
        format('IB correction from %s: %s', v_inv.value->>'investor_name', p_reason),
        v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'admin_only', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

      UPDATE investor_positions
      SET current_value = current_value + (v_inv.value->>'delta_ib')::numeric,
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'ib_parent_id')::uuid
        AND fund_id = p_fund_id;
    END IF;
  END LOOP;

  -- FEE_CREDIT for INDIGO FEES
  IF ABS(v_total_fee_credit_delta) > 0.00000001 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, created_at, purpose, distribution_id,
      correction_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(), v_indigo_fees_id, p_fund_id,
      'FEE_CREDIT', v_fund.asset, v_fund.fund_class, v_total_fee_credit_delta,
      p_period_end, v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT',
      format('Platform fee correction: %s', p_reason), v_admin_id, now(),
      v_purpose_enum, v_correction_dist_id, v_correction_run_id,
      'admin_only', true, 'yield_correction_v2'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;

    UPDATE investor_positions
    SET current_value = current_value + v_total_fee_credit_delta,
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id
      AND fund_id = p_fund_id;
  END IF;

  -- Update fund_daily_aum
  UPDATE fund_daily_aum
  SET total_aum = p_new_aum,
      source = format('corrected_v2:%s', v_correction_run_id),
      updated_at = now(),
      updated_by = v_admin_id
  WHERE fund_id = p_fund_id
    AND aum_date = p_period_end
    AND purpose = v_purpose_enum;

  -- Audit log with advisory lock info
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'YIELD_CORRECTION_V2_APPLIED', 'correction_runs', v_correction_run_id::text,
    v_admin_id, jsonb_build_object('old_aum', v_old_aum),
    jsonb_build_object('new_aum', p_new_aum, 'delta', v_delta_aum),
    jsonb_build_object(
      'fund_id', p_fund_id, 'period_start', p_period_start, 'period_end', p_period_end,
      'purpose', p_purpose, 'reason', p_reason, 'is_month_closed', v_is_month_closed,
      'investors_affected', (v_summary->>'investors_affected')::integer,
      'time_weighted', true,
      'advisory_lock', 'yield_correction:' || p_fund_id::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_run_id,
    'distribution_id', v_correction_dist_id,
    'original_distribution_id', v_original_dist_id,
    'delta_aum', v_delta_aum,
    'investors_affected', (v_summary->>'investors_affected')::integer,
    'total_fee_delta', (v_summary->>'total_fee_delta')::numeric,
    'total_ib_delta', (v_summary->>'total_ib_delta')::numeric,
    'is_month_closed', v_is_month_closed,
    'input_hash', v_input_hash,
    'reconciliation', v_preview->'reconciliation',
    'message', format('Correction applied successfully with time-weighted ownership. %s investors updated.',
      (v_summary->>'investors_affected')::integer)
  );
END;
$function$;

-- =====================================================
-- Verification: Log migration completion
-- =====================================================
DO $$
BEGIN
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'MIGRATION_APPLIED',
    'migrations',
    '20260113120000_advisory_locks_enhancement',
    jsonb_build_object(
      'functions_updated', ARRAY[
        'reset_all_investor_positions',
        'rollback_yield_correction',
        'process_yield_distribution',
        'apply_yield_correction_v2'
      ],
      'enhancement', 'Advisory locks for race condition prevention',
      'applied_at', now()
    )
  );
END $$;
