-- =============================================================================
-- INDIGO PLATFORM COMPREHENSIVE AUDIT AND FIX SCRIPT
-- Date: 2026-01-12
-- Run this in Supabase Dashboard SQL Editor
-- =============================================================================

-- =============================================================================
-- SECTION 1: DIAGNOSTIC QUERIES (Run First to Understand State)
-- =============================================================================

\echo '=== 1.1 FUNCTION SECURITY AUDIT ==='
SELECT
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS parameters,
  CASE WHEN prosecdef THEN '✅' ELSE '❌' END AS sec_def,
  CASE WHEN 'search_path=public' = ANY(proconfig) THEN '✅' ELSE '❌' END AS search_path,
  CASE WHEN prosrc LIKE '%pg_advisory_xact_lock%' THEN '✅' ELSE '❌' END AS has_lock
FROM pg_proc
WHERE proname IN (
  'admin_create_transaction', 'void_transaction', 'apply_daily_yield_to_fund_v3',
  'preview_daily_yield_v3', 'create_withdrawal_request', 'approve_withdrawal',
  'complete_withdrawal', 'recompute_investor_position', 'recalculate_fund_aum_for_date',
  'upsert_fund_aum_after_yield'
) AND pronamespace = 'public'::regnamespace;

\echo ''
\echo '=== 1.2 INDIGO FEES ACCOUNT CHECK ==='
SELECT id, display_name, investor_type, account_type, is_active
FROM profiles
WHERE investor_type = 'SYSTEM_FEES'
   OR account_type = 'fees_account'
   OR display_name ILIKE '%indigo%fee%';

\echo ''
\echo '=== 1.3 POSITION vs LEDGER RECONCILIATION ==='
SELECT
  p.display_name,
  f.name AS fund_name,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_sum,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance,
  CASE
    WHEN ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) < 0.01 THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END AS status
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE ip.is_active = true
GROUP BY p.display_name, f.name, ip.current_value
ORDER BY ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) DESC;

\echo ''
\echo '=== 1.4 AUM vs POSITIONS RECONCILIATION ==='
SELECT
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum AS recorded_aum,
  fa.source,
  (SELECT COALESCE(SUM(ip.current_value), 0)
   FROM investor_positions ip
   JOIN profiles p ON p.id = ip.investor_id
   WHERE ip.fund_id = f.id
     AND ip.is_active = true
     AND COALESCE(p.account_type, '') <> 'fees_account') AS calculated_aum,
  fa.total_aum - (SELECT COALESCE(SUM(ip.current_value), 0)
   FROM investor_positions ip
   JOIN profiles p ON p.id = ip.investor_id
   WHERE ip.fund_id = f.id
     AND ip.is_active = true
     AND COALESCE(p.account_type, '') <> 'fees_account') AS variance,
  CASE
    WHEN fa.is_voided THEN '⚠️ VOIDED'
    WHEN ABS(fa.total_aum - (SELECT COALESCE(SUM(ip.current_value), 0)
       FROM investor_positions ip
       JOIN profiles p ON p.id = ip.investor_id
       WHERE ip.fund_id = f.id
         AND ip.is_active = true
         AND COALESCE(p.account_type, '') <> 'fees_account')) < 0.01 THEN '✅ OK'
    ELSE '❌ MISMATCH'
  END AS status
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE fa.aum_date = (
  SELECT MAX(aum_date) FROM fund_daily_aum sub
  WHERE sub.fund_id = f.id
)
ORDER BY f.name;

\echo ''
\echo '=== 1.5 YIELD DISTRIBUTIONS STATUS ==='
SELECT
  yd.id,
  f.name AS fund_name,
  yd.yield_date,
  yd.gross_yield_amount,
  yd.net_yield_amount,
  yd.total_fees,
  yd.status,
  yd.is_voided,
  yd.void_reason
FROM yield_distributions yd
JOIN funds f ON yd.fund_id = f.id
ORDER BY yd.created_at DESC
LIMIT 10;

\echo ''
\echo '=== 1.6 NON-VOIDED AUM RECORDS ==='
SELECT
  f.name AS fund_name,
  fa.aum_date,
  fa.total_aum,
  fa.source,
  fa.purpose
FROM fund_daily_aum fa
JOIN funds f ON fa.fund_id = f.id
WHERE NOT fa.is_voided
ORDER BY fa.aum_date DESC, f.name
LIMIT 20;

\echo ''
\echo '=== 1.7 DISABLED TRIGGERS CHECK ==='
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgenabled
    WHEN 'D' THEN '❌ DISABLED'
    WHEN 'O' THEN '✅ ENABLED (Origin)'
    WHEN 'R' THEN '✅ ENABLED (Replica)'
    WHEN 'A' THEN '✅ ENABLED (Always)'
    ELSE tgenabled::text
  END AS status
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgenabled = 'D';

-- =============================================================================
-- SECTION 2: FIXES (Run After Reviewing Diagnostics)
-- =============================================================================

\echo ''
\echo '=========================================='
\echo '=== SECTION 2: REMEDIATION FIXES ==='
\echo '=========================================='

-- -----------------------------------------------------------------------------
-- FIX 2.1: CREATE INDIGO FEES ACCOUNT IF MISSING
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 2.1 CREATE INDIGO FEES ACCOUNT (if missing) ==='

DO $$
DECLARE
  v_fees_account_id uuid;
BEGIN
  -- Check if fees account exists
  SELECT id INTO v_fees_account_id
  FROM profiles
  WHERE investor_type = 'SYSTEM_FEES'
     OR account_type = 'fees_account'
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    INSERT INTO profiles (
      id,
      display_name,
      investor_type,
      account_type,
      is_active,
      email,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'INDIGO Platform Fees',
      'SYSTEM_FEES',
      'fees_account',
      true,
      'fees@indigo.fund',
      now()
    )
    RETURNING id INTO v_fees_account_id;
    RAISE NOTICE 'Created INDIGO Fees Account: %', v_fees_account_id;
  ELSE
    RAISE NOTICE 'INDIGO Fees Account already exists: %', v_fees_account_id;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- FIX 2.2: UPSERT AUM HELPER FUNCTION
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 2.2 CREATE/UPDATE UPSERT AUM HELPER ==='

CREATE OR REPLACE FUNCTION public.upsert_fund_aum_after_yield(
  p_fund_id uuid,
  p_aum_date date,
  p_yield_amount numeric(28,10),
  p_purpose public.aum_purpose,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_old_aum numeric(28,10);
  v_new_aum numeric(28,10);
  v_result jsonb;
BEGIN
  -- Try to find existing non-voided record
  SELECT id, total_aum INTO v_existing_id, v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id
    AND aum_date = p_aum_date
    AND purpose = p_purpose
    AND is_voided = false
  FOR UPDATE;

  IF v_existing_id IS NOT NULL THEN
    -- UPDATE existing record
    v_new_aum := v_old_aum + p_yield_amount;

    UPDATE fund_daily_aum
    SET total_aum = v_new_aum,
        updated_at = now(),
        updated_by = p_actor_id,
        source = 'YIELD_DISTRIBUTION'
    WHERE id = v_existing_id;

    v_result := jsonb_build_object(
      'action', 'updated',
      'id', v_existing_id,
      'old_aum', v_old_aum,
      'new_aum', v_new_aum,
      'yield_added', p_yield_amount
    );
  ELSE
    -- Calculate AUM from positions
    SELECT COALESCE(SUM(ip.current_value), 0)
    INTO v_new_aum
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.is_active = true
      AND COALESCE(p.account_type, '') <> 'fees_account';

    -- Add the yield amount
    v_new_aum := v_new_aum + p_yield_amount;

    -- INSERT new record
    INSERT INTO fund_daily_aum (
      id, fund_id, aum_date, total_aum, purpose,
      source, created_at, created_by, is_voided
    ) VALUES (
      gen_random_uuid(), p_fund_id, p_aum_date, v_new_aum, p_purpose,
      'YIELD_DISTRIBUTION', now(), p_actor_id, false
    )
    RETURNING id INTO v_existing_id;

    v_result := jsonb_build_object(
      'action', 'inserted',
      'id', v_existing_id,
      'new_aum', v_new_aum,
      'yield_added', p_yield_amount
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION upsert_fund_aum_after_yield IS
'UPSERT helper for AUM updates during yield distribution. Uses INSERT if no record exists, UPDATE if exists.';

-- -----------------------------------------------------------------------------
-- FIX 2.3: RECALCULATE ALL ACTIVE AUM RECORDS
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 2.3 RECALCULATE AUM FOR ALL FUNDS (Current Date) ==='

DO $$
DECLARE
  v_fund RECORD;
  v_calculated_aum numeric(28,10);
  v_aum_id uuid;
BEGIN
  FOR v_fund IN SELECT id, name FROM funds WHERE status = 'active' LOOP
    -- Calculate AUM from positions (excluding fees_account)
    SELECT COALESCE(SUM(ip.current_value), 0)
    INTO v_calculated_aum
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = v_fund.id
      AND ip.is_active = true
      AND COALESCE(p.account_type, '') <> 'fees_account';

    -- Insert or update today's AUM
    INSERT INTO fund_daily_aum (
      id, fund_id, aum_date, total_aum, purpose, source,
      created_at, is_voided
    ) VALUES (
      gen_random_uuid(), v_fund.id, CURRENT_DATE, v_calculated_aum,
      'transaction', 'AUDIT_RECALCULATION', now(), false
    )
    ON CONFLICT (fund_id, aum_date, purpose)
    DO UPDATE SET
      total_aum = EXCLUDED.total_aum,
      updated_at = now(),
      source = 'AUDIT_RECALCULATION'
    WHERE NOT fund_daily_aum.is_voided
    RETURNING id INTO v_aum_id;

    RAISE NOTICE 'Fund %: AUM = %', v_fund.name, v_calculated_aum;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- FIX 2.4: SYNC POSITIONS TO LEDGER (If Any Mismatch)
-- -----------------------------------------------------------------------------
\echo ''
\echo '=== 2.4 SYNC POSITIONS TO LEDGER ==='

DO $$
DECLARE
  v_pos RECORD;
  v_ledger_sum numeric(28,10);
  v_fix_count integer := 0;
BEGIN
  FOR v_pos IN
    SELECT ip.investor_id, ip.fund_id, ip.current_value
    FROM investor_positions ip
    WHERE ip.is_active = true
  LOOP
    -- Calculate ledger sum
    SELECT COALESCE(SUM(amount), 0)
    INTO v_ledger_sum
    FROM transactions_v2
    WHERE investor_id = v_pos.investor_id
      AND fund_id = v_pos.fund_id
      AND NOT is_voided;

    -- Fix if mismatch > 0.01
    IF ABS(v_pos.current_value - v_ledger_sum) > 0.01 THEN
      UPDATE investor_positions
      SET current_value = v_ledger_sum,
          updated_at = now()
      WHERE investor_id = v_pos.investor_id
        AND fund_id = v_pos.fund_id;

      v_fix_count := v_fix_count + 1;
      RAISE NOTICE 'Fixed position: investor=%, fund=%, old=%, new=%',
        v_pos.investor_id, v_pos.fund_id, v_pos.current_value, v_ledger_sum;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total positions fixed: %', v_fix_count;
END $$;

-- =============================================================================
-- SECTION 3: POST-FIX VERIFICATION
-- =============================================================================

\echo ''
\echo '=========================================='
\echo '=== SECTION 3: POST-FIX VERIFICATION ==='
\echo '=========================================='

\echo ''
\echo '=== 3.1 VERIFY INDIGO FEES ACCOUNT ==='
SELECT id, display_name, investor_type, account_type, is_active
FROM profiles
WHERE investor_type = 'SYSTEM_FEES'
   OR account_type = 'fees_account';

\echo ''
\echo '=== 3.2 VERIFY UPSERT FUNCTION EXISTS ==='
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc
WHERE proname = 'upsert_fund_aum_after_yield'
  AND pronamespace = 'public'::regnamespace;

\echo ''
\echo '=== 3.3 VERIFY POSITION-LEDGER SYNC ==='
SELECT COUNT(*) AS mismatch_count
FROM (
  SELECT ip.investor_id, ip.fund_id, ip.current_value,
    COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS ledger_sum
  FROM investor_positions ip
  LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
  WHERE ip.is_active = true
  GROUP BY ip.investor_id, ip.fund_id, ip.current_value
  HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) > 0.01
) mismatches;

\echo ''
\echo '=== 3.4 VERIFY NON-VOIDED AUM EXISTS FOR EACH FUND ==='
SELECT
  f.name AS fund_name,
  COUNT(fa.id) FILTER (WHERE NOT fa.is_voided) AS non_voided_aum_count,
  MAX(fa.aum_date) FILTER (WHERE NOT fa.is_voided) AS latest_aum_date
FROM funds f
LEFT JOIN fund_daily_aum fa ON fa.fund_id = f.id
WHERE f.status = 'active'
GROUP BY f.name;

\echo ''
\echo '=== AUDIT COMPLETE ==='
\echo 'Review the results above. If all checks show ✅, the platform is ready.'
\echo 'If any ❌ remain, investigate and re-run the relevant fix section.'
