-- Fix: force_delete_investor references ib_investor_id on ib_commission_ledger
-- but the actual column is named ib_id
-- Also set correct canonical RPC config key (indigo.canonical_rpc not app.canonical_rpc)

CREATE OR REPLACE FUNCTION force_delete_investor(
  p_investor_id uuid,
  p_admin_id uuid
)
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
  v_is_admin BOOLEAN;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.user_id IN (auth.uid(), p_admin_id)
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_investor_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  SELECT email, COALESCE(first_name || ' ' || last_name, email)
  INTO v_investor_email, v_investor_name
  FROM profiles WHERE id = p_investor_id;

  IF v_investor_email IS NULL THEN
    RAISE EXCEPTION 'Investor not found';
  END IF;

  SELECT ARRAY_AGG(DISTINCT fund_id)
  INTO v_affected_fund_ids
  FROM investor_positions
  WHERE investor_id = p_investor_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, meta)
  VALUES (
    'FORCE_DELETE_INVESTOR',
    'profiles',
    p_investor_id::text,
    p_admin_id,
    jsonb_build_object('email', v_investor_email, 'name', v_investor_name),
    jsonb_build_object('affected_funds', v_affected_fund_ids)
  );

  -- SET CANONICAL RPC CONTEXT to bypass protected table triggers
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Delete from all related tables (in dependency order)
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE fees_account_id = p_investor_id;

  DELETE FROM platform_fee_ledger WHERE investor_id = p_investor_id;

  -- IB allocations (both as IB and as source)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id;

  -- FIX: ib_commission_ledger uses column "ib_id", not "ib_investor_id"
  DELETE FROM ib_commission_ledger WHERE ib_id = p_investor_id;
  DELETE FROM ib_commission_ledger WHERE source_investor_id = p_investor_id;

  DELETE FROM investor_yield_events WHERE investor_id = p_investor_id;
  DELETE FROM yield_allocations WHERE investor_id = p_investor_id;
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE user_id = p_investor_id;
  DELETE FROM generated_reports WHERE investor_id = p_investor_id;
  DELETE FROM documents WHERE user_id = p_investor_id;
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  DELETE FROM position_reconciliation_log WHERE investor_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;

  SELECT COUNT(*) INTO v_children_unlinked
  FROM profiles WHERE ib_parent_id = p_investor_id;

  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = p_investor_id;

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

  DELETE FROM profiles WHERE id = p_investor_id;

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
