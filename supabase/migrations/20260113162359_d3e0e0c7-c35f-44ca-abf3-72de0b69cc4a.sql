-- Fix force_delete_investor: replace reference to non-existent investor_report_recipients table
-- with the actual investor_emails table

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
  DELETE FROM fee_allocations WHERE investor_id = p_investor_id;
  DELETE FROM fee_allocations WHERE fees_account_id = p_investor_id;
  
  -- IB allocations (both as IB and as source)
  DELETE FROM ib_allocations WHERE ib_investor_id = p_investor_id;
  DELETE FROM ib_allocations WHERE source_investor_id = p_investor_id;
  
  -- Transactions
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
  
  -- Withdrawals
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  
  -- Fee schedules
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  
  -- FIXED: Use investor_emails instead of non-existent investor_report_recipients
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  
  -- Email delivery
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id;
  
  -- Access logs
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  
  -- Position reconciliation logs
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