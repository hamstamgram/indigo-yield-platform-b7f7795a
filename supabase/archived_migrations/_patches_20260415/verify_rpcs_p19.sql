-- Verification Script for Phase 19 RPCs (Table Output)

BEGIN;

-- Set mock JWT claim for admin user
SELECT set_config('request.jwt.claims', '{"sub": "26ebf5ff-9755-43a4-984c-ac7e093a6416", "role": "authenticated", "aud": "authenticated", "exp": 2000000000, "app_metadata": {"provider": "email"}, "user_metadata": {"is_admin": true}}', true);

CREATE TEMP TABLE verification_results (
  check_name text,
  status text,
  details text
) ON COMMIT DROP;

-- 1. Verify get_platform_stats
DO $$
DECLARE
  v_rpc_result jsonb;
  v_manual_aum numeric;
  v_manual_investor_count int;
  v_manual_admin_count int;
BEGIN
  -- Call RPC
  v_rpc_result := public.get_platform_stats();
  
  -- Manual Calculation
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_manual_aum
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  SELECT COUNT(DISTINCT ip.investor_id)
  INTO v_manual_investor_count
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  -- Assertions
  IF (v_rpc_result->>'total_aum')::numeric <> v_manual_aum THEN
    INSERT INTO verification_results VALUES ('get_platform_stats AUM', 'FAIL', format('RPC: %s, Manual: %s', v_rpc_result->>'total_aum', v_manual_aum));
  ELSE
    INSERT INTO verification_results VALUES ('get_platform_stats AUM', 'PASS', format('Matches: %s', v_manual_aum));
  END IF;

  IF (v_rpc_result->>'investor_count')::int <> v_manual_investor_count THEN
    INSERT INTO verification_results VALUES ('get_platform_stats Investor Count', 'FAIL', format('RPC: %s, Manual: %s', v_rpc_result->>'investor_count', v_manual_investor_count));
  ELSE
    INSERT INTO verification_results VALUES ('get_platform_stats Investor Count', 'PASS', format('Matches: %s', v_manual_investor_count));
  END IF;

END $$;

-- 2. Verify get_active_funds_summary (Sample check)
DO $$
DECLARE
  v_fund_record record;
  v_manual_fund_aum numeric;
BEGIN
  -- Get first fund from RPC
  SELECT * INTO v_fund_record FROM public.get_active_funds_summary() LIMIT 1;
  
  IF v_fund_record IS NOT NULL THEN
    -- Manual check for this fund
    SELECT COALESCE(SUM(current_value), 0)
    INTO v_manual_fund_aum
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.fund_id = v_fund_record.fund_id
      AND p.account_type = 'investor'
      AND ip.current_value > 0;
      
    IF v_fund_record.total_aum <> v_manual_fund_aum THEN
      INSERT INTO verification_results VALUES ('get_active_funds_summary AUM', 'FAIL', format('Fund: %s, RPC: %s, Manual: %s', v_fund_record.fund_name, v_fund_record.total_aum, v_manual_fund_aum));
    ELSE
      INSERT INTO verification_results VALUES ('get_active_funds_summary AUM', 'PASS', format('Fund: %s, Matches: %s', v_fund_record.fund_name, v_manual_fund_aum));
    END IF;
  ELSE
    INSERT INTO verification_results VALUES ('get_active_funds_summary', 'WARN', 'No active funds found to verify.');
  END IF;
END $$;

SELECT * FROM verification_results;

ROLLBACK;
