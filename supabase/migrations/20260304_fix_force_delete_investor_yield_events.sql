-- Fix force_delete_investor: add missing investor_yield_events deletion
-- Must delete BEFORE transactions_v2 due to FK on trigger_transaction_id
-- Also nullify investor_yield_events references where investor is voided_by/created_by/made_visible_by

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_admin uuid; v_name text;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name
  FROM profiles WHERE id = p_investor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Investor not found');
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- 1. Notifications & Comms
  DELETE FROM notifications WHERE user_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM support_tickets WHERE user_id = p_investor_id;

  -- 2. Compliance & Alerts
  DELETE FROM risk_alerts WHERE investor_id = p_investor_id OR acknowledged_by = p_investor_id OR resolved_by = p_investor_id;
  DELETE FROM admin_integrity_runs WHERE scope_investor_id = p_investor_id OR created_by = p_investor_id;
  DELETE FROM admin_alerts WHERE acknowledged_by = p_investor_id;

  -- 3. Yield & Fees
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id OR ib_investor_id = p_investor_id OR created_by = p_investor_id OR paid_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id OR ib_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;
  DELETE FROM ib_commission_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;

  -- 3b. Investor yield events (MUST come before transactions_v2 due to FK on trigger_transaction_id)
  DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
  -- Nullify references where this investor is a secondary actor
  UPDATE investor_yield_events SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE investor_yield_events SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE investor_yield_events SET made_visible_by = NULL WHERE made_visible_by = p_investor_id;

  -- 4. Transactions & Positions
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  -- Nullify secondary references to avoid FK violations when deleting profile
  UPDATE transactions_v2 SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE transactions_v2 SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE transactions_v2 SET voided_by_profile_id = NULL WHERE voided_by_profile_id = p_investor_id;

  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM investor_position_snapshots WHERE investor_id = p_investor_id;
  DELETE FROM investor_daily_balance WHERE investor_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  -- Nullify secondary withdrawal references
  UPDATE withdrawal_requests SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE withdrawal_requests SET rejected_by = NULL WHERE rejected_by = p_investor_id;
  UPDATE withdrawal_requests SET cancelled_by = NULL WHERE cancelled_by = p_investor_id;
  UPDATE withdrawal_requests SET created_by = NULL WHERE created_by = p_investor_id;

  -- 5. Documents & Statements
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id OR generated_by = p_investor_id;
  DELETE FROM statements WHERE investor_id = p_investor_id OR investor_profile_id = p_investor_id;
  DELETE FROM documents WHERE user_profile_id = p_investor_id OR created_by_profile_id = p_investor_id;

  -- 6. Infrastructure & Config
  UPDATE fund_daily_aum SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE fund_daily_aum SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE fund_daily_aum SET voided_by_profile_id = NULL WHERE voided_by_profile_id = p_investor_id;
  UPDATE yield_distributions SET dust_receiver_id = NULL WHERE dust_receiver_id = p_investor_id;
  UPDATE yield_distributions SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE global_fee_settings SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE system_config SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE statement_periods SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE statement_periods SET finalized_by = NULL WHERE finalized_by = p_investor_id;

  -- 7. Identity & Access
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  DELETE FROM data_edit_audit WHERE edited_by = p_investor_id;
  DELETE FROM profiles WHERE id = p_investor_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
  VALUES (v_admin, 'FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text,
    jsonb_build_object('investor_name', v_name, 'v11_with_yield_events', true));

  RETURN jsonb_build_object('success', true, 'deleted_investor', p_investor_id, 'name', v_name);
END;
$function$;
