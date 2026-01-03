
-- ============================================================
-- DEEP AUDIT FIX: Fix all broken column/table references
-- ============================================================

-- ============================================================
-- PHASE 1: Fix apply_daily_yield_to_fund_v3
-- Issues:
--   - Uses distribution_date (should be effective_date)
--   - Uses gross_yield_pct (should be gross_yield - it's amount, not percentage)
--   - Uses total_aum, total_gross_yield, total_fees, total_net_yield (wrong column names)
--   - Uses introducing_broker_id (should be ib_parent_id)
--   - Uses ib_fee_percentage (should be ib_percentage)
-- ============================================================

DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose, date, date);

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_admin_id uuid DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose,
  p_period_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_distribution_id uuid;
  v_fund_class text;
  v_fund_asset text;
  v_mgmt_fee_bps integer;
  v_perf_fee_bps integer;
  v_total_aum numeric := 0;
  v_investor_count integer := 0;
  v_total_gross_yield numeric := 0;
  v_total_net_yield numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_pos record;
  v_gross_yield numeric;
  v_fee_amount numeric;
  v_net_yield numeric;
  v_ib_investor_id uuid;
  v_ib_percentage numeric;
  v_ib_amount numeric;
  v_investor_net_after_ib numeric;
  v_tx_id uuid;
  v_actual_period_start date;
  v_actual_period_end date;
  v_fees_account_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Set period dates
  v_actual_period_start := COALESCE(p_period_start, p_yield_date);
  v_actual_period_end := COALESCE(p_period_end, p_yield_date);

  -- Get fund details
  SELECT fund_class, asset, mgmt_fee_bps, perf_fee_bps
  INTO v_fund_class, v_fund_asset, v_mgmt_fee_bps, v_perf_fee_bps
  FROM public.funds
  WHERE id = p_fund_id;

  IF v_fund_class IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Create distribution record with CORRECT column names
  INSERT INTO public.yield_distributions (
    fund_id, effective_date, gross_yield, purpose,
    created_by, status
  ) VALUES (
    p_fund_id, p_yield_date, 0, p_purpose,
    p_admin_id, 'completed'
  )
  RETURNING id INTO v_distribution_id;

  -- Process each investor position
  -- FIXED: Use ib_parent_id and ib_percentage from profiles
  FOR v_pos IN
    SELECT ip.investor_id, ip.current_value, p.ib_parent_id, p.ib_percentage
    FROM public.investor_positions ip
    JOIN public.profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_investor_count := v_investor_count + 1;
    v_total_aum := v_total_aum + v_pos.current_value;

    -- Calculate gross yield
    v_gross_yield := v_pos.current_value * (p_gross_yield_pct / 100);
    v_total_gross_yield := v_total_gross_yield + v_gross_yield;

    -- Calculate fee (using perf_fee_bps on yield)
    v_fee_amount := v_gross_yield * (COALESCE(v_perf_fee_bps, 0) / 10000.0);
    v_total_fees := v_total_fees + v_fee_amount;

    v_net_yield := v_gross_yield - v_fee_amount;
    v_total_net_yield := v_total_net_yield + v_net_yield;

    -- Create fee allocation record
    INSERT INTO public.fee_allocations (
      distribution_id, fund_id, investor_id, purpose,
      period_start, period_end, base_net_income, fee_percentage, fee_amount,
      fees_account_id, created_by
    ) VALUES (
      v_distribution_id, p_fund_id, v_pos.investor_id, p_purpose,
      v_actual_period_start, v_actual_period_end, v_gross_yield,
      COALESCE(v_perf_fee_bps, 0) / 100.0, v_fee_amount,
      v_fees_account_id, p_admin_id
    );

    -- Handle IB allocation if applicable
    -- FIXED: Use ib_parent_id and ib_percentage
    v_ib_investor_id := v_pos.ib_parent_id;
    v_ib_percentage := COALESCE(v_pos.ib_percentage, 0);
    
    IF v_ib_investor_id IS NOT NULL AND v_ib_percentage > 0 THEN
      v_ib_amount := v_net_yield * (v_ib_percentage / 100);
      v_total_ib := v_total_ib + v_ib_amount;
      v_investor_net_after_ib := v_net_yield - v_ib_amount;

      -- Create IB allocation record
      INSERT INTO public.ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        source_net_income, ib_percentage, ib_fee_amount, effective_date,
        purpose, period_start, period_end, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, v_pos.investor_id, v_ib_investor_id,
        v_net_yield, v_ib_percentage, v_ib_amount, p_yield_date,
        p_purpose, v_actual_period_start, v_actual_period_end, p_admin_id
      );

      -- Create IB credit transaction
      INSERT INTO public.transactions_v2 (
        investor_id, fund_id, fund_class, asset, tx_date, value_date,
        type, amount, notes, created_by, source, distribution_id, purpose
      ) VALUES (
        v_ib_investor_id, p_fund_id, v_fund_class, v_fund_asset, p_yield_date, p_yield_date,
        'IB_CREDIT'::tx_type, v_ib_amount,
        'IB commission from yield distribution',
        p_admin_id, 'yield_distribution'::tx_source, v_distribution_id, p_purpose
      );

      -- Update IB position
      UPDATE public.investor_positions
      SET current_value = current_value + v_ib_amount,
          cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_ib_amount,
          updated_at = NOW()
      WHERE investor_id = v_ib_investor_id AND fund_id = p_fund_id;
    ELSE
      v_investor_net_after_ib := v_net_yield;
    END IF;

    -- Create yield transaction for investor
    INSERT INTO public.transactions_v2 (
      investor_id, fund_id, fund_class, asset, tx_date, value_date,
      type, amount, balance_before, balance_after,
      notes, created_by, source, distribution_id, purpose
    ) VALUES (
      v_pos.investor_id, p_fund_id, v_fund_class, v_fund_asset, p_yield_date, p_yield_date,
      'YIELD'::tx_type, v_investor_net_after_ib, v_pos.current_value, v_pos.current_value + v_investor_net_after_ib,
      'Net yield after fees and IB',
      p_admin_id, 'yield_distribution'::tx_source, v_distribution_id, p_purpose
    )
    RETURNING id INTO v_tx_id;

    -- Update investor position
    UPDATE public.investor_positions
    SET current_value = current_value + v_investor_net_after_ib,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_investor_net_after_ib,
        last_yield_crystallization_date = p_yield_date,
        updated_at = NOW()
    WHERE investor_id = v_pos.investor_id AND fund_id = p_fund_id;
  END LOOP;

  -- Update distribution with totals using CORRECT column names
  UPDATE public.yield_distributions
  SET recorded_aum = v_total_aum,
      investor_count = v_investor_count,
      gross_yield = v_total_gross_yield,
      total_fees = v_total_fees,
      total_ib = v_total_ib,
      net_yield = v_total_net_yield
  WHERE id = v_distribution_id;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investor_count', v_investor_count,
    'total_aum', v_total_aum,
    'total_gross_yield', v_total_gross_yield,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'total_net_yield', v_total_net_yield
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_daily_yield_to_fund_v3 TO authenticated;


-- ============================================================
-- PHASE 2: Fix update_transaction
-- Issues:
--   - Uses tx_type_v2 (should be tx_type)
--   - Inserts into transaction_mutations (table doesn't exist)
-- ============================================================

DROP FUNCTION IF EXISTS public.update_transaction(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id uuid,
  p_updates jsonb,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Admin check
  IF NOT check_is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  -- Validate reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Edit reason is required';
  END IF;

  -- Get transaction and lock row
  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Cannot edit a voided transaction';
  END IF;

  -- Block editing investor_id
  IF p_updates ? 'investor_id' THEN
    RAISE EXCEPTION 'Cannot change investor_id on a transaction';
  END IF;

  -- Validate only allowed fields are being updated
  FOR v_field IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_field = ANY(v_allowed_fields)) THEN
      RAISE EXCEPTION 'Field % is not editable', v_field;
    END IF;
  END LOOP;

  -- Block editing system-generated transactions
  IF v_tx.is_system_generated = true THEN
    RAISE EXCEPTION 'Cannot edit system-generated transactions';
  END IF;

  -- Capture before state
  v_before := row_to_json(v_tx)::jsonb;
  v_old_fund_id := v_tx.fund_id;

  -- Extract new values for recomputation
  v_new_amount := COALESCE((p_updates->>'amount')::numeric, v_tx.amount);
  v_new_fund_id := COALESCE((p_updates->>'fund_id')::uuid, v_tx.fund_id);

  -- FIXED: Use tx_type instead of tx_type_v2
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

  -- Get the updated row
  SELECT row_to_json(t)::jsonb INTO v_after FROM transactions_v2 t WHERE t.id = p_transaction_id;

  -- FIXED: Write to data_edit_audit instead of transaction_mutations (which doesn't exist)
  INSERT INTO data_edit_audit (
    table_name, record_id, operation, old_data, new_data, 
    edited_by, edit_source
  )
  VALUES (
    'transactions_v2',
    p_transaction_id::text,
    'UPDATE',
    v_before,
    v_after,
    v_actor_id,
    'update_transaction RPC: ' || p_reason
  );

  -- Recompute positions for affected funds
  PERFORM recompute_investor_position(v_tx.investor_id, v_old_fund_id);
  IF v_new_fund_id IS DISTINCT FROM v_old_fund_id THEN
    PERFORM recompute_investor_position(v_tx.investor_id, v_new_fund_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'updated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_transaction TO authenticated;


-- ============================================================
-- PHASE 3: Fix force_delete_investor (UUID only version)
-- Issues:
--   - Uses user_id in transactions_v2 (should be investor_id)
--   - References non-existent tables: yield_allocations, fee_calculations,
--     fees, withdrawals, deposits, balance_adjustments, investment_summary,
--     investor_fee_schedules
-- ============================================================

DROP FUNCTION IF EXISTS public.force_delete_investor(uuid);

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_deleted_counts jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  -- Check if investor exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_investor_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Investor not found');
  END IF;

  -- Delete from fee_allocations (EXISTS)
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('fee_allocations', v_count);

  -- Delete from ib_allocations (both as IB and as source)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id OR source_investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ib_allocations', v_count);

  -- FIXED: Use investor_id not user_id
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('transactions_v2', v_count);

  -- Delete from investor_positions
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_positions', v_count);

  -- Delete from investor_fund_performance
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_fund_performance', v_count);

  -- Delete from generated_statements
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('generated_statements', v_count);

  -- Delete from generated_reports
  DELETE FROM generated_reports WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('generated_reports', v_count);

  -- Delete from documents
  DELETE FROM documents WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('documents', v_count);

  -- FIXED: Use withdrawal_requests (correct table name)
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('withdrawal_requests', v_count);

  -- FIXED: Use investor_fee_schedule (correct singular name)
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_fee_schedule', v_count);

  -- Delete from statement_email_delivery
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('statement_email_delivery', v_count);

  -- Delete from investor_report_recipients
  DELETE FROM investor_report_recipients WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_report_recipients', v_count);

  -- Delete from access_logs
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('access_logs', v_count);

  -- Update IB parent references to null
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ib_children_unlinked', v_count);

  -- Finally delete the profile
  DELETE FROM profiles WHERE id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('profiles', v_count);

  RETURN jsonb_build_object(
    'success', true,
    'deleted_counts', v_deleted_counts
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_delete_investor(uuid) TO authenticated;


-- ============================================================
-- PHASE 4: Fix force_delete_investor (UUID, UUID version)
-- Same issues as Phase 3
-- ============================================================

DROP FUNCTION IF EXISTS public.force_delete_investor(uuid, uuid);

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_investor_email TEXT;
  v_investor_name TEXT;
  v_affected_fund_ids UUID[];
  v_children_unlinked INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Prevent self-deletion
  IF p_investor_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Capture investor details for audit
  SELECT email, COALESCE(first_name || ' ' || last_name, email)
  INTO v_investor_email, v_investor_name
  FROM profiles WHERE id = p_investor_id;

  IF v_investor_email IS NULL THEN
    RAISE EXCEPTION 'Investor not found';
  END IF;

  -- Capture affected fund IDs for AUM recalculation
  SELECT ARRAY_AGG(DISTINCT fund_id)
  INTO v_affected_fund_ids
  FROM investor_positions
  WHERE investor_id = p_investor_id;

  -- Log the deletion to audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, meta)
  VALUES (
    'FORCE_DELETE_INVESTOR',
    'profiles',
    p_investor_id::text,
    p_admin_id,
    jsonb_build_object('email', v_investor_email, 'name', v_investor_name),
    jsonb_build_object('affected_funds', v_affected_fund_ids)
  );

  -- Delete from all related tables (in dependency order)
  -- REMOVED: yield_allocations (doesn't exist)
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE fees_account_id = p_investor_id;
  
  -- IB allocations (both as IB and as source)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id;
  
  -- REMOVED: fee_calculations and fees (don't exist)
  
  -- Transactions - FIXED: use investor_id
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  
  -- Positions and performance
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  
  -- Statements and reports
  DELETE FROM generated_statements WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE user_id = p_investor_id;
  DELETE FROM generated_reports WHERE investor_id = p_investor_id;
  
  -- Documents
  DELETE FROM documents WHERE user_id = p_investor_id;
  
  -- Withdrawals - FIXED: use withdrawal_requests
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  -- REMOVED: withdrawals, deposits, balance_adjustments (don't exist)
  
  -- REMOVED: investment_summary (doesn't exist)
  
  -- Fee schedules - FIXED: use investor_fee_schedule (singular)
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  -- REMOVED: investor_fee_schedules (doesn't exist)
  
  -- Report recipients and email delivery
  DELETE FROM investor_report_recipients WHERE investor_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  
  -- Access logs
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  
  -- Position reconciliation logs (may exist)
  DELETE FROM position_reconciliation_log WHERE investor_id = p_investor_id;

  -- Count and clear IB parent references for child investors
  SELECT COUNT(*) INTO v_children_unlinked
  FROM profiles WHERE ib_parent_id = p_investor_id;
  
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = p_investor_id;

  -- Log children unlinked if any
  IF v_children_unlinked > 0 THEN
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
    VALUES (
      'IB_CHILDREN_UNLINKED',
      'profiles',
      p_investor_id::text,
      p_admin_id,
      jsonb_build_object('children_unlinked', v_children_unlinked)
    );
  END IF;

  -- Finally delete the profile
  DELETE FROM profiles WHERE id = p_investor_id;

  -- Recalculate AUM percentages for affected funds
  IF v_affected_fund_ids IS NOT NULL THEN
    UPDATE investor_positions ip
    SET allocation_pct = CASE 
      WHEN fund_totals.total_aum > 0 THEN ip.current_value / fund_totals.total_aum
      ELSE 0
    END
    FROM (
      SELECT fund_id, SUM(current_value) as total_aum
      FROM investor_positions
      WHERE fund_id = ANY(v_affected_fund_ids)
      GROUP BY fund_id
    ) fund_totals
    WHERE ip.fund_id = fund_totals.fund_id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_delete_investor(uuid, uuid) TO authenticated;


-- ============================================================
-- PHASE 5: Fix reset_all_data_keep_profiles
-- Issues:
--   - References deposits (doesn't exist)
--   - References correction_runs (doesn't exist)
--   - References investment_summary (doesn't exist)
-- ============================================================

DROP FUNCTION IF EXISTS public.reset_all_data_keep_profiles(uuid, text);

CREATE OR REPLACE FUNCTION public.reset_all_data_keep_profiles(p_admin_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_result JSONB;
  v_counts JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Verify confirmation code
  IF p_confirmation_code != 'FULL RESET' THEN
    RAISE EXCEPTION 'Invalid confirmation code. Expected: FULL RESET';
  END IF;
  
  -- Verify admin status
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  -- Log the reset initiation
  INSERT INTO position_reset_log (
    id, reset_batch_id, admin_user_id, status, confirmation_code, initiated_at
  ) VALUES (
    gen_random_uuid(), v_batch_id, p_admin_id, 'in_progress', p_confirmation_code, now()
  );

  -- Delete in correct order respecting foreign keys

  -- 1. Delete withdrawal audit logs (child of withdrawal_requests)
  DELETE FROM withdrawal_audit_logs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_audit_logs', v_count);

  -- 2. Delete withdrawal requests
  DELETE FROM withdrawal_requests;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  -- 3. Delete IB allocations (references yield_distributions)
  DELETE FROM ib_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  -- 4. Delete fee allocations (references yield_distributions)
  DELETE FROM fee_allocations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  -- 5. Delete yield distributions
  DELETE FROM yield_distributions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  -- 6. Delete statement email delivery (references statements)
  DELETE FROM statement_email_delivery;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_count);

  -- 7. Delete generated statements (references statement_periods)
  DELETE FROM generated_statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_statements', v_count);

  -- 8. Delete statements
  DELETE FROM statements;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statements', v_count);

  -- 9. Delete investor period snapshots (references statement_periods)
  DELETE FROM investor_period_snapshot;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_period_snapshot', v_count);

  -- 10. Delete fund period snapshots (references statement_periods)
  DELETE FROM fund_period_snapshot;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_period_snapshot', v_count);

  -- REMOVED: correction_runs (doesn't exist)

  -- 11. Delete statement periods (now safe)
  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  -- 12. Delete investor fund performance
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  -- 13. Delete fund daily AUM
  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  -- 14. Delete daily NAV
  DELETE FROM daily_nav;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('daily_nav', v_count);

  -- 15. Delete transactions
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- 16. Delete investor positions
  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  -- REMOVED: investment_summary (doesn't exist)

  -- 17. Clear generated reports
  DELETE FROM generated_reports;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_reports', v_count);

  -- REMOVED: deposits (doesn't exist)

  -- 18. Clear fund reporting month closures
  DELETE FROM fund_reporting_month_closures;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_reporting_month_closures', v_count);

  -- Update log with completion
  UPDATE position_reset_log
  SET 
    status = 'completed',
    completed_at = now(),
    affected_counts = v_counts
  WHERE reset_batch_id = v_batch_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'deleted_counts', v_counts,
    'message', 'Full data reset completed. All transactional data cleared. Investor profiles preserved.'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_data_keep_profiles TO authenticated;


-- ============================================================
-- PHASE 6: Fix reset_all_investor_positions
-- Issues:
--   - References investment_summary (doesn't exist)
-- ============================================================

DROP FUNCTION IF EXISTS public.reset_all_investor_positions(uuid, text);

CREATE OR REPLACE FUNCTION public.reset_all_investor_positions(p_admin_id uuid, p_confirmation_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_positions_count INTEGER;
  v_performance_count INTEGER;
  v_aum_count INTEGER;
  v_transactions_count INTEGER;
  v_total_aum_before NUMERIC;
BEGIN
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
  -- REMOVED: investment_summary (doesn't exist)
  
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
      'total_aum_before', v_total_aum_before
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
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_investor_positions TO authenticated;
