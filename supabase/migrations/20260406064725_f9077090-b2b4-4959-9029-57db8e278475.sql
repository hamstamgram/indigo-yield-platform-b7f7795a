
-- Set backfill mode first
UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';

-- Create the cleanup function for later use
CREATE OR REPLACE FUNCTION _cleanup_test_data_step1()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_fund_ids uuid[] := ARRAY[
    '00746a0e-d08f-4436-9a78-8de8b384c957',
    '44cb78f6-99c6-4e68-8a54-da8bfb6a8e5c',
    'b0f083b2-7a2d-4e3c-9c1f-5d6e7f8a9b0c',
    'ec01a77f-5e6d-4c3b-8a2f-1d9e0f8c7b6a',
    '14e0f00a-3b2c-4d1e-9f0a-8c7b6d5e4f3a'
  ];
  v_qa_admin_id uuid := 'e06a15fb-0c5d-44d8-961a-8d5950715f37';
  v_counts jsonb := '{}'::jsonb;
  v_cnt int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  DELETE FROM notifications WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%' OR user_id = v_qa_admin_id;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('notifications', v_cnt);

  DELETE FROM risk_alerts WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('risk_alerts', v_cnt);

  DELETE FROM withdrawal_requests WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('withdrawal_requests', v_cnt);

  DELETE FROM investor_position_snapshots WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_position_snapshots', v_cnt);

  DELETE FROM ib_commission_ledger WHERE fund_id = ANY(v_test_fund_ids) OR source_investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR ib_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ib_commission_ledger', v_cnt);

  DELETE FROM ib_allocations WHERE fund_id = ANY(v_test_fund_ids) OR ib_investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR source_investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ib_allocations', v_cnt);

  DELETE FROM fee_allocations WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fee_allocations', v_cnt);

  DELETE FROM yield_allocations WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('yield_allocations', v_cnt);

  DELETE FROM fund_daily_aum WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fund_daily_aum', v_cnt);

  DELETE FROM platform_fee_ledger WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('platform_fee_ledger', v_cnt);

  RETURN v_counts;
END;
$$;

SELECT _cleanup_test_data_step1();
DROP FUNCTION _cleanup_test_data_step1();
