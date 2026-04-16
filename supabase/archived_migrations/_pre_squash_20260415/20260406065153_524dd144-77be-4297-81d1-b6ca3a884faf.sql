
CREATE OR REPLACE FUNCTION _cleanup_test_data_step2()
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
  v_qa uuid := 'e06a15fb-0c5d-44d8-961a-8d5950715f37';
  v_counts jsonb := '{}'::jsonb;
  v_cnt int;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Disable immutable field triggers
  ALTER TABLE yield_distributions DISABLE TRIGGER protect_yield_distributions_immutable;
  ALTER TABLE transactions_v2 DISABLE TRIGGER protect_transactions_immutable;
  ALTER TABLE transactions_v2 DISABLE TRIGGER zz_trg_transactions_v2_immutability;
  ALTER TABLE fee_allocations DISABLE TRIGGER protect_fee_allocations_immutable;

  -- Nullify FK refs to QA admin in production data
  UPDATE fund_daily_aum SET created_by = NULL WHERE created_by = v_qa;
  UPDATE transactions_v2 SET voided_by = NULL, voided_by_profile_id = NULL WHERE voided_by = v_qa OR voided_by_profile_id = v_qa;
  UPDATE transactions_v2 SET approved_by = NULL WHERE approved_by = v_qa;
  UPDATE yield_distributions SET created_by = NULL WHERE created_by = v_qa;
  UPDATE yield_distributions SET voided_by = NULL WHERE voided_by = v_qa;
  UPDATE fee_allocations SET created_by = NULL WHERE created_by = v_qa;
  UPDATE fee_allocations SET voided_by = NULL, voided_by_profile_id = NULL WHERE voided_by = v_qa OR voided_by_profile_id = v_qa;
  UPDATE ib_allocations SET created_by = NULL WHERE created_by = v_qa;
  UPDATE ib_allocations SET voided_by = NULL, voided_by_profile_id = NULL, paid_by = NULL WHERE voided_by = v_qa OR voided_by_profile_id = v_qa OR paid_by = v_qa;
  UPDATE ib_commission_ledger SET created_by = NULL WHERE created_by = v_qa;
  UPDATE ib_commission_ledger SET voided_by = NULL WHERE voided_by = v_qa;
  UPDATE platform_fee_ledger SET created_by = NULL WHERE created_by = v_qa;
  UPDATE platform_fee_ledger SET voided_by = NULL WHERE voided_by = v_qa;
  UPDATE admin_integrity_runs SET created_by = NULL WHERE created_by = v_qa;
  UPDATE admin_alerts SET acknowledged_by = NULL WHERE acknowledged_by = v_qa;
  UPDATE global_fee_settings SET updated_by = NULL WHERE updated_by = v_qa;
  UPDATE system_config SET updated_by = NULL WHERE updated_by = v_qa;
  UPDATE statement_periods SET created_by = NULL, finalized_by = NULL WHERE created_by = v_qa OR finalized_by = v_qa;
  UPDATE report_schedules SET created_by = NULL WHERE created_by = v_qa;
  UPDATE statement_email_delivery SET created_by = NULL, locked_by = NULL WHERE created_by = v_qa OR locked_by = v_qa;
  UPDATE documents SET created_by = NULL, created_by_profile_id = NULL WHERE created_by = v_qa OR created_by_profile_id = v_qa;
  UPDATE support_tickets SET assigned_admin_id = NULL WHERE assigned_admin_id = v_qa;
  UPDATE platform_invites SET created_by = NULL WHERE created_by = v_qa;
  UPDATE generated_statements SET generated_by = NULL WHERE generated_by = v_qa;

  -- Re-enable immutable field triggers
  ALTER TABLE yield_distributions ENABLE TRIGGER protect_yield_distributions_immutable;
  ALTER TABLE transactions_v2 ENABLE TRIGGER protect_transactions_immutable;
  ALTER TABLE transactions_v2 ENABLE TRIGGER zz_trg_transactions_v2_immutability;
  ALTER TABLE fee_allocations ENABLE TRIGGER protect_fee_allocations_immutable;

  -- Delete child tables
  DELETE FROM investor_fee_schedule WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_fee_schedule', v_cnt);

  DELETE FROM ib_commission_schedule WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ib_commission_schedule', v_cnt);

  DELETE FROM investor_fund_performance WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_fund_performance', v_cnt);

  DELETE FROM generated_statements WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('generated_statements', v_cnt);

  DELETE FROM statement_email_delivery WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('statement_email_delivery', v_cnt);

  DELETE FROM documents WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%' OR user_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('documents', v_cnt);

  DELETE FROM investor_emails WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_emails', v_cnt);

  DELETE FROM statements WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('statements', v_cnt);

  DELETE FROM support_tickets WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%' OR user_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('support_tickets', v_cnt);

  DELETE FROM investor_device_tokens WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_device_tokens', v_cnt);

  DELETE FROM data_edit_audit WHERE edited_by::text LIKE 'a0000001-0000-0000-0000-%' OR edited_by = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('data_edit_audit', v_cnt);

  DELETE FROM admin_integrity_runs WHERE scope_investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR scope_fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('admin_integrity_runs', v_cnt);

  DELETE FROM platform_invites WHERE investor_id::text LIKE 'a0000001-0000-0000-0000-%' OR investor_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('platform_invites', v_cnt);

  -- Core tables
  DELETE FROM transactions_v2 WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('transactions_v2', v_cnt);

  DELETE FROM yield_distributions WHERE fund_id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('yield_distributions', v_cnt);

  DELETE FROM investor_positions WHERE fund_id = ANY(v_test_fund_ids) OR investor_id::text LIKE 'a0000001-0000-0000-0000-%';
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('investor_positions', v_cnt);

  DELETE FROM user_roles WHERE user_id::text LIKE 'a0000001-0000-0000-0000-%' OR user_id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('user_roles', v_cnt);

  DELETE FROM profiles WHERE id::text LIKE 'a0000001-0000-0000-0000-%' OR id = v_qa;
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('profiles', v_cnt);

  DELETE FROM funds WHERE id = ANY(v_test_fund_ids);
  GET DIAGNOSTICS v_cnt = ROW_COUNT; v_counts := v_counts || jsonb_build_object('funds', v_cnt);

  UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';
  RETURN v_counts;
END;
$$;

SELECT _cleanup_test_data_step2();
DROP FUNCTION _cleanup_test_data_step2();
