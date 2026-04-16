
CREATE OR REPLACE FUNCTION _cleanup_remaining_test_data_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_fund_ids uuid[] := ARRAY[
    '00746a0e-6054-4474-981c-0853d5d4f9b7',
    '44cb78f6-0ab8-4449-87f0-8d6a8af29c2d',
    'b0f083b2-936c-4221-aacc-6988e70c2870',
    'ec01a77f-549d-4df1-aa67-b8f415e26775',
    '14e0f00a-fb6b-4350-b2e5-ff0cb19fb214'
  ];
  v_result jsonb := '{}'::jsonb;
  v_cnt int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Clean any remaining child references
  DELETE FROM risk_alerts WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('risk_alerts', v_cnt);

  DELETE FROM withdrawal_requests WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('withdrawal_requests', v_cnt);

  DELETE FROM investor_position_snapshots WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('investor_position_snapshots', v_cnt);

  DELETE FROM investor_positions WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('investor_positions', v_cnt);

  DELETE FROM investor_fund_performance WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('investor_fund_performance', v_cnt);

  DELETE FROM documents WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('documents', v_cnt);

  DELETE FROM admin_integrity_runs WHERE scope_fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('admin_integrity_runs', v_cnt);

  DELETE FROM fund_daily_aum WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('fund_daily_aum', v_cnt);

  DELETE FROM yield_distributions WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('yield_distributions', v_cnt);

  DELETE FROM funds WHERE id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  v_result := v_result || jsonb_build_object('funds', v_cnt);

  RETURN v_result;
END;
$$;

SELECT _cleanup_remaining_test_data_v2();

DROP FUNCTION _cleanup_remaining_test_data_v2();
