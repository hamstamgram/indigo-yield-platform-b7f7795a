-- Migration: Add missing RPCs referenced in TypeScript contracts but absent from DB
-- Fixes: Investors page (get_all_investors_summary) + Dashboard daily flows (get_funds_daily_flows)

-- ============================================================
-- 1. get_all_investors_summary
-- Powers: Admin Investors page, useInvestorQueries, adminService
-- Returns: JSON array of investors with position summaries
-- ============================================================
DROP FUNCTION IF EXISTS public.get_all_investors_summary();
CREATE OR REPLACE FUNCTION public.get_all_investors_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
      WHERE p.is_admin = false
    ) subq
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_investors_summary() TO authenticated;

-- ============================================================
-- 2. get_funds_daily_flows
-- Powers: Admin Dashboard "Fund Financials" daily flow stats
-- Returns: JSON object keyed by fund_id { daily_inflows, daily_outflows, net_flow_24h }
-- Note: WITHDRAWAL amounts stored as negative in transactions_v2
-- ============================================================
DROP FUNCTION IF EXISTS public.get_funds_daily_flows(date);
CREATE OR REPLACE FUNCTION public.get_funds_daily_flows(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (
        SELECT jsonb_object_agg(
          fund_id::text,
          jsonb_build_object(
            'daily_inflows',  inflows,
            'daily_outflows', outflows,
            'net_flow_24h',   inflows + outflows  -- outflows already negative
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
$$;

GRANT EXECUTE ON FUNCTION public.get_funds_daily_flows(date) TO authenticated;
