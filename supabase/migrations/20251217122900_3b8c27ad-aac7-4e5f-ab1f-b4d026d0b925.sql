-- Fix get_funds_with_aum RPC to handle TEXT vs UUID fund_id mismatch
-- The fund_daily_aum table has fund_id as TEXT while funds table has id as UUID

CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE(
    id uuid, 
    code text, 
    name text, 
    asset text, 
    fund_class text, 
    inception_date date, 
    status fund_status, 
    latest_aum numeric, 
    latest_aum_date date, 
    investor_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    WITH latest_aum AS (
        SELECT DISTINCT ON (fda.fund_id)
            fda.fund_id::uuid AS fund_uuid,
            fda.total_aum,
            fda.as_of_date
        FROM public.fund_daily_aum fda
        WHERE fda.fund_id IS NOT NULL 
          AND fda.fund_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        ORDER BY fda.fund_id, fda.as_of_date DESC
    ),
    live_aum AS (
        SELECT
            ip.fund_id,
            SUM(ip.current_value) as total_value,
            COUNT(DISTINCT ip.investor_id) as inv_count
        FROM public.investor_positions ip
        WHERE ip.current_value > 0
        GROUP BY ip.fund_id
    )
    SELECT
        f.id,
        f.code,
        f.name,
        f.asset,
        f.fund_class,
        f.inception_date,
        f.status,
        COALESCE(la.total_aum, live.total_value, 0)::numeric as latest_aum,
        la.as_of_date as latest_aum_date,
        COALESCE(live.inv_count, 0)::bigint as investor_count
    FROM public.funds f
    LEFT JOIN latest_aum la ON f.id = la.fund_uuid
    LEFT JOIN live_aum live ON f.id = live.fund_id;
END;
$function$;