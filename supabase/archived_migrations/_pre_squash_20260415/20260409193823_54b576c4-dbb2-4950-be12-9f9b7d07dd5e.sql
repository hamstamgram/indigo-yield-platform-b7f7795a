
-- Finding 1: Drop redundant strict trigger
DROP TRIGGER IF EXISTS trg_enforce_canonical_position ON public.investor_positions;

-- Recreate the smart trigger to also cover DELETE
DROP TRIGGER IF EXISTS trg_enforce_canonical_position_write ON public.investor_positions;
CREATE TRIGGER trg_enforce_canonical_position_write
  BEFORE INSERT OR UPDATE OR DELETE ON public.investor_positions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_canonical_position_write();

-- Update function to handle DELETE
CREATE OR REPLACE FUNCTION public.enforce_canonical_position_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.canonical_rpc', true) = 'true' OR
     current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'BLOCKED_DIRECT_POSITION_DELETE',
      'investor_positions',
      COALESCE(OLD.investor_id::text, 'unknown') || '_' || COALESCE(OLD.fund_id::text, 'unknown'),
      jsonb_build_object('session_user', session_user, 'blocked_at', now())
    );
    RAISE EXCEPTION 'Direct DELETE on investor_positions is blocked. Use canonical RPCs.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.cost_basis IS NOT DISTINCT FROM NEW.cost_basis AND
       OLD.current_value IS NOT DISTINCT FROM NEW.current_value AND
       OLD.shares IS NOT DISTINCT FROM NEW.shares THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'BLOCKED_DIRECT_POSITION_WRITE',
    'investor_positions',
    COALESCE(NEW.investor_id::text, 'unknown') || '_' || COALESCE(NEW.fund_id::text, 'unknown'),
    jsonb_build_object(
      'attempted_cost_basis', NEW.cost_basis,
      'attempted_current_value', NEW.current_value,
      'attempted_shares', NEW.shares,
      'old_cost_basis', CASE WHEN TG_OP = 'UPDATE' THEN OLD.cost_basis ELSE NULL END,
      'old_current_value', CASE WHEN TG_OP = 'UPDATE' THEN OLD.current_value ELSE NULL END,
      'session_user', session_user,
      'blocked_at', now()
    )
  );

  RAISE EXCEPTION 'Direct writes to investor_positions (cost_basis, current_value, shares) are blocked. Use canonical RPCs which call recompute_investor_position.';
END;
$$;

-- Drop orphaned function
DROP FUNCTION IF EXISTS public.enforce_canonical_position_mutation();

-- Finding 4: Clean purge_fund_hard
CREATE OR REPLACE FUNCTION public.purge_fund_hard(p_fund_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fund_name text;
    v_admin uuid;
BEGIN
    v_admin := require_super_admin();
    SELECT name INTO v_fund_name FROM funds WHERE id = p_fund_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
    END IF;

    DELETE FROM yield_allocations WHERE fund_id = p_fund_id;
    DELETE FROM fee_allocations WHERE fund_id = p_fund_id;
    DELETE FROM ib_allocations WHERE fund_id = p_fund_id;
    DELETE FROM ib_commission_ledger WHERE fund_id = p_fund_id;
    DELETE FROM ib_commission_schedule WHERE fund_id = p_fund_id;
    DELETE FROM platform_fee_ledger WHERE fund_id = p_fund_id;
    DELETE FROM investor_fee_schedule WHERE fund_id = p_fund_id;
    DELETE FROM transactions_v2 WHERE fund_id = p_fund_id;
    DELETE FROM investor_positions WHERE fund_id = p_fund_id;
    DELETE FROM investor_fund_performance WHERE fund_id = p_fund_id;
    DELETE FROM investor_position_snapshots WHERE fund_id = p_fund_id;
    DELETE FROM withdrawal_requests WHERE fund_id = p_fund_id;
    DELETE FROM fund_daily_aum WHERE fund_id = p_fund_id;
    DELETE FROM yield_distributions WHERE fund_id = p_fund_id;
    DELETE FROM documents WHERE fund_id = p_fund_id;
    DELETE FROM funds WHERE id = p_fund_id;

    INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
    VALUES (v_admin, 'HARD_PURGE_FUND', 'funds', p_fund_id::text,
        jsonb_build_object('fund_name', v_fund_name, 'canonical_purge', true));

    RETURN jsonb_build_object('success', true, 'purged_fund', v_fund_name);
END;
$$;

-- Finding 4: Clean force_delete_investor
DROP FUNCTION IF EXISTS public.force_delete_investor(uuid, uuid);

CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin uuid; v_name text;
BEGIN
  v_admin := COALESCE(p_admin_id, auth.uid());
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) INTO v_name
  FROM profiles WHERE id = p_investor_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Investor not found'); END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  DELETE FROM notifications WHERE user_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM support_tickets WHERE user_id = p_investor_id;
  DELETE FROM risk_alerts WHERE investor_id = p_investor_id OR acknowledged_by = p_investor_id OR resolved_by = p_investor_id;
  DELETE FROM admin_integrity_runs WHERE scope_investor_id = p_investor_id OR created_by = p_investor_id;
  DELETE FROM admin_alerts WHERE acknowledged_by = p_investor_id;
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id OR ib_investor_id = p_investor_id OR created_by = p_investor_id OR paid_by = p_investor_id OR voided_by_profile_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id OR ib_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;
  DELETE FROM ib_commission_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id OR created_by = p_investor_id OR voided_by = p_investor_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
    UPDATE investor_yield_events SET created_by = NULL WHERE created_by = p_investor_id;
    UPDATE investor_yield_events SET voided_by = NULL WHERE voided_by = p_investor_id;
    UPDATE investor_yield_events SET made_visible_by = NULL WHERE made_visible_by = p_investor_id;
  END IF;

  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  UPDATE transactions_v2 SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE transactions_v2 SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE transactions_v2 SET voided_by_profile_id = NULL WHERE voided_by_profile_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM investor_position_snapshots WHERE investor_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  UPDATE withdrawal_requests SET approved_by = NULL WHERE approved_by = p_investor_id;
  UPDATE withdrawal_requests SET rejected_by = NULL WHERE rejected_by = p_investor_id;
  UPDATE withdrawal_requests SET cancelled_by = NULL WHERE cancelled_by = p_investor_id;
  UPDATE withdrawal_requests SET created_by = NULL WHERE created_by = p_investor_id;
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id OR generated_by = p_investor_id;
  DELETE FROM statements WHERE investor_id = p_investor_id OR investor_profile_id = p_investor_id;
  DELETE FROM documents WHERE user_profile_id = p_investor_id OR created_by_profile_id = p_investor_id;

  UPDATE fund_daily_aum SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE yield_distributions SET dust_receiver_id = NULL WHERE dust_receiver_id = p_investor_id;
  UPDATE yield_distributions SET voided_by = NULL WHERE voided_by = p_investor_id;
  UPDATE global_fee_settings SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE system_config SET updated_by = NULL WHERE updated_by = p_investor_id;
  UPDATE statement_periods SET created_by = NULL WHERE created_by = p_investor_id;
  UPDATE statement_periods SET finalized_by = NULL WHERE finalized_by = p_investor_id;

  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  DELETE FROM data_edit_audit WHERE edited_by = p_investor_id;
  DELETE FROM profiles WHERE id = p_investor_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
  VALUES (v_admin, 'FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text,
    jsonb_build_object('investor_name', v_name, 'v10_canonical_bypass', true));

  RETURN jsonb_build_object('success', true, 'deleted_investor', p_investor_id, 'name', v_name);
END;
$$;
