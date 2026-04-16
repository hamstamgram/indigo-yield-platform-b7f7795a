-- ============================================================
-- Security Tier 1: Add is_admin() JWT gates to 13 SECDEF functions
-- Date: 2026-04-16
-- ============================================================
-- Category A: NO admin check at all (4 functions)
--   1. apply_segmented_yield_distribution_v5 — add is_admin() + canonical_rpc already present
--   2. finalize_month_yield — add is_admin() + canonical_rpc
--   3. unvoid_transactions_bulk — add is_admin() (has user_roles super_admin check, needs JWT)
--   4. void_and_reissue_full_exit — add is_admin() + canonical_rpc already present
--
-- Category B: Has param-based check only, needs is_admin() JWT defense-in-depth (9 functions)
--   5. edit_transaction — has check_is_admin(v_actor_id), add is_admin()
--   6. update_transaction — has check_is_admin(v_actor_id), add is_admin() + canonical_rpc
--   7. void_transactions_bulk — has check_is_admin(p_admin_id), add is_admin() + canonical_rpc
--   8. unvoid_transaction — has profiles.is_admin check, add is_admin()
--   9. force_delete_investor — has user_roles join, add is_admin()
--  10. void_and_reissue_transaction — has profiles.is_admin, add is_admin() (canonical_rpc present)
--  11. route_withdrawal_to_fees — has has_super_admin_role(p_actor_id), add is_admin()
--  12. reject_withdrawal — has ensure_admin() JWT check — ADD canonical_rpc only
--  13. update_admin_role — has has_super_admin_role(v_caller_id), add is_super_admin() JWT + canonical_rpc
-- ============================================================


-- ============================================================
-- 1. apply_segmented_yield_distribution_v5 (Category A)
--    Frontend caller: yieldApplyService.ts
--    Has: canonical_rpc ✓
--    Missing: is_admin() JWT check
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid" DEFAULT NULL::"uuid", "p_purpose" "public"."aum_purpose" DEFAULT 'transaction'::"public"."aum_purpose", "p_distribution_date" "date" DEFAULT NULL::"date", "p_opening_aum" numeric DEFAULT NULL::numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin uuid;
  v_fund RECORD;
  v_period_start date;
  v_period_end date;
  v_tx_date date;
  v_is_month_end boolean;
  v_lock_key bigint;
  v_distribution_id uuid;
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_pre_day_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fees_account_gross numeric := 0;
  v_fees_account_net numeric := 0;
  v_allocation_count int := 0;
  v_residual numeric := 0;
  v_inv RECORD;
  v_alloc RECORD;
  v_share numeric;
  v_gross numeric;
  v_fee numeric;
  v_ib numeric;
  v_net numeric;
  v_fee_pct numeric;
  v_ib_rate numeric;
  v_tx_result json;
  v_yield_tx_id uuid;
  v_fee_tx_result json;
  v_fee_tx_id uuid;
  v_ib_tx_result json;
  v_ib_tx_id uuid;
  v_final_positions_sum numeric;
  v_updated_rows int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.aum_synced', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Admin authentication required';
  END IF;

  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  IF p_purpose = 'reporting'::aum_purpose THEN
    v_period_start := GREATEST(
      date_trunc('month', p_period_end)::date,
      COALESCE(v_fund.inception_date, date_trunc('month', p_period_end)::date)
    );
    v_period_end := (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date;
  ELSE
    v_period_start := p_period_end;
    v_period_end := p_period_end;
  END IF;

  v_is_month_end := (p_period_end = (date_trunc('month', p_period_end) + interval '1 month - 1 day')::date);
  v_tx_date := COALESCE(p_distribution_date, v_period_end);

  v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_purpose = 'reporting'::aum_purpose THEN
    IF EXISTS (
      SELECT 1 FROM yield_distributions
      WHERE fund_id = p_fund_id AND period_end = v_period_end
        AND purpose = 'reporting' AND is_voided = false
        AND consolidated_into_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Reporting yield distribution already exists for fund % period %', p_fund_id, v_period_end;
    END IF;
  END IF;

  v_opening_aum := COALESCE(p_opening_aum, 0);

  SELECT COALESCE(SUM(current_value), 0) INTO v_pre_day_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND is_active = true AND account_type = 'investor';

  SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' AND is_system_account = true LIMIT 1;

  IF p_purpose = 'transaction'::aum_purpose AND v_opening_aum = 0 THEN
    v_opening_aum := v_pre_day_aum;
  ELSIF p_purpose = 'reporting'::aum_purpose AND v_opening_aum = 0 THEN
    SELECT COALESCE(total_aum, 0) INTO v_opening_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id AND aum_date = v_period_start AND purpose = 'transaction' AND is_voided = false
    ORDER BY created_at DESC LIMIT 1;
    IF v_opening_aum = 0 THEN
      v_opening_aum := v_pre_day_aum;
    END IF;
  END IF;

  IF v_opening_aum <= 0 AND (v_opening_aum = 0 AND p_recorded_aum = 0) THEN
    RAISE EXCEPTION 'Cannot compute yield: opening AUM is zero for fund %', p_fund_id;
  END IF;

  IF p_recorded_aum IS NOT NULL AND p_recorded_aum > 0 THEN
    v_total_month_yield := p_recorded_aum - v_opening_aum;
  ELSE
    RAISE EXCEPTION 'Recorded AUM (closing) must be provided and positive';
  END IF;

  IF v_total_month_yield < 0 THEN
    v_is_negative_yield := true;
  END IF;

  INSERT INTO yield_distributions (
    id, fund_id, purpose, period_start, period_end, effective_date,
    gross_yield, gross_yield_amount, opening_aum, closing_aum,
    fees_account_gross_yield, fees_account_net_yield,
    status, created_by
  ) VALUES (
    gen_random_uuid(), p_fund_id, p_purpose, v_period_start, v_period_end, v_tx_date,
    CASE WHEN v_opening_aum > 0 THEN v_total_month_yield / v_opening_aum ELSE 0 END,
    v_total_month_yield, v_opening_aum, p_recorded_aum,
    0, 0,
    'applied', v_admin
  ) RETURNING id INTO v_distribution_id;

  FOR v_inv IN
    SELECT ip.investor_id, ip.current_value, ip.aum_percentage,
      COALESCE(fs.fee_percentage, 0) as fee_pct,
      COALESCE((SELECT ib_rate FROM investor_ib_schedule WHERE investor_id = ip.investor_id AND fund_id = p_fund_id ORDER BY effective_date DESC LIMIT 1), 0) as ib_rate
    FROM investor_positions ip
    LEFT JOIN investor_fee_schedule fs ON fs.investor_id = ip.investor_id AND fs.fund_id = p_fund_id
      AND fs.status = 'active'
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.account_type = 'investor'
  LOOP
    v_share := COALESCE(v_inv.aum_percentage, 0) / 100.0;
    v_gross := v_total_month_yield * v_share;
    v_fee_pct := v_inv.fee_pct / 100.0;
    v_fee := v_gross * v_fee_pct;
    v_ib_rate := v_inv.ib_rate / 100.0;
    v_ib := v_gross * v_ib_rate;
    v_net := v_gross - v_fee - v_ib;

    v_total_gross := v_total_gross + v_gross;
    v_total_net := v_total_net + v_net;
    v_total_fees := v_total_fees + v_fee;
    v_total_ib := v_total_ib + v_ib;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id,
      gross_amount, fee_pct, fee_amount, ib_pct, ib_fee_amount, net_amount,
      opening_balance, closing_balance, purpose
    ) VALUES (
      v_distribution_id, v_inv.investor_id, p_fund_id,
      v_gross, v_inv.fee_pct, v_fee, v_inv.ib_rate * 100, v_ib, v_net,
      v_inv.current_value, v_inv.current_value + v_net, p_purpose
    );

    v_allocation_count := v_allocation_count + 1;

    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      notes, created_by, source, visibility_scope
    ) VALUES (
      v_inv.investor_id, p_fund_id, 'YIELD', v_net, v_tx_date, v_tx_date,
      'Yield distribution ' || v_distribution_id, v_admin,
      'rpc_canonical', 'investor_visible'
    ) RETURNING id INTO v_yield_tx_id;

    INSERT INTO investor_yield_events (
      investor_id, fund_id, event_date, yield_type, gross_yield, fees_deducted,
      ib_deducted, net_yield_amount, source_distribution_id, visibility_scope
    ) VALUES (
      v_inv.investor_id, p_fund_id, v_tx_date, 'monthly',
      v_gross, v_fee, v_ib, v_net, v_distribution_id, 'admin_only'
    );
  END LOOP;

  IF v_fees_account_id IS NOT NULL THEN
    v_fees_account_gross := v_total_fees;
    v_fees_account_net := v_total_fees - v_total_ib;

    INSERT INTO yield_allocations (
      distribution_id, investor_id, fund_id,
      gross_amount, fee_pct, fee_amount, ib_pct, ib_fee_amount, net_amount,
      opening_balance, closing_balance, purpose
    ) VALUES (
      v_distribution_id, v_fees_account_id, p_fund_id,
      v_fees_account_gross, 0, 0, 0, 0, v_fees_account_net,
      0, v_fees_account_net, p_purpose
    );
  END IF;

  IF v_total_gross > 0 AND ABS(v_total_gross - (v_total_net + v_total_fees + v_total_ib)) > 0.01 THEN
    RAISE EXCEPTION 'Yield conservation violated: gross=%, net+fees+ib=%', v_total_gross, v_total_net + v_total_fees + v_total_ib;
  END IF;

  UPDATE yield_distributions SET
    fees_account_gross_yield = v_fees_account_gross,
    fees_account_net_yield = v_fees_account_net
  WHERE id = v_distribution_id;

  v_final_positions_sum := 0;
  SELECT COALESCE(SUM(current_value), 0) INTO v_final_positions_sum
  FROM investor_positions WHERE fund_id = p_fund_id AND is_active = true;

  IF ABS(v_final_positions_sum - p_recorded_aum) > 0.01 AND p_purpose = 'transaction' THEN
    PERFORM public.sync_aum_to_positions(p_fund_id, p_recorded_aum, v_admin);
  END IF;

  PERFORM public.recalculate_fund_aum_for_date(p_fund_id, v_tx_date, p_purpose, v_admin);

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'total_gross', v_total_gross,
    'total_net', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'allocation_count', v_allocation_count
  );
END;
$$;

ALTER FUNCTION "public"."apply_segmented_yield_distribution_v5"("p_fund_id" "uuid", "p_period_end" "date", "p_recorded_aum" numeric, "p_admin_id" "uuid", "p_purpose" "public"."aum_purpose", "p_distribution_date" "date", "p_opening_aum" numeric) OWNER TO "postgres";


-- ============================================================
-- 2. finalize_month_yield (Category A)
--    Frontend caller: yieldCrystallizationService.ts
--    Missing: both is_admin() and canonical_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_events_updated integer;
  v_total_yield numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_period_start := make_date(p_period_year, p_period_month, 1);
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;

  SELECT COALESCE(SUM(net_yield_amount), 0)
  INTO v_total_yield
  FROM investor_yield_events
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;

  UPDATE investor_yield_events
  SET
    visibility_scope = 'investor_visible',
    made_visible_at = now(),
    made_visible_by = p_admin_id
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;

  GET DIAGNOSTICS v_events_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'events_made_visible', v_events_updated,
    'total_yield_finalized', v_total_yield
  );
END;
$$;

ALTER FUNCTION "public"."finalize_month_yield"("p_fund_id" "uuid", "p_period_year" integer, "p_period_month" integer, "p_admin_id" "uuid") OWNER TO "postgres";


-- ============================================================
-- 3. unvoid_transactions_bulk (Category A)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: user_roles super_admin check on p_admin_id
--    Missing: is_admin() JWT check
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
  v_results jsonb[] := '{}';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_admin_id AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_SUPER_ADMIN', 'message', 'Super admin access required for bulk operations');
  END IF;

  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_BATCH_SIZE', 'message', 'Batch size must be between 1 and 50');
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_REASON', 'message', 'Reason must be at least 3 characters');
  END IF;

  IF EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE id = ANY(p_transaction_ids) AND (is_voided IS DISTINCT FROM true)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_VOIDED', 'message', 'One or more transactions are not voided');
  END IF;

  IF (SELECT count(*) FROM transactions_v2 WHERE id = ANY(p_transaction_ids)) != v_count THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'NOT_FOUND', 'message', 'One or more transactions not found');
  END IF;

  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := public.unvoid_transaction(v_tx_id, p_admin_id, p_reason);
    v_results := v_results || v_single_result;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_count,
    'results', v_results
  );
END;
$$;

ALTER FUNCTION "public"."unvoid_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 4. void_and_reissue_full_exit (Category A)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: canonical_rpc ✓
--    Missing: is_admin() JWT check
--    Note: calls void_transaction() which has its own admin gate
-- ============================================================
-- Rather than recreating this complex function entirely, we inject the
-- admin check at the earliest point by wrapping the beginning.
CREATE OR REPLACE FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date" DEFAULT NULL::"date", "p_send_precision" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_withdrawal_request RECORD;
  v_void_result jsonb;
  v_dust_sweep_count int := 0;
  v_investor_id uuid;
  v_fund_id uuid;
  v_asset text;
  v_original_amount numeric;
  v_restored_amount numeric;
  v_new_withdrawal_amount numeric;
  v_dust_amount numeric;
  v_new_withdrawal_tx_id uuid;
  v_dust_debit_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_balance_before numeric;
  v_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  v_investor_id := v_tx.investor_id;
  v_fund_id := v_tx.fund_id;
  v_asset := v_tx.asset;
  v_original_amount := ABS(v_tx.amount);

  SELECT * INTO v_withdrawal_request FROM withdrawal_requests
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id
    AND status IN ('completed', 'approved')
  ORDER BY created_at DESC LIMIT 1;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(amount), 0) INTO v_restored_amount
  FROM transactions_v2
  WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = false;

  IF v_restored_amount < 0 THEN v_restored_amount := 0; END IF;

  IF p_new_amount > v_restored_amount THEN
    RAISE EXCEPTION 'New withdrawal amount (%) exceeds restored balance (%)', p_new_amount, v_restored_amount;
  END IF;

  v_new_withdrawal_amount := p_new_amount;
  v_dust_amount := v_restored_amount - v_new_withdrawal_amount;

  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true LIMIT 1;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, tx_date, value_date,
    notes, created_by, source, visibility_scope, is_system_generated
  ) VALUES (
    v_investor_id, v_fund_id, 'WITHDRAWAL', -1 * v_new_withdrawal_amount, v_asset,
    COALESCE(p_new_date, v_tx.tx_date), COALESCE(p_new_date, v_tx.tx_date),
    'Reissued withdrawal (full exit)', p_admin_id, 'rpc_canonical',
    'investor_visible', false
  ) RETURNING id INTO v_new_withdrawal_tx_id;

  IF v_dust_amount > 0.000001 THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      notes, created_by, source, visibility_scope, is_system_generated
    ) VALUES (
      v_fees_account_id, v_fund_id, 'INTERNAL_CREDIT', v_dust_amount, v_asset,
      COALESCE(p_new_date, v_tx.tx_date), COALESCE(p_new_date, v_tx.tx_date),
      'Dust from full-exit reissue', p_admin_id, 'rpc_canonical',
      'admin_only', true
    ) RETURNING id INTO v_dust_credit_tx_id;

    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, value_date,
      notes, created_by, source, visibility_scope, is_system_generated
    ) VALUES (
      v_investor_id, v_fund_id, 'INTERNAL_WITHDRAWAL', -1 * v_dust_amount, v_asset,
      COALESCE(p_new_date, v_tx.tx_date), COALESCE(p_new_date, v_tx.tx_date),
      'Dust sweep from full-exit reissue', p_admin_id, 'rpc_canonical',
      'admin_only', true
    ) RETURNING id INTO v_dust_debit_tx_id;

    v_dust_sweep_count := 2;
  END IF;

  SELECT COALESCE(SUM(current_value), 0) INTO v_closing_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id AND is_active = true AND account_type = 'investor';

  PERFORM public.recalculate_fund_aum_for_date(v_fund_id, COALESCE(p_new_date, v_tx.tx_date), 'transaction'::aum_purpose, p_admin_id);

  RETURN json_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'new_withdrawal_tx_id', v_new_withdrawal_tx_id,
    'new_amount', v_new_withdrawal_amount,
    'dust_amount', v_dust_amount,
    'dust_sweep_count', v_dust_sweep_count,
    'closing_aum', v_closing_aum
  );
END;
$$;

ALTER FUNCTION "public"."void_and_reissue_full_exit"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_reason" "text", "p_new_date" "date", "p_send_precision" "text") OWNER TO "postgres";


-- ============================================================
-- 5. edit_transaction (Category B)
--    Frontend caller: depositService.ts
--    Has: check_is_admin(v_actor_id)
--    Add: is_admin() JWT gate as defense-in-depth
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text" DEFAULT NULL::"text", "p_tx_hash" "text" DEFAULT NULL::"text", "p_reference_id" "text" DEFAULT NULL::"text", "p_tx_date" "date" DEFAULT NULL::"date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_record transactions_v2%ROWTYPE;
  v_new_record transactions_v2%ROWTYPE;
  v_actor_id uuid;
  v_changes jsonb := '{}';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('edit_tx'), hashtext(p_transaction_id::text));

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  v_actor_id := auth.uid();

  IF NOT public.check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Only admins can edit transactions';
  END IF;

  SELECT * INTO v_old_record FROM transactions_v2 WHERE id = p_transaction_id;

  IF v_old_record.id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_old_record.is_voided = true THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  IF p_notes IS NOT NULL AND p_notes IS DISTINCT FROM v_old_record.notes THEN
    v_changes := v_changes || jsonb_build_object('notes', jsonb_build_object('old', v_old_record.notes, 'new', p_notes));
  END IF;
  IF p_tx_hash IS NOT NULL AND p_tx_hash IS DISTINCT FROM v_old_record.tx_hash THEN
    v_changes := v_changes || jsonb_build_object('tx_hash', jsonb_build_object('old', v_old_record.tx_hash, 'new', p_tx_hash));
  END IF;
  IF p_reference_id IS NOT NULL AND p_reference_id IS DISTINCT FROM v_old_record.reference_id THEN
    v_changes := v_changes || jsonb_build_object('reference_id', jsonb_build_object('old', v_old_record.reference_id, 'new', p_reference_id));
  END IF;
  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    v_changes := v_changes || jsonb_build_object('tx_date', jsonb_build_object('old', v_old_record.tx_date, 'new', p_tx_date));
  END IF;

  IF v_changes = '{}' THEN
    RETURN jsonb_build_object('success', true, 'message', 'No changes detected');
  END IF;

  UPDATE transactions_v2
  SET notes = COALESCE(p_notes, notes), tx_hash = COALESCE(p_tx_hash, tx_hash),
      reference_id = COALESCE(p_reference_id, reference_id), tx_date = COALESCE(p_tx_date, tx_date),
      updated_at = now()
  WHERE id = p_transaction_id
  RETURNING * INTO v_new_record;

  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', p_transaction_id::text, 'UPDATE', v_actor_id,
    to_jsonb(v_old_record), to_jsonb(v_new_record),
    jsonb_build_object('changes', v_changes, 'source', 'edit_transaction_rpc'));

  IF p_tx_date IS NOT NULL AND p_tx_date IS DISTINCT FROM v_old_record.tx_date THEN
    PERFORM public.recompute_investor_position(v_old_record.investor_id, v_old_record.fund_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id, 'changes', v_changes);
END;
$$;

ALTER FUNCTION "public"."edit_transaction"("p_transaction_id" "uuid", "p_notes" "text", "p_tx_hash" "text", "p_reference_id" "text", "p_tx_date" "date") OWNER TO "postgres";


-- ============================================================
-- 6. update_transaction (Category B)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: check_is_admin(v_actor_id)
--    Add: is_admin() JWT gate + canonical_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx record;
  v_actor_id uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_allowed_fields text[] := ARRAY['tx_date', 'value_date', 'notes', 'tx_hash', 'amount', 'type', 'fund_id', 'reference_id'];
  v_field text;
  v_new_amount numeric;
  v_new_fund_id uuid;
  v_old_fund_id uuid;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Edit reason is required';
  END IF;

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  IF p_updates ? 'investor_id' THEN
    RAISE EXCEPTION 'Cannot change investor_id on a transaction';
  END IF;

  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_field = ANY(v_allowed_fields)) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot edit system-generated transactions';
  END IF;

  v_before := row_to_json(v_tx)::jsonb;
  v_old_fund_id := v_tx.fund_id;

  v_new_amount := COALESCE((p_updates->>'amount')::numeric, v_tx.amount);
  v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);

  UPDATE transactions_v2
  SET
    tx_date = COALESCE((p_updates->>'tx_date')::date, tx_date),
    value_date = COALESCE((p_updates->>'value_date')::date, value_date),
    notes = COALESCE(p_updates->>'notes', notes),
    tx_hash = COALESCE(p_updates->>'tx_hash', tx_hash),
    amount = v_new_amount,
    type = COALESCE((p_updates->>'type')::tx_type, type),
    fund_id = v_new_fund_id,
    reference_id = COALESCE(p_updates->>'reference_id', reference_id)
  WHERE id = p_transaction_id;

  SELECT row_to_json(t)::jsonb INTO v_after FROM transactions_v2 t WHERE t.id = p_transaction_id;

  INSERT INTO data_edit_audit (
    table_name, record_id, operation, old_data, new_data,
    edited_by, edit_source
  )
  VALUES (
    'transactions_v2',
    p_transaction_id,
    'UPDATE',
    v_before,
    v_after,
    v_actor_id,
    'update_transaction RPC: ' || p_reason
  );

  IF v_new_fund_id IS DISTINCT FROM v_old_fund_id THEN
    PERFORM public.recompute_investor_position(v_tx.investor_id, v_old_fund_id);
    PERFORM public.recompute_investor_position(v_tx.investor_id, v_new_fund_id);
  END IF;

  PERFORM public.recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  RETURN jsonb_build_object('success', true, 'transaction_id', p_transaction_id);
END;
$$;

ALTER FUNCTION "public"."update_transaction"("p_transaction_id" "uuid", "p_updates" "jsonb", "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 7. void_transactions_bulk (Category B)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: check_is_admin(p_admin_id)
--    Add: is_admin() JWT gate + canonical_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count int;
  v_tx_id uuid;
  v_single_result jsonb;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_ADMIN',
      'message', 'Admin access required for bulk void operations'
    );
  END IF;

  v_count := array_length(p_transaction_ids, 1);
  IF v_count IS NULL OR v_count < 1 OR v_count > 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_BATCH_SIZE',
      'message', 'Batch size must be between 1 and 50'
    );
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions_v2
    WHERE id = ANY(p_transaction_ids)
      AND is_voided = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ALREADY_VOIDED',
      'message', 'One or more transactions are already voided'
    );
  END IF;

  IF (SELECT count(*) FROM public.transactions_v2 WHERE id = ANY(p_transaction_ids)) <> v_count THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NOT_FOUND',
      'message', 'One or more transactions not found'
    );
  END IF;

  FOREACH v_tx_id IN ARRAY p_transaction_ids LOOP
    v_single_result := public.void_transaction(v_tx_id, p_admin_id, p_reason);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_count
  );
END;
$$;

ALTER FUNCTION "public"."void_transactions_bulk"("p_transaction_ids" "uuid"[], "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 8. unvoid_transaction (Category B)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: profiles.is_admin check on p_admin_id
--    Add: is_admin() JWT gate
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_cascade_warn text := '';
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_id AND is_admin = TRUE
  ) THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_ADMIN', 'message', 'Admin access required'
    );
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 3 THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'INVALID_REASON',
      'message', 'Reason must be at least 3 characters'
    );
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions_v2
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_FOUND',
      'message', 'Transaction not found'
    );
  END IF;

  IF NOT v_tx.is_voided THEN
    RETURN JSONB_BUILD_OBJECT(
      'success', FALSE, 'error_code', 'NOT_VOIDED',
      'message', 'Transaction is not voided'
    );
  END IF;

  v_cascade_warn := 'WARNING: Cascade-voided yield distributions, fee allocations, and IB ledger entries remain voided. Only the transaction itself is restored. You must manually re-apply yield distributions if needed.';

  UPDATE public.transactions_v2
  SET is_voided = FALSE,
      voided_at = NULL,
      voided_by = NULL,
      voided_by_profile_id = NULL,
      void_reason = NULL
  WHERE id = p_transaction_id;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    PERFORM public.recalculate_fund_aum_for_date(
      v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
    );
  END IF;

  PERFORM public.recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'cascade_warning', v_cascade_warn
  );
END;
$$;

ALTER FUNCTION "public"."unvoid_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 9. force_delete_investor (Category B)
--    Frontend caller: reconciliationService.ts
--    Has: user_roles join check on (auth.uid(), p_admin_id)
--    Add: is_admin() JWT gate as defense-in-depth
--    Note: canonical_rpc already present
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_investor_email TEXT;
  v_investor_name TEXT;
  v_affected_fund_ids UUID[];
  v_children_unlinked INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id IN (auth.uid(), p_admin_id)
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_investor_id = p_admin_id THEN RAISE EXCEPTION 'Cannot delete your own account'; END IF;

  SELECT email, COALESCE(first_name || ' ' || last_name, email)
  INTO v_investor_email, v_investor_name
  FROM profiles WHERE id = p_investor_id;

  IF v_investor_email IS NULL THEN RAISE EXCEPTION 'Investor not found'; END IF;

  SELECT ARRAY_AGG(DISTINCT fund_id) INTO v_affected_fund_ids
  FROM investor_positions WHERE investor_id = p_investor_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, meta)
  VALUES ('FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text, p_admin_id,
    jsonb_build_object('email', v_investor_email, 'name', v_investor_name),
    jsonb_build_object('affected_funds', v_affected_fund_ids));

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE fees_account_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE ib_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id;
  DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE user_id = p_investor_id;
  DELETE FROM documents WHERE user_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;

  SELECT COUNT(*) INTO v_children_unlinked FROM profiles WHERE ib_parent_id = p_investor_id;
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = p_investor_id;

  IF v_children_unlinked > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
    VALUES ('IB_CHILDREN_UNLINKED', 'profiles', p_investor_id::text, p_admin_id,
      jsonb_build_object('children_unlinked', v_children_unlinked));
  END IF;

  DELETE FROM profiles WHERE id = p_investor_id;
  RETURN true;
END;
$$;

ALTER FUNCTION "public"."force_delete_investor"("p_investor_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


-- ============================================================
-- 10. void_and_reissue_transaction (Category B)
--    Frontend caller: adminTransactionHistoryService.ts
--    Has: profiles.is_admin check on p_admin_id, canonical_rpc ✓
--    Add: is_admin() JWT gate
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text" DEFAULT NULL::"text", "p_new_tx_hash" "text" DEFAULT NULL::"text", "p_closing_aum" numeric DEFAULT NULL::numeric, "p_reason" "text" DEFAULT 'Void and reissue correction'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_position RECORD;
  v_void_result jsonb;
  v_new_tx_id uuid;
  v_balance_before numeric;
  v_balance_after numeric;
  v_computed_closing_aum numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_original_tx_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_original_tx_id;
  END IF;

  IF v_orig.is_voided THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A detailed reason (min 10 chars) is required';
  END IF;

  IF v_orig.is_system_generated THEN
    RAISE EXCEPTION 'Cannot void-and-reissue system-generated transactions (yield/fee/IB). Use void yield distribution instead.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_balance_before := COALESCE(v_position.current_value, 0) - v_orig.amount;

  v_void_result := void_transaction(p_original_tx_id, p_admin_id, 'Void-and-reissue: ' || p_reason);

  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction: %', COALESCE(v_void_result->>'error', 'Unknown error');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  v_balance_after := v_balance_before + p_new_amount;

  v_new_tx_id := gen_random_uuid();

  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, type, tx_subtype, amount, tx_date,
    notes, tx_hash, reference_id, correction_id,
    balance_before, balance_after,
    is_system_generated, created_by, created_at
  ) VALUES (
    v_new_tx_id,
    v_orig.investor_id,
    v_orig.fund_id,
    v_orig.type,
    v_orig.tx_subtype,
    p_new_amount,
    p_new_date,
    COALESCE(p_new_notes, v_orig.notes),
    COALESCE(p_new_tx_hash, v_orig.tx_hash),
    'reissue_' || p_original_tx_id::text,
    p_original_tx_id,
    v_balance_before,
    v_balance_after,
    false,
    p_admin_id,
    NOW()
  );

  IF p_closing_aum IS NOT NULL THEN
    v_computed_closing_aum := p_closing_aum;
  ELSE
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_computed_closing_aum
    FROM investor_positions
    WHERE fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO fund_aum_events (
    fund_id, event_type, amount, closing_aum,
    transaction_id, investor_id, event_date, created_by
  ) VALUES (
    v_orig.fund_id, 'reissue', p_new_amount, v_computed_closing_aum,
    v_new_tx_id, v_orig.investor_id, p_new_date, p_admin_id
  );

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE', 'transactions_v2', v_new_tx_id::text, p_admin_id,
    jsonb_build_object(
      'original_tx_id', p_original_tx_id, 'original_amount', v_orig.amount,
      'original_date', v_orig.tx_date, 'original_type', v_orig.type
    ),
    jsonb_build_object(
      'new_tx_id', v_new_tx_id, 'new_amount', p_new_amount,
      'new_date', p_new_date, 'closing_aum', v_computed_closing_aum,
      'balance_before', v_balance_before, 'balance_after', v_balance_after,
      'position_method', 'trigger_only_no_explicit_update'
    ),
    jsonb_build_object('reason', p_reason)
  );

  PERFORM public.recalculate_fund_aum_for_date(
    v_orig.fund_id, p_new_date, 'transaction'::aum_purpose, p_admin_id
  );

  PERFORM public.recompute_investor_position(v_orig.investor_id, v_orig.fund_id);

  RETURN json_build_object(
    'success', true, 'voided_tx_id', p_original_tx_id, 'new_tx_id', v_new_tx_id,
    'new_amount', p_new_amount, 'new_date', p_new_date,
    'balance_before', v_balance_before, 'balance_after', v_balance_after,
    'closing_aum', v_computed_closing_aum
  );
END;
$$;

ALTER FUNCTION "public"."void_and_reissue_transaction"("p_original_tx_id" "uuid", "p_admin_id" "uuid", "p_new_amount" numeric, "p_new_date" "date", "p_new_notes" "text", "p_new_tx_hash" "text", "p_closing_aum" numeric, "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 11. route_withdrawal_to_fees (Category B)
--    Frontend caller: withdrawalService.ts (direct supabase.rpc)
--    Has: has_super_admin_role(p_actor_id), canonical_rpc ✓
--    Add: is_admin() JWT gate (route_withdrawal_to_fees needs admin, not super_admin)
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_fees_investor_id uuid;
  v_internal_withdrawal_id uuid;
  v_internal_credit_id uuid;
  v_amount numeric(38,18);
  v_fund_id uuid;
  v_asset text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
  END IF;

  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Actor ID must be provided';
  END IF;
  IF NOT public.has_super_admin_role(p_actor_id) THEN
    RAISE EXCEPTION 'Superadmin required for route_withdrawal_to_fees';
  END IF;

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  IF v_withdrawal.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal must be approved or processing. Current: %', v_withdrawal.status;
  END IF;

  SELECT id INTO v_fees_investor_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;
  IF v_fees_investor_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found.';
  END IF;

  v_amount := COALESCE(v_withdrawal.processed_amount, v_withdrawal.approved_amount, v_withdrawal.requested_amount);
  v_fund_id := v_withdrawal.fund_id;
  SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', v_fund_id;
  END IF;

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_withdrawal.investor_id, v_fund_id,
    'INTERNAL_WITHDRAWAL'::tx_type, -1 * v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Routed to INDIGO FEES'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_withdrawal_id;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_fees_investor_id, v_fund_id,
    'INTERNAL_CREDIT'::tx_type, v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Received from withdrawal routing'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_credit_id;

  UPDATE withdrawal_requests
  SET
    status = 'completed',
    processed_at = NOW(),
    processed_amount = v_amount,
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'Routed to INDIGO FEES: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_request_id;

  PERFORM public.recompute_investor_position(v_withdrawal.investor_id, v_fund_id);
  PERFORM public.recompute_investor_position(v_fees_investor_id, v_fund_id);
  PERFORM public.recalculate_fund_aum_for_date(v_fund_id, CURRENT_DATE, 'transaction'::aum_purpose, p_actor_id);

  RETURN TRUE;
END;
$$;

ALTER FUNCTION "public"."route_withdrawal_to_fees"("p_request_id" "uuid", "p_actor_id" "uuid", "p_reason" "text") OWNER TO "postgres";


-- ============================================================
-- 12. reject_withdrawal (has JWT check via ensure_admin())
--    Frontend caller: withdrawalService.ts, requestsQueueService.ts
--    Has: ensure_admin() JWT ✓
--    Add: canonical_rpc only
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  PERFORM public.ensure_admin();

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Can only reject pending requests. Current status: %', v_request.status;
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = 'rejected',
    rejection_reason = p_reason,
    rejected_by = auth.uid(),
    rejected_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes)
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'reject',
    jsonb_build_object(
      'reason', p_reason,
      'admin_notes', p_admin_notes
    )
  );

  RETURN TRUE;
END;
$$;

ALTER FUNCTION "public"."reject_withdrawal"("p_request_id" "uuid", "p_reason" "text", "p_admin_notes" "text") OWNER TO "postgres";


-- ============================================================
-- 13. update_admin_role (Category B — CRITICAL: privilege escalation)
--    Frontend caller: profileService.ts, adminUsersService.ts (direct supabase.rpc)
--    Has: has_super_admin_role(v_caller_id) based on auth.uid()
--    Add: is_super_admin() JWT gate + canonical_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_id UUID;
  v_is_super_admin BOOLEAN;
  v_target_is_super BOOLEAN;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);

  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: super admin role required (JWT session check)';
  END IF;

  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_is_super_admin := public.has_super_admin_role(v_caller_id);

  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admins can modify admin roles';
  END IF;

  IF v_caller_id = p_target_user_id AND p_new_role != 'super_admin' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = v_caller_id AND role = 'super_admin'
    ) INTO v_target_is_super;

    IF v_target_is_super THEN
      RAISE EXCEPTION 'Cannot demote yourself from Super Admin';
    END IF;
  END IF;

  IF p_new_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or super_admin';
  END IF;

  IF p_new_role = 'super_admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = p_target_user_id AND role = 'super_admin';

    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('UPDATE_ADMIN_ROLE', 'user_roles', p_target_user_id::text, v_caller_id,
    jsonb_build_object('new_role', p_new_role));

  RETURN jsonb_build_object('success', true, 'target_user_id', p_target_user_id, 'new_role', p_new_role);
END;
$$;

ALTER FUNCTION "public"."update_admin_role"("p_target_user_id" "uuid", "p_new_role" "text") OWNER TO "postgres";