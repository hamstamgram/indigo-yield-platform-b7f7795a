-- Create RPC for admin pending counts (replaces 4 direct supabase.from() calls)
-- Consolidates: withdrawal count, active investors, period lookup, report count
-- into one gateway-friendly call

CREATE OR REPLACE FUNCTION public.get_admin_pending_counts()
RETURNS TABLE(
  withdrawal_count bigint,
  reports_needed bigint
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH
  pending_wd AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.withdrawal_requests
    WHERE status = 'pending'
  ),
  active_investors AS (
    SELECT COUNT(DISTINCT ip.investor_id)::bigint AS cnt
    FROM public.investor_positions ip
    WHERE ip.is_active = true AND ip.current_value > 0
  ),
  current_period AS (
    SELECT id FROM public.statement_periods
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
      AND month = EXTRACT(MONTH FROM CURRENT_DATE)::integer
    LIMIT 1
  ),
  reported_count AS (
    SELECT COUNT(DISTINCT ifp.investor_id)::bigint AS cnt
    FROM public.investor_fund_performance ifp
    WHERE ifp.period_id = (SELECT id FROM current_period)
  )
  SELECT
    (SELECT cnt FROM pending_wd) AS withdrawal_count,
    GREATEST(0, (SELECT cnt FROM active_investors) - (SELECT cnt FROM reported_count)) AS reports_needed;
END;
$$;

GRANT ALL ON FUNCTION public.get_admin_pending_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_admin_pending_counts() TO service_role;
