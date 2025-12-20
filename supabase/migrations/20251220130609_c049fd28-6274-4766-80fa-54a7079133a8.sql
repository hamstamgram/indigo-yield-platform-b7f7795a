
-- Fix force_delete_investor: correct column names for all tables
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
  
  -- Log the deletion for audit
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('FORCE_DELETE_INVESTOR', 'profiles', p_investor_id::text, p_admin_id, 
    jsonb_build_object(
      'positions_deleted', (SELECT COUNT(*) FROM investor_positions WHERE investor_id = p_investor_id),
      'total_value_redeemed', (SELECT COALESCE(SUM(current_value), 0) FROM investor_positions WHERE investor_id = p_investor_id),
      'affected_funds', v_fund_ids
    )
  );
  
  -- Create WITHDRAWAL transactions for audit trail BEFORE deleting
  FOR v_position IN 
    SELECT ip.fund_id, ip.current_value, ip.shares, f.asset
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    WHERE ip.investor_id = p_investor_id AND ip.current_value != 0
  LOOP
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, amount, notes, tx_date, created_by, created_at
    ) VALUES (
      gen_random_uuid(), p_investor_id, v_position.fund_id, 'WITHDRAWAL',
      v_position.asset, v_position.current_value,
      'Force deletion by admin - position redeemed (shares: ' || v_position.shares || ')', 
      CURRENT_DATE, p_admin_id, NOW()
    );
  END LOOP;
  
  -- ============================================
  -- DELETE FROM ALL RELATED TABLES
  -- Using correct column names for each table
  -- ============================================
  
  -- Statement tables (use correct column: user_id for statement_metadata)
  DELETE FROM statement_email_delivery WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM statement_metadata WHERE user_id = p_investor_id;
  DELETE FROM statements WHERE investor_id = p_investor_id;
  DELETE FROM generated_statements WHERE investor_id = p_investor_id OR user_id = p_investor_id;
  DELETE FROM generated_reports WHERE investor_id = p_investor_id;
  DELETE FROM report_access_logs WHERE user_id = p_investor_id;
  
  -- Fee related tables
  DELETE FROM investor_fee_schedule WHERE investor_id = p_investor_id;
  DELETE FROM fee_calculations WHERE investor_id = p_investor_id;
  DELETE FROM fees WHERE investor_id = p_investor_id;
  
  -- Transaction and position tables
  DELETE FROM transactions_v2 WHERE investor_id = p_investor_id;
  DELETE FROM investor_positions WHERE investor_id = p_investor_id;
  DELETE FROM investments WHERE investor_id = p_investor_id;
  DELETE FROM investment_summary WHERE investor_id = p_investor_id;
  DELETE FROM portfolio_history WHERE user_id = p_investor_id;
  DELETE FROM deposits WHERE user_id = p_investor_id;
  DELETE FROM balance_adjustments WHERE user_id = p_investor_id;
  
  -- Withdrawal related
  DELETE FROM withdrawal_audit_logs WHERE request_id IN (
    SELECT id FROM withdrawal_requests WHERE investor_id = p_investor_id
  );
  DELETE FROM withdrawal_requests WHERE investor_id = p_investor_id;
  
  -- Performance and report tables
  DELETE FROM investor_fund_performance WHERE investor_id = p_investor_id;
  DELETE FROM investor_monthly_reports WHERE investor_id = p_investor_id;
  
  -- Invite and email tables
  DELETE FROM investor_invites WHERE investor_id = p_investor_id;
  DELETE FROM investor_emails WHERE investor_id = p_investor_id;
  
  -- Onboarding
  DELETE FROM onboarding_submissions WHERE created_investor_id = p_investor_id OR investor_id = p_investor_id;
  
  -- User settings (all use user_id)
  DELETE FROM notification_settings WHERE user_id = p_investor_id;
  DELETE FROM notifications WHERE user_id = p_investor_id;
  DELETE FROM documents WHERE user_id = p_investor_id;
  DELETE FROM user_sessions WHERE user_id = p_investor_id;
  DELETE FROM user_roles WHERE user_id = p_investor_id;
  DELETE FROM user_totp_backup_codes WHERE user_id = p_investor_id;
  DELETE FROM user_totp_settings WHERE user_id = p_investor_id;
  DELETE FROM access_logs WHERE user_id = p_investor_id;
  DELETE FROM price_alerts WHERE user_id = p_investor_id;
  DELETE FROM web_push_subscriptions WHERE user_id = p_investor_id;
  DELETE FROM secure_shares WHERE owner_user_id = p_investor_id OR created_by = p_investor_id;
  DELETE FROM support_tickets WHERE user_id = p_investor_id;
  
  -- Finally delete profile
  DELETE FROM profiles WHERE id = p_investor_id;
  
  -- Recalculate AUM percentages for affected funds
  IF v_fund_ids IS NOT NULL THEN
    FOREACH v_fund_id IN ARRAY v_fund_ids LOOP
      PERFORM update_investor_aum_percentages(v_fund_id::TEXT);
    END LOOP;
  END IF;
  
  RETURN true;
END;
$function$;
