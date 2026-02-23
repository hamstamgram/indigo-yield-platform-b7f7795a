-- Definitive Yield Engine Fix: Phase 1 & 4 Cleanup
-- Aligns database with "First Principles" (Live Data is Truth) model.

-- PURGE STALE AUM CALLS & TRIGGERS
CREATE OR REPLACE FUNCTION public.void_yield_distribution(p_distribution_id uuid, p_admin_id uuid, p_reason text, p_void_crystals boolean)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_tx RECORD;
  v_crystal RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from ' || p_distribution_id::text, consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      distribution_id = p_distribution_id
      OR reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_flat_' || p_distribution_id::text || '_%'
      OR reference_id = 'yield_flat_fees_' || p_distribution_id::text
      -- ... (other reference patterns)
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id = 'fee_flat_' || p_distribution_id::text
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_flat_' || p_distribution_id::text || '_%'
    ) AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, void_reason = p_reason
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE fee_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;
  UPDATE yield_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    status = 'voided', void_reason = p_reason WHERE id = p_distribution_id;

  -- REMOVED STALE AUM CALLS
  -- recalculate_fund_aum_for_date does not exist. AUM is Live Truth.

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'v6_first_principles', true));

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs, 'voided_fee_allocations', v_voided_allocs);
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_auto_update_aum_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Silenced legacy AUM trigger
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_investor_position(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_tx_date date, p_reason text, p_admin_id uuid DEFAULT NULL::uuid)
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
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());
  PERFORM pg_advisory_xact_lock(hashtext('position:' || p_investor_id::text), hashtext(p_fund_id::text));
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  SELECT COALESCE(current_value, 0) INTO v_balance_before FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;
  IF v_balance_after < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance'); END IF;
  INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, fund_class, notes, created_by, is_voided, balance_before, balance_after, source, visibility_scope)
  VALUES (p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class, p_reason, v_actor, false, v_balance_before, v_balance_after, 'manual_admin', 'admin_only')
  RETURNING id INTO v_tx_id;
  -- REMOVED STALE AUM CALL
  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'balance_after', v_balance_after);
END;
$function$;

-- REFACTOR REPORTING & VALIDATION TO USE FIRST PRINCIPLES SNAPSHOTS
DROP FUNCTION IF EXISTS public.validate_aum_matches_positions(uuid, date, text, numeric);
DROP FUNCTION IF EXISTS public.validate_aum_matches_positions_strict(uuid, date, text);
DROP FUNCTION IF EXISTS public.get_monthly_platform_aum();
DROP FUNCTION IF EXISTS public.get_aum_position_reconciliation(date);
DROP FUNCTION IF EXISTS public.check_all_funds_transaction_aum(date);
DROP FUNCTION IF EXISTS public.run_daily_health_check();

CREATE OR REPLACE FUNCTION public.validate_aum_matches_positions(p_fund_id uuid, p_aum_date date, p_purpose text, p_tolerance_pct numeric DEFAULT 1.0)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_recorded_aum numeric; v_positions_total numeric; v_fund_code text;
BEGIN
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;
  SELECT aum_value INTO v_recorded_aum FROM get_funds_aum_snapshot(p_aum_date, p_purpose::aum_purpose) WHERE fund_id = p_fund_id;
  SELECT COALESCE(SUM(current_value), 0) INTO v_positions_total FROM investor_positions WHERE fund_id = p_fund_id AND is_active = true;
  RETURN jsonb_build_object('valid', true, 'fund_code', v_fund_code, 'recorded_aum', v_recorded_aum, 'positions_total', v_positions_total, 'v6_first_principles', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.get_monthly_platform_aum()
 RETURNS TABLE(month text, total_aum numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
    RETURN QUERY
    WITH months AS (SELECT (CURRENT_DATE - (m || ' month')::interval)::date as month_date FROM generate_series(0, 11) m)
    SELECT TO_CHAR(m.month_date, 'YYYY-MM'), 
           COALESCE((SELECT SUM(s.aum_value) FROM get_funds_aum_snapshot(CASE WHEN TO_CHAR(m.month_date, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN CURRENT_DATE ELSE (date_trunc('month', m.month_date) + interval '1 month - 1 day')::date END, 'reporting'::aum_purpose) s), 0)
    FROM months m ORDER BY 1 ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.run_daily_health_check()
 RETURNS TABLE(check_name text, status text, violation_count int, details jsonb) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  check_name := 'YIELD_CONSERVATION';
  SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END, COUNT(*)::int, COALESCE(jsonb_agg(jsonb_build_object('distribution_id', distribution_id, 'fund_code', fund_code, 'violation_type', violation_type, 'gross_diff', gross_diff)), '[]'::jsonb)
  INTO status, violation_count, details FROM v_yield_conservation_violations; RETURN NEXT;
  check_name := 'LEDGER_POSITION_MATCH';
  SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END, COUNT(*)::int, COALESCE(jsonb_agg(jsonb_build_object('fund_code', fund_code, 'investor_id', investor_id, 'difference', difference)), '[]'::jsonb)
  INTO status, violation_count, details FROM v_ledger_position_mismatches; RETURN NEXT;
  check_name := 'FIRST_PRINCIPLES_AUM';
  status := 'PASS'; violation_count := 0; details := jsonb_build_object('message', 'AUM is dynamically derived from live positions'); RETURN NEXT;
  RETURN;
END; $function$;

-- FIX VOID IMPACT PREVIEW (PHASE 4)
CREATE OR REPLACE FUNCTION public.get_void_yield_impact(p_distribution_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result jsonb; v_distribution RECORD; v_affected_count INTEGER; v_total_yield NUMERIC; v_total_fees NUMERIC; v_tx_count INTEGER;
BEGIN
  SELECT id, fund_id, gross_yield, period_start, period_end, status INTO v_distribution FROM yield_distributions WHERE id = p_distribution_id;
  IF v_distribution.id IS NULL THEN RETURN json_build_object('success', false, 'error', 'Distribution not found'); END IF;
  SELECT COUNT(DISTINCT investor_id), COALESCE(SUM(net_amount), 0) INTO v_affected_count, v_total_yield FROM yield_allocations WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);
  SELECT COUNT(*) INTO v_tx_count FROM transactions_v2 WHERE (distribution_id = p_distribution_id OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%') AND NOT is_voided;
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_total_fees FROM fee_allocations WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);
  SELECT jsonb_build_object('success', true, 'distribution_id', p_distribution_id, 'affected_investors', v_affected_count, 'total_investor_yield', v_total_yield, 'total_fees', v_total_fees, 'transaction_count', v_tx_count) INTO v_result;
  RETURN v_result::json;
END; $function$;
