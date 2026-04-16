
-- Must drop first due to parameter default change
DROP FUNCTION IF EXISTS public.reset_platform_data(text);

CREATE OR REPLACE FUNCTION public.reset_platform_data(p_confirm text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  IF p_confirm != 'RESET' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must pass p_confirm = ''RESET'' to execute. This will delete ALL transactional data.');
  END IF;

  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  ALTER TABLE transactions_v2 DISABLE TRIGGER USER;
  ALTER TABLE investor_positions DISABLE TRIGGER USER;
  ALTER TABLE yield_distributions DISABLE TRIGGER USER;
  ALTER TABLE yield_allocations DISABLE TRIGGER USER;
  ALTER TABLE withdrawal_requests DISABLE TRIGGER USER;
  ALTER TABLE notifications DISABLE TRIGGER USER;
  ALTER TABLE audit_log DISABLE TRIGGER USER;

  SELECT COUNT(*) INTO v_count FROM yield_allocations;
  DELETE FROM yield_allocations;
  v_counts := v_counts || jsonb_build_object('yield_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM fee_allocations;
  DELETE FROM fee_allocations;
  v_counts := v_counts || jsonb_build_object('fee_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM ib_allocations;
  DELETE FROM ib_allocations;
  v_counts := v_counts || jsonb_build_object('ib_allocations', v_count);

  SELECT COUNT(*) INTO v_count FROM ib_commission_ledger;
  DELETE FROM ib_commission_ledger;
  v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_count);

  SELECT COUNT(*) INTO v_count FROM platform_fee_ledger;
  DELETE FROM platform_fee_ledger;
  v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_count);

  DELETE FROM statement_email_delivery;
  DELETE FROM generated_statements;
  DELETE FROM statements;
  DELETE FROM statement_periods;
  DELETE FROM documents;

  SELECT COUNT(*) INTO v_count FROM withdrawal_requests;
  DELETE FROM withdrawal_requests;
  v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_count);

  DELETE FROM notifications;
  DELETE FROM admin_alerts;
  DELETE FROM risk_alerts;
  DELETE FROM admin_integrity_runs;
  DELETE FROM data_edit_audit;

  DELETE FROM investor_position_snapshots;
  DELETE FROM investor_fund_performance;
  DELETE FROM investor_emails;
  DELETE FROM fund_daily_aum;

  UPDATE transactions_v2 SET distribution_id = NULL WHERE distribution_id IS NOT NULL;

  SELECT COUNT(*) INTO v_count FROM yield_distributions;
  DELETE FROM yield_distributions;
  v_counts := v_counts || jsonb_build_object('yield_distributions', v_count);

  SELECT COUNT(*) INTO v_count FROM transactions_v2;
  DELETE FROM transactions_v2;
  v_counts := v_counts || jsonb_build_object('transactions', v_count);

  SELECT COUNT(*) INTO v_count FROM investor_positions;
  DELETE FROM investor_positions;
  v_counts := v_counts || jsonb_build_object('positions', v_count);

  SELECT COUNT(*) INTO v_count FROM audit_log;
  DELETE FROM audit_log;
  v_counts := v_counts || jsonb_build_object('audit_log', v_count);

  ALTER TABLE transactions_v2 ENABLE TRIGGER USER;
  ALTER TABLE investor_positions ENABLE TRIGGER USER;
  ALTER TABLE yield_distributions ENABLE TRIGGER USER;
  ALTER TABLE yield_allocations ENABLE TRIGGER USER;
  ALTER TABLE withdrawal_requests ENABLE TRIGGER USER;
  ALTER TABLE notifications ENABLE TRIGGER USER;
  ALTER TABLE audit_log ENABLE TRIGGER USER;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'All transactional data deleted. Funds, profiles, fee schedules, and IB schedules preserved.',
    'deleted', v_counts
  );
END;
$$;
