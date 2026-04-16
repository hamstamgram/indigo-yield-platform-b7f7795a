-- =============================================================
-- Security Tier 3: Admin gates for sensitive SECDEF read functions
-- 2026-04-16 | Tier 3 audit
--
-- 11 functions: 5 cross-tenant (Category A) + 6 fund-scoped (Category B)
-- All are SECURITY DEFINER STABLE — bypass RLS, no admin gate
--
-- Internal-only functions EXCLUDED (called by gated parents):
--   get_dust_tolerance_for_fund  (called by validate_dust_tolerance)
--   get_existing_preflow_aum     (called by crystallize_yield_before_flow, ensure_preflow_aum)
--
-- Special functions EXCLUDED (intentional):
--   get_system_mode              (may be needed by non-admin UI)
--   get_user_admin_status        (auth helper)
--   get_investor_fee_pct         (single-entity, internal)
--   get_investor_ib_pct          (single-entity, internal)
--   _resolve_investor_fee_pct    (internal helper)
--   _resolve_investor_ib_pct     (internal helper)
--   calc_avg_daily_balance       (internal helper)
-- =============================================================

-- ============================================================
-- Category A: Cross-tenant reads (no scope param, all data)
-- ============================================================

-- 1. get_all_investors_summary (plpgsql)
-- CRITICAL: Returns ALL investors' AUM, earnings, principal — no filter
-- Called from both admin and investor frontend paths
CREATE OR REPLACE FUNCTION public.get_all_investors_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(jsonb_agg(investor_row ORDER BY investor_row->>'name'), '[]'::jsonb)
    FROM (
      SELECT jsonb_build_object(
        'id',              p.id,
        'name',            TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')),
        'email',           p.email,
        'status',          COALESCE(p.status, 'active'),
        'account_type',    COALESCE(p.account_type::text, 'investor'),
        'totalAUM',        COALESCE(pos.total_aum, 0),
        'totalEarned',     COALESCE(earned.total_earned, 0),
        'totalPrincipal',  COALESCE(principal.total_principal, 0),
        'positionCount',   COALESCE(pos.position_count, 0),
        'assetBreakdown',  COALESCE(pos.asset_breakdown, '{}'::jsonb),
        'onboardingDate',  p.onboarding_date,
        'createdAt',       p.created_at
      ) AS investor_row
      FROM profiles p
      LEFT JOIN (
        SELECT
          ip.investor_id,
          SUM(ip.current_value)    AS total_aum,
          COUNT(*)                 AS position_count,
          jsonb_object_agg(f.asset, ip.current_value) AS asset_breakdown
        FROM investor_positions ip
        JOIN funds f ON f.id = ip.fund_id
        WHERE ip.is_active = true
        GROUP BY ip.investor_id
      ) pos ON pos.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_earned
        FROM transactions_v2
        WHERE type = 'YIELD' AND is_voided = false
        GROUP BY investor_id
      ) earned ON earned.investor_id = p.id
      LEFT JOIN (
        SELECT investor_id, SUM(amount) AS total_principal
        FROM transactions_v2
        WHERE type = 'DEPOSIT' AND is_voided = false
        GROUP BY investor_id
      ) principal ON principal.investor_id = p.id
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = p.id AND ur.role IN ('admin', 'super_admin')
      )
    ) subq
  );
END;
$function$;

-- 2. get_all_dust_tolerances (sql -> plpgsql for gate)
-- Returns system-wide dust tolerance config
CREATE OR REPLACE FUNCTION public.get_all_dust_tolerances()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(value, '{"default": 0.01}'::jsonb)
    FROM system_config
    WHERE key = 'dust_tolerance'
  );
END;
$function$;

-- 3. get_aum_position_reconciliation (plpgsql)
-- Returns AUM vs position reconciliation across ALL funds
CREATE OR REPLACE FUNCTION public.get_aum_position_reconciliation(p_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(fund_id uuid, fund_code text, fund_name text, reconciliation_date date, recorded_aum numeric, calculated_position_sum numeric, discrepancy numeric, has_discrepancy boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  WITH aum_on_date AS (
    SELECT DISTINCT ON (fda.fund_id)
      fda.fund_id,
      fda.aum_date,
      fda.total_aum
    FROM fund_daily_aum fda
    WHERE fda.is_voided = false
      AND fda.aum_date <= p_date
    ORDER BY fda.fund_id, fda.aum_date DESC, fda.created_at DESC
  ),
  position_on_date AS (
    SELECT
      t.fund_id,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTEREST', 'INTERNAL_CREDIT', 'ADJUSTMENT')
            THEN CASE WHEN t.amount >= 0 THEN t.amount ELSE 0 END
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT')
            THEN -ABS(t.amount)
          ELSE t.amount
        END
      ) AS position_sum
    FROM transactions_v2 t
    WHERE t.is_voided = false
      AND t.tx_date <= p_date
    GROUP BY t.fund_id
  )
  SELECT
    f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    p_date AS reconciliation_date,
    COALESCE(aod.total_aum, 0)::numeric AS recorded_aum,
    COALESCE(pod.position_sum, 0)::numeric AS calculated_position_sum,
    (COALESCE(aod.total_aum, 0) - COALESCE(pod.position_sum, 0))::numeric AS discrepancy,
    ABS(COALESCE(aod.total_aum, 0) - COALESCE(pod.position_sum, 0)) > 1 AS has_discrepancy
  FROM funds f
  LEFT JOIN aum_on_date aod ON aod.fund_id = f.id
  LEFT JOIN position_on_date pod ON pod.fund_id = f.id
  ORDER BY f.code;
END;
$function$;

-- 4. get_funds_daily_flows (plpgsql)
-- Returns all funds' daily deposit/withdrawal flows
CREATE OR REPLACE FUNCTION public.get_funds_daily_flows(p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN (
    SELECT COALESCE(
      (
        SELECT jsonb_object_agg(
          fund_id::text,
          jsonb_build_object(
            'daily_inflows',  inflows,
            'daily_outflows', outflows,
            'net_flow_24h',   inflows + outflows
          )
        )
        FROM (
          SELECT
            fund_id,
            COALESCE(SUM(CASE WHEN type = 'DEPOSIT'    THEN amount ELSE 0 END), 0) AS inflows,
            COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) AS outflows
          FROM transactions_v2
          WHERE tx_date = p_date
            AND is_voided = false
            AND type IN ('DEPOSIT', 'WITHDRAWAL')
          GROUP BY fund_id
        ) flows
      ),
      '{}'::jsonb
    )
  );
END;
$function$;

-- 5. verify_aum_purpose_usage (plpgsql)
-- Returns DB-wide AUM purpose integrity issues
CREATE OR REPLACE FUNCTION public.verify_aum_purpose_usage()
 RETURNS TABLE(issue_type text, table_name text, record_id uuid, details jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  SELECT 'MISSING_AUM_RECORD'::TEXT, 'yield_distributions'::TEXT, yd.id,
    jsonb_build_object('fund_id', yd.fund_id, 'effective_date', yd.effective_date, 'purpose', yd.purpose)
  FROM yield_distributions yd
  WHERE yd.status != 'voided'
    AND NOT EXISTS (
      SELECT 1 FROM fund_daily_aum fda
      WHERE fda.fund_id = yd.fund_id
        AND fda.aum_date = yd.effective_date
        AND fda.purpose = yd.purpose
        AND fda.is_voided = false
    );
  RETURN;
END;
$function$;

-- ============================================================
-- Category B: Fund-scoped reads (return fund-level financials)
-- ============================================================

-- 6. get_fund_aum_as_of (sql -> plpgsql for gate)
-- Returns AUM snapshot for a specific fund
CREATE OR REPLACE FUNCTION public.get_fund_aum_as_of(p_fund_id uuid, p_as_of_date date, p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose)
 RETURNS TABLE(fund_id uuid, fund_code text, as_of_date date, purpose aum_purpose, aum_value numeric, aum_source text, event_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  SELECT
    f.id,
    f.code,
    p_as_of_date,
    p_purpose,
    COALESCE(ae.post_flow_aum, ae.closing_aum, 0),
    CASE
      WHEN ae.id IS NOT NULL THEN 'aum_event'
      ELSE 'no_data'
    END,
    ae.id
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT id, closing_aum, post_flow_aum
    FROM fund_aum_events
    WHERE fund_id = f.id
      AND event_date <= p_as_of_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY event_date DESC, event_ts DESC
    LIMIT 1
  ) ae ON true
  WHERE f.id = p_fund_id;
END;
$function$;

-- 7. get_fund_base_asset (sql -> plpgsql for gate)
-- Returns fund's base asset symbol
CREATE OR REPLACE FUNCTION public.get_fund_base_asset(p_fund_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();
  RETURN (SELECT asset FROM funds WHERE id = p_fund_id);
END;
$function$;

-- 8. get_fund_net_flows (plpgsql)
-- Returns fund's daily flow breakdown
CREATE OR REPLACE FUNCTION public.get_fund_net_flows(p_fund_id text, p_start_date date, p_end_date date)
 RETURNS TABLE(period_date date, inflows numeric, outflows numeric, net_flow numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.is_admin();

  RETURN QUERY
  SELECT
    t.tx_date as period_date,
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type = 'DEPOSIT' THEN t.amount
      WHEN t.type = 'WITHDRAWAL' THEN t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions_v2 t
  WHERE t.fund_id = p_fund_id::uuid
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY t.tx_date
  ORDER BY period_date;
END;
$function$;

-- 9. get_transaction_aum (plpgsql)
-- Returns AUM for a fund on a specific date
CREATE OR REPLACE FUNCTION public.get_transaction_aum(p_fund_id uuid, p_tx_date date, p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aum NUMERIC;
BEGIN
  PERFORM public.is_admin();

  SELECT total_aum INTO v_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date = p_tx_date
    AND purpose = p_purpose
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_aum IS NULL THEN
    RAISE EXCEPTION 'No AUM record found for fund % on date % with purpose %', p_fund_id, p_tx_date, p_purpose;
  END IF;

  RETURN v_aum;
END;
$function$;

-- 10. preview_crystallization (plpgsql)
-- Returns crystallization preview for an investor position
CREATE OR REPLACE FUNCTION public.preview_crystallization(p_investor_id uuid, p_fund_id uuid, p_target_date date DEFAULT CURRENT_DATE, p_new_total_aum numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position RECORD;
  v_fund RECORD;
  v_aum numeric;
  v_yield_rate numeric;
  v_days_to_crystallize int;
  v_estimated_yield numeric;
BEGIN
  PERFORM public.is_admin();

  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'Position not found'
    );
  END IF;

  SELECT * INTO v_fund
  FROM funds WHERE id = p_fund_id;

  IF p_new_total_aum IS NOT NULL THEN
    v_aum := p_new_total_aum;
  ELSE
    SELECT total_aum INTO v_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND aum_date <= p_target_date
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
  END IF;

  IF v_aum IS NULL OR v_aum = 0 THEN
    RETURN jsonb_build_object(
      'can_preview', false,
      'reason', 'No AUM data available for fund'
    );
  END IF;

  v_days_to_crystallize := GREATEST(0,
    p_target_date - COALESCE(v_position.last_yield_crystallization_date, v_position.last_transaction_date, p_target_date - 30)
  );

  v_yield_rate := COALESCE(v_fund.max_daily_yield_pct * 365 / 100, 0.10);

  v_estimated_yield := (v_yield_rate / 365.0) * v_days_to_crystallize * v_position.current_value;

  RETURN jsonb_build_object(
    'can_preview', true,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund.code,
    'current_value', v_position.current_value,
    'last_crystallization_date', v_position.last_yield_crystallization_date,
    'target_date', p_target_date,
    'days_to_crystallize', v_days_to_crystallize,
    'current_aum', v_aum,
    'position_share_of_aum', CASE
      WHEN v_aum > 0 THEN ROUND((v_position.current_value / v_aum * 100)::numeric, 4)
      ELSE 0
    END,
    'estimated_yield', ROUND(v_estimated_yield::numeric, 8),
    'yield_rate_annual', v_yield_rate,
    'note', 'This is an estimate. Actual yield is determined by fund performance (newAUM - currentAUM), not a fixed rate.'
  );
END;
$function$;

-- 11. preview_merge_duplicate_profiles (plpgsql)
-- Returns impact preview for merging two investor profiles
CREATE OR REPLACE FUNCTION public.preview_merge_duplicate_profiles(p_keep_profile_id uuid, p_merge_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_keep_profile RECORD;
  v_merge_profile RECORD;
  v_positions_count int;
  v_transactions_count int;
  v_withdrawals_count int;
  v_yield_allocations_count int;
  v_statements_count int;
  v_overlapping_funds jsonb;
BEGIN
  PERFORM public.is_admin();

  SELECT * INTO v_keep_profile FROM profiles WHERE id = p_keep_profile_id;
  SELECT * INTO v_merge_profile FROM profiles WHERE id = p_merge_profile_id;

  IF v_keep_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Keep profile not found');
  END IF;

  IF v_merge_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Merge profile not found');
  END IF;

  IF p_keep_profile_id = p_merge_profile_id THEN
    RETURN jsonb_build_object('error', 'Cannot merge profile with itself');
  END IF;

  SELECT COUNT(*) INTO v_positions_count
  FROM investor_positions WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_transactions_count
  FROM transactions_v2 WHERE investor_id = p_merge_profile_id AND is_voided = false;
  SELECT COUNT(*) INTO v_withdrawals_count
  FROM withdrawal_requests WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_yield_allocations_count
  FROM yield_allocations WHERE investor_id = p_merge_profile_id;
  SELECT COUNT(*) INTO v_statements_count
  FROM statements WHERE investor_id = p_merge_profile_id;

  SELECT jsonb_agg(jsonb_build_object(
    'fund_id', kp.fund_id,
    'keep_value', kp.current_value,
    'merge_value', mp.current_value,
    'combined_value', kp.current_value + mp.current_value
  ))
  INTO v_overlapping_funds
  FROM investor_positions kp
  JOIN investor_positions mp ON kp.fund_id = mp.fund_id
  WHERE kp.investor_id = p_keep_profile_id
    AND mp.investor_id = p_merge_profile_id;

  RETURN jsonb_build_object(
    'can_merge', true,
    'keep_profile', jsonb_build_object(
      'id', v_keep_profile.id,
      'email', v_keep_profile.email,
      'name', v_keep_profile.first_name || ' ' || v_keep_profile.last_name,
      'created_at', v_keep_profile.created_at
    ),
    'merge_profile', jsonb_build_object(
      'id', v_merge_profile.id,
      'email', v_merge_profile.email,
      'name', v_merge_profile.first_name || ' ' || v_merge_profile.last_name,
      'created_at', v_merge_profile.created_at
    ),
    'impact', jsonb_build_object(
      'positions_to_move', v_positions_count,
      'transactions_to_move', v_transactions_count,
      'withdrawals_to_move', v_withdrawals_count,
      'yield_allocations_to_move', v_yield_allocations_count,
      'statements_to_move', v_statements_count,
      'overlapping_funds', COALESCE(v_overlapping_funds, '[]'::jsonb)
    ),
    'warnings', CASE
      WHEN v_overlapping_funds IS NOT NULL THEN
        ARRAY['Both profiles have positions in the same fund(s) - values will be combined']
      ELSE ARRAY[]::text[]
    END
  );
END;
$function$;