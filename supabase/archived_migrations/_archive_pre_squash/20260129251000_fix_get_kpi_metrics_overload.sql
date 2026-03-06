-- Add overloaded get_kpi_metrics(metric_type, user_id) and keep p_date_range signature intact.

CREATE OR REPLACE FUNCTION public.get_kpi_metrics(metric_type text, user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_date date;
  result json;
BEGIN
  -- Determine target date based on metric_type
  CASE metric_type
    WHEN 'daily' THEN target_date := CURRENT_DATE;
    WHEN 'weekly' THEN target_date := (CURRENT_DATE - interval '7 days')::date;
    WHEN 'monthly' THEN target_date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
    WHEN 'quarterly' THEN target_date := (date_trunc('quarter', CURRENT_DATE) + interval '3 months - 1 day')::date;
    WHEN 'yearly' THEN target_date := (date_trunc('year', CURRENT_DATE) + interval '1 year - 1 day')::date;
    ELSE target_date := CURRENT_DATE;
  END CASE;

  -- Build KPI JSON (mirror structure of p_date_range overload)
  SELECT json_build_object(
    'dateRange', metric_type,
    'targetDate', target_date,
    'fundBreakdown', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'fundId', fund_id,
          'aum', aum,
          'navPerShare', nav_per_share
        )
      ), '[]'::json)
      FROM daily_nav
      WHERE nav_date = target_date
    ),
    'totalPositions', (
      SELECT COALESCE(SUM(current_value), 0)
      FROM investor_positions ip
      JOIN funds f ON ip.fund_id = f.id
      WHERE f.status = 'active'
    )
  ) INTO result;

  -- Log the access
  INSERT INTO audit_logs (action, entity, entity_id, actor_id, metadata)
  VALUES ('KPI_ACCESS', 'metrics', target_date::text, auth.uid(),
    json_build_object('metric_type', metric_type, 'user_id', user_id));

  RETURN result;
END;
$function$;
