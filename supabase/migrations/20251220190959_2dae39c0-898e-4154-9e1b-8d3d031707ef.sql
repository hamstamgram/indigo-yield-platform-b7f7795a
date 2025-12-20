-- =====================================================
-- BACKEND AUDIT FIXES: Purpose filtering + RBAC enforcement
-- =====================================================

-- Fix 1: Add updated_by column to fund_daily_aum
ALTER TABLE public.fund_daily_aum 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Fix 2: Update get_historical_nav() to filter by reporting purpose only
CREATE OR REPLACE FUNCTION public.get_historical_nav(target_date date DEFAULT CURRENT_DATE)
 RETURNS TABLE(fund_id uuid, fund_name text, asset_code text, aum numeric, daily_inflows numeric, daily_outflows numeric, net_flow_24h numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH
    daily_data AS (
        SELECT
            dn.fund_id,
            dn.aum,
            COALESCE(dn.total_inflows, 0) as inflows,
            COALESCE(dn.total_outflows, 0) as outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date = target_date
          AND dn.purpose = 'reporting'  -- AUDIT FIX: Filter by reporting purpose
    ),
    position_fallback AS (
        SELECT
            ip.fund_id,
            SUM(COALESCE(ip.current_value, 0)) as total_value
        FROM public.investor_positions ip
        GROUP BY ip.fund_id
    ),
    latest_nav AS (
        SELECT DISTINCT ON (dn.fund_id)
            dn.fund_id,
            dn.aum,
            dn.total_inflows,
            dn.total_outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date <= target_date
          AND dn.purpose = 'reporting'  -- AUDIT FIX: Filter by reporting purpose
        ORDER BY dn.fund_id, dn.nav_date DESC
    )
    SELECT
        f.id,
        f.name,
        f.asset,
        COALESCE(
            dd.aum,
            ln.aum,
            pf.total_value,
            0
        )::NUMERIC as aum,
        COALESCE(dd.inflows, ln.total_inflows, 0)::NUMERIC as daily_inflows,
        COALESCE(dd.outflows, ln.total_outflows, 0)::NUMERIC as daily_outflows,
        (COALESCE(dd.inflows, ln.total_inflows, 0) - COALESCE(dd.outflows, ln.total_outflows, 0))::NUMERIC as net_flow_24h
    FROM public.funds f
    LEFT JOIN daily_data dd ON f.id = dd.fund_id
    LEFT JOIN latest_nav ln ON f.id = ln.fund_id
    LEFT JOIN position_fallback pf ON f.id = pf.fund_id
    WHERE f.status = 'active'
    ORDER BY
        CASE f.asset
            WHEN 'BTC' THEN 1
            WHEN 'ETH' THEN 2
            WHEN 'SOL' THEN 3
            WHEN 'USDT' THEN 4
            WHEN 'xAUT' THEN 5
            WHEN 'XRP' THEN 6
            ELSE 99
        END;
END;
$function$;

-- Fix 3: Update get_funds_with_aum() to filter by reporting purpose only
CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
 RETURNS TABLE(id uuid, code text, name text, asset text, fund_class text, inception_date date, status fund_status, latest_aum numeric, latest_aum_date date, investor_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH live_aum AS (
        SELECT
            ip.fund_id,
            SUM(ip.current_value) as total_value,
            COUNT(DISTINCT ip.investor_id) as inv_count
        FROM public.investor_positions ip
        WHERE ip.current_value > 0
        GROUP BY ip.fund_id
    ),
    historical_aum AS (
        SELECT DISTINCT ON (fda.fund_id)
            fda.fund_id::uuid AS fund_uuid,
            fda.total_aum,
            fda.as_of_date
        FROM public.fund_daily_aum fda
        WHERE fda.fund_id IS NOT NULL 
          AND fda.fund_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          AND fda.purpose = 'reporting'      -- AUDIT FIX: Filter by reporting purpose
          AND fda.is_month_end = true        -- AUDIT FIX: Month-end only
        ORDER BY fda.fund_id, fda.as_of_date DESC
    )
    SELECT
        f.id,
        f.code,
        f.name,
        f.asset,
        f.fund_class,
        f.inception_date,
        f.status,
        COALESCE(live.total_value, ha.total_aum, 0)::numeric as latest_aum,
        ha.as_of_date as latest_aum_date,
        COALESCE(live.inv_count, 0)::bigint as investor_count
    FROM public.funds f
    LEFT JOIN live_aum live ON f.id = live.fund_id
    LEFT JOIN historical_aum ha ON f.id = ha.fund_uuid;
END;
$function$;

-- Fix 4: Update fund_period_return() to filter by reporting purpose only
CREATE OR REPLACE FUNCTION public.fund_period_return(f uuid, d1 date, d2 date, net boolean DEFAULT true)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    EXP(SUM(LN(1 + (CASE 
      WHEN net THEN COALESCE(dn.net_return_pct, 0) 
      ELSE COALESCE(dn.gross_return_pct, 0) 
    END) / 100.0))) - 1, 
    0
  )
  FROM public.daily_nav dn 
  WHERE dn.fund_id = f 
    AND dn.nav_date >= d1 
    AND dn.nav_date <= d2
    AND dn.purpose = 'reporting';  -- AUDIT FIX: Filter by reporting purpose
$function$;

-- Fix 5: Drop and recreate v_itd_returns view with purpose filter
DROP VIEW IF EXISTS public.v_itd_returns;
CREATE VIEW public.v_itd_returns AS
SELECT 
    daily_nav.fund_id,
    (exp(sum(ln(1 + COALESCE(daily_nav.net_return_pct, 0) / 100.0))) - 1) AS itd_return
FROM public.daily_nav
WHERE daily_nav.purpose = 'reporting'  -- AUDIT FIX: Filter by reporting purpose
GROUP BY daily_nav.fund_id;

-- Grant view access
GRANT SELECT ON public.v_itd_returns TO authenticated;

-- Fix 6: Update RLS policies for fund_daily_aum - Super Admin for writes
DROP POLICY IF EXISTS "Admins can manage fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Users can view fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Super Admin can manage fund_daily_aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Authenticated can view reporting aum" ON public.fund_daily_aum;
DROP POLICY IF EXISTS "Admins can view all fund_daily_aum" ON public.fund_daily_aum;

-- Admins can view all AUM (for operational needs)
CREATE POLICY "Admins can view all fund_daily_aum" ON public.fund_daily_aum
  FOR SELECT
  USING (is_admin());

-- Investors can only view reporting-purpose month-end AUM
CREATE POLICY "Investors see reporting purpose only" ON public.fund_daily_aum
  FOR SELECT
  USING (
    (NOT is_admin()) 
    AND purpose = 'reporting' 
    AND is_month_end = true
  );

-- Only Super Admins can INSERT/UPDATE/DELETE
CREATE POLICY "Super Admin can insert fund_daily_aum" ON public.fund_daily_aum
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Super Admin can update fund_daily_aum" ON public.fund_daily_aum
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super Admin can delete fund_daily_aum" ON public.fund_daily_aum
  FOR DELETE
  USING (is_super_admin());

-- Fix 7: Update RLS for yield_edit_audit - Super Admin only
DROP POLICY IF EXISTS "Admin can insert yield edits" ON public.yield_edit_audit;
DROP POLICY IF EXISTS "Super Admin can insert yield edits" ON public.yield_edit_audit;
DROP POLICY IF EXISTS "Admin can view yield edits" ON public.yield_edit_audit;

CREATE POLICY "Super Admin can insert yield edits" ON public.yield_edit_audit
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "Admin can view yield edits" ON public.yield_edit_audit
  FOR SELECT
  USING (is_admin());

-- Fix 8: Ensure daily_nav also respects purpose for investor views
DROP POLICY IF EXISTS "daily_nav_select_authenticated" ON public.daily_nav;

-- Admins see all daily_nav
CREATE POLICY "Admins can view all daily_nav" ON public.daily_nav
  FOR SELECT
  USING (is_admin());

-- Investors only see reporting-purpose entries
CREATE POLICY "Investors see reporting nav only" ON public.daily_nav
  FOR SELECT
  USING (
    (auth.uid() IS NOT NULL)
    AND (is_admin() OR purpose = 'reporting')
  );