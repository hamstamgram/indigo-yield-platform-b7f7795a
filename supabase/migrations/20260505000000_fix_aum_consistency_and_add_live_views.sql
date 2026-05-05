-- Fix: get_active_funds_summary investor count consistency
-- The investor_count was counting ALL account types (investor + fees_account + ib).
-- Now filters to only investor-type accounts, matching get_funds_with_aum.

CREATE OR REPLACE FUNCTION "public"."get_active_funds_summary"() RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "fund_name" "text", "fund_asset" "text", "total_aum" numeric, "investor_count" bigint, "aum_record_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    f.id as fund_id,
    f.code as fund_code,
    f.name as fund_name,
    f.asset as fund_asset,
    COALESCE(
      (SELECT pah.total_aum FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id ORDER BY pah.aum_date DESC LIMIT 1),
      0
    )::numeric as total_aum,
    (SELECT count(DISTINCT inv.investor_id) FROM public.investor_positions inv 
     JOIN public.profiles p ON p.id = inv.investor_id
     WHERE inv.fund_id = f.id AND inv.current_value > 0 AND p.account_type = 'investor')::bigint as investor_count,
    (SELECT count(*) FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id)::bigint as aum_record_count
  FROM public.funds f;
END;
$$;

-- Create live views for real-time platform metrics
-- These compute in real-time from investor_positions instead of requiring MV refresh

CREATE OR REPLACE VIEW public.v_daily_platform_metrics_live AS
SELECT
  CURRENT_DATE::text as metric_date,
  (SELECT COUNT(DISTINCT ip.investor_id) FROM public.investor_positions ip 
   JOIN public.profiles p ON p.id = ip.investor_id 
   WHERE ip.current_value > 0 AND p.account_type = 'investor')::integer as active_investors,
  (SELECT COUNT(DISTINCT ip.investor_id) FROM public.investor_positions ip 
   JOIN public.profiles p ON p.id = ip.investor_id 
   WHERE ip.current_value > 0 AND p.account_type = 'ib')::integer as total_ibs,
  (SELECT COUNT(*) FROM public.funds f WHERE f.status = 'active')::integer as active_funds,
  (SELECT COALESCE(SUM(ip.current_value), 0) FROM public.investor_positions ip WHERE ip.current_value > 0) as total_platform_aum,
  (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'pending')::integer as pending_withdrawals,
  (SELECT COALESCE(SUM(requested_amount), 0) FROM public.withdrawal_requests WHERE status = 'pending') as pending_withdrawal_amount,
  (SELECT COUNT(*) FROM public.yield_distributions WHERE created_at >= CURRENT_DATE)::integer as yields_today,
  NOW()::text as refreshed_at;

CREATE OR REPLACE VIEW public.v_fund_summary_live AS
SELECT
  f.id as fund_id,
  f.code,
  f.name,
  f.asset,
  f.status::text,
  COUNT(DISTINCT CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.investor_id END)::integer as investor_count,
  COALESCE(SUM(CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) as investor_aum,
  COALESCE(SUM(CASE WHEN p.account_type = 'fees_account' AND ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) as fees_balance,
  COALESCE(SUM(CASE WHEN p.account_type = 'ib' AND ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) as ib_balance,
  COUNT(*)::integer as total_positions
FROM public.funds f
LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
LEFT JOIN public.profiles p ON p.id = ip.investor_id
GROUP BY f.id, f.code, f.name, f.asset, f.status
ORDER BY f.name;

-- Grant SELECT access to the views
GRANT SELECT ON public.v_daily_platform_metrics_live TO authenticated;
GRANT SELECT ON public.v_daily_platform_metrics_live TO service_role;
GRANT SELECT ON public.v_fund_summary_live TO authenticated;
GRANT SELECT ON public.v_fund_summary_live TO service_role;
