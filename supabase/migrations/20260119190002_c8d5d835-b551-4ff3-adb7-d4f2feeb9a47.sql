
-- Final cleanup: Delete remaining test profile and empty duplicate profile
-- Includes all foreign key dependencies including risk_alerts

CREATE OR REPLACE FUNCTION public.cleanup_final_test_profiles_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_profile_id uuid := 'f072ea7a-526e-459e-afad-95301c48bca1';
  v_dup_profile_id uuid := '0f57dbf8-0638-4349-9079-ef54fcd0596f';
  v_deleted_tx integer := 0;
  v_deleted_pos integer := 0;
BEGIN
  -- Enable canonical mutation flag for this transaction
  PERFORM public.set_canonical_rpc(true);

  -- Step 1: Delete the test profile and all its related data
  -- Profile: test-investor-1768666641326@indigo.fund

  -- Delete risk_alerts first (found as FK constraint)
  DELETE FROM risk_alerts WHERE investor_id = v_test_profile_id;
  
  -- Delete transactions
  DELETE FROM transactions_v2 WHERE investor_id = v_test_profile_id;
  GET DIAGNOSTICS v_deleted_tx = ROW_COUNT;
  
  -- Delete positions
  DELETE FROM investor_positions WHERE investor_id = v_test_profile_id;
  GET DIAGNOSTICS v_deleted_pos = ROW_COUNT;

  -- Delete fee allocations
  DELETE FROM fee_allocations WHERE investor_id = v_test_profile_id;

  -- Delete IB allocations (both sides)
  DELETE FROM ib_allocations WHERE source_investor_id = v_test_profile_id;
  DELETE FROM ib_allocations WHERE ib_investor_id = v_test_profile_id;

  -- Delete documents
  DELETE FROM documents WHERE user_id = v_test_profile_id;
  
  -- Delete generated_statements
  DELETE FROM generated_statements WHERE investor_id = v_test_profile_id OR user_id = v_test_profile_id;
  
  -- Delete generated_reports
  DELETE FROM generated_reports WHERE investor_id = v_test_profile_id;
  
  -- Clear ib_parent_id references from other profiles
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = v_test_profile_id;

  -- Delete the test profile
  DELETE FROM profiles WHERE id = v_test_profile_id;

  -- Log the cleanup
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('CLEANUP_TEST_PROFILE', 'profiles', v_test_profile_id::text, NULL, 
    jsonb_build_object(
      'email', 'test-investor-1768666641326@indigo.fund', 
      'reason', 'Final integrity cleanup',
      'deleted_transactions', v_deleted_tx,
      'deleted_positions', v_deleted_pos
    ));

  -- Step 2: Delete the empty duplicate profile
  -- Profile: matthias@xventures.de (has zero positions, transactions, or allocations)
  
  -- Just in case, clean any references
  DELETE FROM risk_alerts WHERE investor_id = v_dup_profile_id;
  DELETE FROM generated_statements WHERE investor_id = v_dup_profile_id OR user_id = v_dup_profile_id;
  DELETE FROM generated_reports WHERE investor_id = v_dup_profile_id;
  UPDATE profiles SET ib_parent_id = NULL WHERE ib_parent_id = v_dup_profile_id;

  DELETE FROM profiles WHERE id = v_dup_profile_id;

  -- Log the cleanup
  INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
  VALUES ('CLEANUP_DUPLICATE_PROFILE', 'profiles', v_dup_profile_id::text, NULL, 
    jsonb_build_object('email', 'matthias@xventures.de', 'reason', 'Empty duplicate of matthias@example.com'));

  RETURN jsonb_build_object(
    'success', true,
    'deleted_profiles', 2,
    'deleted_transactions', v_deleted_tx,
    'deleted_positions', v_deleted_pos
  );
END;
$$;

-- Execute the cleanup
SELECT cleanup_final_test_profiles_v2();

-- Drop the function after execution (one-time use)
DROP FUNCTION IF EXISTS public.cleanup_final_test_profiles_v2();
