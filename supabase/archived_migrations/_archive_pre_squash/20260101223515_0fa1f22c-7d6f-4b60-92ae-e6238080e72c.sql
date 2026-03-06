-- Fix force_delete_investor function by removing references to non-existent tables
-- Removes: investments, portfolio_history (these tables don't exist)
-- Keeps: investment_summary (this table exists)

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Delete from yield_allocations
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('yield_allocations', v_count);

  -- Delete from fee_allocations
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('fee_allocations', v_count);

  -- Delete from ib_allocations (both as IB and as source)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id OR source_investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ib_allocations', v_count);

  -- Delete from fee_calculations
  DELETE FROM fee_calculations WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('fee_calculations', v_count);

  -- Delete from fees
  DELETE FROM fees WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('fees', v_count);

  -- Delete from transactions_v2
  DELETE FROM transactions_v2 WHERE user_id = p_investor_id;
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

  -- Delete from withdrawals
  DELETE FROM withdrawals WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('withdrawals', v_count);

  -- Delete from deposits
  DELETE FROM deposits WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('deposits', v_count);

  -- Delete from balance_adjustments
  DELETE FROM balance_adjustments WHERE user_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('balance_adjustments', v_count);

  -- Delete from investment_summary
  DELETE FROM investment_summary WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investment_summary', v_count);

  -- Delete from investor_fee_schedules
  DELETE FROM investor_fee_schedules WHERE investor_id = p_investor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('investor_fee_schedules', v_count);

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