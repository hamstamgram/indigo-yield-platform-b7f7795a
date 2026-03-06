-- Fix Pre-existing Data Integrity Issues
-- All tables are protected by canonical mutation triggers, so we create proper RPC functions

-- ============================================================================
-- ISSUE 1: Fund AUM Mismatch - Create RPC to reconcile AUM with positions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_fund_aum_with_positions()
RETURNS TABLE(
  fund_id uuid,
  fund_code text,
  old_aum numeric,
  new_aum numeric,
  difference numeric
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

    -- Return the reconciled record
    fund_id := v_fund_id;
    old_aum := v_old_aum;
    new_aum := v_new_aum;
    difference := v_new_aum - v_old_aum;
    
    SELECT code INTO fund_code FROM funds WHERE id = v_fund_id;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.reconcile_fund_aum_with_positions IS
'Canonical RPC to reconcile fund_daily_aum records with actual investor_positions totals.';

GRANT EXECUTE ON FUNCTION public.reconcile_fund_aum_with_positions TO authenticated;

-- ============================================================================
-- ISSUE 2 & 3: Crystallization Gaps - RPC to initialize NULL crystallization dates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.initialize_null_crystallization_dates()
RETURNS TABLE(
  investor_id uuid,
  fund_id uuid,
  new_crystallization_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
  v_last_tx_date date;
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- Update all positions with NULL crystallization dates
  FOR v_investor_id, v_fund_id, v_last_tx_date IN
    SELECT ip.investor_id, ip.fund_id, COALESCE(ip.last_transaction_date, CURRENT_DATE)
    FROM investor_positions ip
    WHERE ip.last_yield_crystallization_date IS NULL
  LOOP
    UPDATE investor_positions
    SET 
      last_yield_crystallization_date = v_last_tx_date,
      cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0),
      updated_at = NOW()
    WHERE investor_positions.investor_id = v_investor_id 
      AND investor_positions.fund_id = v_fund_id;

    investor_id := v_investor_id;
    fund_id := v_fund_id;
    new_crystallization_date := v_last_tx_date;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.initialize_null_crystallization_dates IS
'Canonical RPC to set last_yield_crystallization_date for positions that never had yield crystallized.';

GRANT EXECUTE ON FUNCTION public.initialize_null_crystallization_dates TO authenticated;

-- ============================================================================
-- ISSUE 4: Duplicate Profiles - RPC to clean up test accounts
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
BEGIN
  -- Enable canonical mutation flag
  PERFORM public.set_canonical_rpc(true);

  -- First, remove investor_positions for test accounts with zero value
  DELETE FROM investor_positions
  WHERE investor_id IN (
    SELECT id FROM profiles 
    WHERE email LIKE 'verify-inv-%@indigo.fund' 
       OR email LIKE 'test-investor-%@indigo.fund'
  )
  AND current_value = 0;

  -- Delete test/verification profiles that have no remaining positions
  FOR v_profile_id, v_email IN
    SELECT p.id, p.email 
    FROM profiles p
    WHERE (p.email LIKE 'verify-inv-%@indigo.fund' OR p.email LIKE 'test-investor-%@indigo.fund')
    AND p.id NOT IN (SELECT DISTINCT ip.investor_id FROM investor_positions ip)
  LOOP
    DELETE FROM profiles WHERE id = v_profile_id;
    
    deleted_profile_id := v_profile_id;
    deleted_email := v_email;
    reason := 'Test account with no positions';
    
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cleanup_test_profiles IS
'Canonical RPC to remove test and verification profiles with no positions.';

GRANT EXECUTE ON FUNCTION public.cleanup_test_profiles TO authenticated;