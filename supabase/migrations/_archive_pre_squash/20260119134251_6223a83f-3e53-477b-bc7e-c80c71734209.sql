-- Fix get_funds_with_aum() to filter by account_type = 'investor'
-- This ensures Fund Financials cards match Platform Metrics

CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE(
  fund_id uuid, 
  fund_name text, 
  fund_code text, 
  asset text, 
  fund_class text, 
  status text, 
  total_aum numeric, 
  investor_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    f.id, 
    f.name, 
    f.code, 
    f.asset, 
    f.fund_class, 
    f.status::text, 
    COALESCE(SUM(
      CASE WHEN p.account_type = 'investor' THEN ip.current_value ELSE 0 END
    ), 0),
    COUNT(DISTINCT 
      CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.investor_id END
    )
  FROM public.funds f 
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id AND ip.current_value > 0
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id 
  ORDER BY f.name;
END;
$$;

-- Refresh stale materialized views
REFRESH MATERIALIZED VIEW mv_fund_summary;
REFRESH MATERIALIZED VIEW mv_daily_platform_metrics;