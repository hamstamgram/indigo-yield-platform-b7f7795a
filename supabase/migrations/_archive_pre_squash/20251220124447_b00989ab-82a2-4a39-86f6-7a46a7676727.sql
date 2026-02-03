-- Create force_delete_investor function for safe investor deletion
CREATE OR REPLACE FUNCTION public.force_delete_investor(
  p_investor_id UUID,
  p_admin_id UUID
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Prevent self-deletion
  IF p_investor_id = p_admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Log the deletion for audit
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text, p_admin_id, 
    jsonb_build_object('positions_deleted', (
      SELECT COUNT(*) FROM investor_positions WHERE investor_id = p_investor_id
    ))
  );
  
  -- Delete all positions (regardless of value)
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
  
  RETURN true;
END;
$$;