-- Phase 19: Scalability Remediation - High Impact

-- 1. get_platform_stats
-- Aggregates total AUM and active investor count server-side.
-- Replaces client-side summation of investor_positions.
DROP FUNCTION IF EXISTS public.get_platform_stats();
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_aum numeric;
  v_investor_count int;
  v_admin_count int;
BEGIN
  -- Check admin access
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  -- 1. Calculate Total AUM (investor accounts only)
  -- Join positions -> profiles to filter by account_type = 'investor'
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_total_aum
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  -- 2. Calculate Active Investor Count
  -- Count distinct investors with > 0 balance
  SELECT COUNT(DISTINCT ip.investor_id)
  INTO v_investor_count
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE p.account_type = 'investor'
    AND ip.current_value > 0;

  -- 3. Calculate Admin Count (active admins)
  SELECT COUNT(*)
  INTO v_admin_count
  FROM profiles
  WHERE is_admin = true;

  RETURN jsonb_build_object(
    'total_aum', v_total_aum,
    'investor_count', v_investor_count,
    'admin_count', v_admin_count
  );
END;
$$;


-- 2. get_active_funds_summary
-- improved version of getActiveFundsWithAUM that does aggregation on server
DROP FUNCTION IF EXISTS public.get_active_funds_summary();
CREATE OR REPLACE FUNCTION public.get_active_funds_summary()
RETURNS TABLE (
  fund_id uuid,
  fund_code text,
  fund_name text,
  fund_asset text,
  total_aum numeric,
  investor_count bigint,
  aum_record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin access
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  RETURN QUERY
  WITH fund_metrics AS (
    SELECT
      ip.fund_id,
      SUM(CASE WHEN p.account_type = 'investor' THEN ip.current_value ELSE 0 END) as calculated_aum,
      COUNT(DISTINCT CASE WHEN p.account_type = 'investor' THEN ip.investor_id END) as distinct_investors
    FROM investor_positions ip
    JOIN profiles p ON ip.investor_id = p.id
    WHERE ip.current_value > 0
    GROUP BY ip.fund_id
  ),
  aum_counts AS (
    SELECT fda.fund_id, COUNT(*) as record_count
    FROM fund_daily_aum fda
    WHERE fda.is_voided = false
    GROUP BY fda.fund_id
  )
  SELECT
    f.id,
    f.code,
    f.name,
    f.asset,
    COALESCE(fm.calculated_aum, 0) as total_aum,
    COALESCE(fm.distinct_investors, 0) as investor_count,
    COALESCE(ac.record_count, 0) as aum_record_count
  FROM funds f
  LEFT JOIN fund_metrics fm ON f.id = fm.fund_id
  LEFT JOIN aum_counts ac ON f.id = ac.fund_id
  WHERE f.status = 'active'
  ORDER BY total_aum DESC NULLS LAST;
END;
$$;


-- 3. get_fund_composition
-- Returns detailed investor list for a fund with MTD yield
DROP FUNCTION IF EXISTS public.get_fund_composition(uuid);
CREATE OR REPLACE FUNCTION public.get_fund_composition(p_fund_id uuid)
RETURNS TABLE (
  investor_id uuid,
  investor_name text,
  investor_email text,
  current_value numeric,
  ownership_pct numeric,
  mtd_yield numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_fund_aum numeric;
  v_mtd_start date;
  v_mtd_end date;
BEGIN
  -- Check admin access
  IF NOT public.check_is_admin((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

  -- Calculate MTD range (start of next month back to start of current month)
  -- Actually, let's match JS logic: start = 1st of next month? No, JS says getMonthStartDate(now.getFullYear(), now.getMonth() + 1)?
  -- Wait, getMonthStartDate(y, m) in JS (m is 1-based or 0-based?)
  -- JS `getMonth()` is 0-based. `getMonth() + 1` = next month?
  -- Actually, let's rely on standard SQL date truncation for "start of current month"
  v_mtd_start := date_trunc('month', current_date);
  v_mtd_end := current_date;

  -- 1. Calculate Total Fund AUM (investor only) for ownership %
  SELECT COALESCE(SUM(ip.current_value), 0)
  INTO v_total_fund_aum
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  WHERE ip.fund_id = p_fund_id
    AND p.account_type = 'investor'
    AND ip.current_value > 0;

  RETURN QUERY
  WITH investor_yields AS (
    SELECT
      t.investor_id,
      SUM(
        CASE
          WHEN t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') THEN t.amount
          WHEN t.type = 'FEE' THEN -ABS(t.amount)
          ELSE 0
        END
      ) as yield_amount
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.tx_date >= v_mtd_start
      AND t.tx_date <= v_mtd_end
      AND t.is_voided = false
      AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'FEE')
    GROUP BY t.investor_id
  )
  SELECT
    ip.investor_id,
    COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), p.email) as investor_name,
    p.email as investor_email,
    ip.current_value,
    CASE
      WHEN v_total_fund_aum > 0 THEN (ip.current_value / v_total_fund_aum) * 100
      ELSE 0
    END as ownership_pct,
    COALESCE(iy.yield_amount, 0) as mtd_yield
  FROM investor_positions ip
  JOIN profiles p ON ip.investor_id = p.id
  LEFT JOIN investor_yields iy ON ip.investor_id = iy.investor_id
  WHERE ip.fund_id = p_fund_id
    AND p.account_type = 'investor'
    AND ip.current_value > 0
  ORDER BY ip.current_value DESC;
END;
$$;
