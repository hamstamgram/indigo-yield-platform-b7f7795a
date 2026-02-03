-- Fix cleanup_test_profiles to handle ALL FK constraints

CREATE OR REPLACE FUNCTION public.cleanup_test_profiles()
RETURNS TABLE(
  deleted_profile_id uuid,
  deleted_email text,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_email text;
  v_test_ids uuid[];
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Get all test profile IDs first
  SELECT ARRAY_AGG(p.id) INTO v_test_ids
  FROM profiles p
  WHERE (p.email LIKE 'verify-inv-%@indigo.fund' OR p.email LIKE 'test-investor-%@indigo.fund')
  AND p.id NOT IN (SELECT DISTINCT ip.investor_id FROM investor_positions ip WHERE current_value > 0);

  IF v_test_ids IS NULL OR array_length(v_test_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Delete related data in dependency order (comprehensive FK cleanup)
  DELETE FROM investor_position_snapshots WHERE investor_id = ANY(v_test_ids);
  DELETE FROM investor_positions WHERE investor_id = ANY(v_test_ids);
  DELETE FROM risk_alerts WHERE investor_id = ANY(v_test_ids);
  DELETE FROM documents WHERE user_id = ANY(v_test_ids);
  DELETE FROM access_logs WHERE user_id = ANY(v_test_ids);
  DELETE FROM transactions_v2 WHERE investor_id = ANY(v_test_ids);
  DELETE FROM ib_allocations WHERE ib_investor_id = ANY(v_test_ids) OR source_investor_id = ANY(v_test_ids);
  DELETE FROM fee_allocations WHERE investor_id = ANY(v_test_ids);
  DELETE FROM generated_reports WHERE investor_id = ANY(v_test_ids);
  DELETE FROM generated_statements WHERE investor_id = ANY(v_test_ids) OR user_id = ANY(v_test_ids);
  DELETE FROM yield_investor_allocations WHERE investor_id = ANY(v_test_ids);

  -- Delete test/verification profiles
  FOR v_profile_id, v_email IN
    SELECT p.id, p.email 
    FROM profiles p
    WHERE p.id = ANY(v_test_ids)
  LOOP
    DELETE FROM profiles WHERE id = v_profile_id;
    
    deleted_profile_id := v_profile_id;
    deleted_email := v_email;
    reason := 'Test account with no positions';
    
    RETURN NEXT;
  END LOOP;
END;
$$;