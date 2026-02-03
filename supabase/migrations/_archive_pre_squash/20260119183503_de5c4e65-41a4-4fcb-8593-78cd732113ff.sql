-- Drop and recreate functions with fixed implementations

-- ============================================================================
-- Fix 1: Drop and recreate reconcile_fund_aum_with_positions
-- ============================================================================

DROP FUNCTION IF EXISTS public.reconcile_fund_aum_with_positions();

CREATE OR REPLACE FUNCTION public.reconcile_fund_aum_with_positions()
RETURNS TABLE(
  out_fund_id uuid,
  out_fund_code text,
  out_old_aum numeric,
  out_new_aum numeric,
  out_difference numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_id uuid;
  v_old_aum numeric;
  v_new_aum numeric;
  v_aum_date date;
  v_aum_id uuid;
  v_fund_code text;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Process each fund with a mismatch
  FOR v_fund_id, v_old_aum, v_new_aum, v_aum_date, v_aum_id IN
    SELECT 
      fda.fund_id,
      fda.total_aum as old_aum,
      COALESCE(pt.calculated_aum, 0) as new_aum,
      fda.aum_date,
      fda.id
    FROM (
      SELECT DISTINCT ON (fund_id)
        id, fund_id, aum_date, total_aum
      FROM fund_daily_aum
      WHERE is_voided = false
      ORDER BY fund_id, aum_date DESC
    ) fda
    LEFT JOIN (
      SELECT 
        ip.fund_id,
        COALESCE(SUM(ip.current_value), 0) as calculated_aum
      FROM investor_positions ip
      GROUP BY ip.fund_id
    ) pt ON pt.fund_id = fda.fund_id
    WHERE fda.total_aum != COALESCE(pt.calculated_aum, 0)
  LOOP
    -- Update the AUM record
    UPDATE fund_daily_aum
    SET 
      total_aum = v_new_aum,
      source = 'integrity_reconciliation',
      updated_at = NOW()
    WHERE id = v_aum_id;

    -- Get fund code
    SELECT code INTO v_fund_code FROM funds WHERE id = v_fund_id;

    -- Return the reconciled record
    out_fund_id := v_fund_id;
    out_fund_code := v_fund_code;
    out_old_aum := v_old_aum;
    out_new_aum := v_new_aum;
    out_difference := v_new_aum - v_old_aum;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reconcile_fund_aum_with_positions IS
'Canonical RPC to reconcile fund_daily_aum records with actual investor_positions totals.';

GRANT EXECUTE ON FUNCTION public.reconcile_fund_aum_with_positions TO authenticated;

-- ============================================================================
-- Fix 2: Update cleanup_test_profiles to handle FK constraints
-- ============================================================================

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

  -- Delete related data in dependency order
  DELETE FROM investor_positions WHERE investor_id = ANY(v_test_ids);
  DELETE FROM risk_alerts WHERE investor_id = ANY(v_test_ids);
  DELETE FROM documents WHERE user_id = ANY(v_test_ids);
  DELETE FROM access_logs WHERE user_id = ANY(v_test_ids);

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