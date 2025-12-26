-- Fix deletion order for foreign key constraints
CREATE OR REPLACE FUNCTION public.reset_all_data_keep_profiles(
  p_admin_id UUID,
  p_confirmation_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- 11. Delete correction runs (references statement_periods)
  DELETE FROM correction_runs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('correction_runs', v_count);

  -- 12. Delete statement periods (now safe)
  DELETE FROM statement_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('statement_periods', v_count);

  -- 13. Delete investor fund performance
  DELETE FROM investor_fund_performance;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_count);

  -- 14. Delete fund daily AUM
  DELETE FROM fund_daily_aum;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_count);

  -- 15. Delete daily NAV
  DELETE FROM daily_nav;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('daily_nav', v_count);

  -- 16. Delete transactions
  DELETE FROM transactions_v2;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('transactions_v2', v_count);

  -- 17. Delete investor positions
  DELETE FROM investor_positions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investor_positions', v_count);

  -- 18. Clear investment summary cache
  DELETE FROM investment_summary;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('investment_summary', v_count);

  -- 19. Clear generated reports
  DELETE FROM generated_reports;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('generated_reports', v_count);

  -- 20. Clear deposits table
  DELETE FROM deposits;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('deposits', v_count);

  -- 21. Clear fund reporting month closures
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