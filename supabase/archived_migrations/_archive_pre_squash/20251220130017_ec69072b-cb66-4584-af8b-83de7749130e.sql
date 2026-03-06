-- Fix force_delete_investor to use valid tx_type enum value
CREATE OR REPLACE FUNCTION public.force_delete_investor(p_investor_id uuid, p_admin_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_fund_ids UUID[];
  v_fund_id UUID;
  v_position RECORD;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Prevent self-deletion
  IF p_investor_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Capture affected fund IDs BEFORE deletion
  SELECT ARRAY_AGG(DISTINCT fund_id) INTO v_fund_ids
  FROM investor_positions
  WHERE investor_id = p_investor_id AND current_value != 0;
  
  -- Log the deletion for audit with position details
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text, p_admin_id, 
    jsonb_build_object(
      'positions_deleted', (SELECT COUNT(*) FROM investor_positions WHERE investor_id = p_investor_id),
      'total_value_redeemed', (SELECT COALESCE(SUM(current_value), 0) FROM investor_positions WHERE investor_id = p_investor_id),
      'affected_funds', v_fund_ids
    )
  );
  
  -- Create WITHDRAWAL transactions for each position as audit trail
  FOR v_position IN 
    SELECT ip.fund_id, ip.current_value, ip.shares, f.asset
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    WHERE ip.investor_id = p_investor_id AND ip.current_value != 0
  LOOP
    INSERT INTO transactions_v2 (
      id,
      investor_id, 
      fund_id, 
      type, 
      asset,
      amount, 
      notes, 
      tx_date,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      p_investor_id, 
      v_position.fund_id, 
      'WITHDRAWAL',
      v_position.asset,
      v_position.current_value,
      'Force deletion by admin - position redeemed (shares: ' || v_position.shares || ')', 
      CURRENT_DATE,
      p_admin_id,
      NOW()
    );
  END LOOP;
  
  -- Delete all positions
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  
  -- Delete all transactions v2
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  
  -- Delete withdrawal requests
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  
  -- Delete investor invites
  DELETE FROM investor_invites WHERE investor_id = p_investor_id;
  
  -- Delete investor emails
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  
  -- Delete investment summary
  DELETE FROM investment_summary WHERE investor_id = p_investor_id;
  
  -- Delete investments
  DELETE FROM investments WHERE investor_id = p_investor_id;
  
  -- Delete fee calculations
  DELETE FROM fee_calculations WHERE investor_id = p_investor_id;
  
  -- Delete fees
  DELETE FROM fees WHERE investor_id = p_investor_id;
  
  -- Delete investor fund performance
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  
  -- Delete investor monthly reports
  DELETE FROM investor_monthly_reports WHERE investor_id = p_investor_id;
  
  -- Delete notifications
  DELETE FROM notifications WHERE user_id = p_investor_id;
  
  -- Delete documents
  DELETE FROM documents WHERE user_id = p_investor_id;
  
  -- Delete generated statements
  DELETE FROM generated_statements WHERE investor_id = p_investor_id;
  
  -- Delete generated reports
  DELETE FROM generated_reports WHERE investor_id = p_investor_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE id = p_investor_id;
  
  -- Recalculate AUM percentages for all affected funds
  IF v_fund_ids IS NOT NULL THEN
    FOREACH v_fund_id IN ARRAY v_fund_ids LOOP
      PERFORM update_investor_aum_percentages(v_fund_id::TEXT);
    END LOOP;
  END IF;
  
  RETURN true;
END;
$function$;