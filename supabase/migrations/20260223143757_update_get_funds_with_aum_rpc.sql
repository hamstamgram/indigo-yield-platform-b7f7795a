-- Update get_funds_with_aum to return logo_url and inception_date
-- Essential for unifying Fund Management and Command Center AUM displays

DROP FUNCTION IF EXISTS public.get_funds_with_aum();

CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
 RETURNS TABLE(
   fund_id uuid,
   fund_name text,
   fund_code text,
   asset text,
   fund_class text,
   status text,
   logo_url text,           -- NEW FIELD
   inception_date date,     -- NEW FIELD
   total_aum numeric,
   investor_count bigint
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.code,
    f.asset,
    f.fund_class,
    f.status::text,
    f.logo_url,             -- Fetched from funds
    f.inception_date,       -- Fetched from funds
    -- ALL accounts with equity contribute to total AUM (fees/IB compound)
    COALESCE(SUM(CASE WHEN ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) AS total_aum,
    -- Only count real investors, not system/IB accounts
    COUNT(DISTINCT CASE WHEN ip.current_value > 0 AND p.account_type = 'investor' THEN ip.investor_id END) AS investor_count
  FROM public.funds f
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id
  ORDER BY f.name;
END;
$function$;
