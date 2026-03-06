-- Fix get_funds_with_aum() RPC function - remove regex UUID validation that doesn't work on UUID type
-- The fund_daily_aum.fund_id column is now UUID type, not text

CREATE OR REPLACE FUNCTION public.get_funds_with_aum()
RETURNS TABLE(
  id uuid,
  code text,
  name text,
  asset text,
  fund_class text,
  inception_date date,
  status public.fund_status,
  latest_aum numeric,
  latest_aum_date date,
  investor_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH live_aum AS (
    -- Calculate live AUM from investor_positions (current balances)
    SELECT
      ip.fund_id,
      SUM(ip.current_value) as total_value,
      COUNT(DISTINCT ip.investor_id) as inv_count
    FROM public.investor_positions ip
    WHERE ip.current_value > 0
    GROUP BY ip.fund_id
  ),
  historical_aum AS (
    -- Get latest month-end AUM from fund_daily_aum as fallback
    SELECT DISTINCT ON (fda.fund_id)
      fda.fund_id AS fund_uuid,
      fda.total_aum,
      fda.as_of_date
    FROM public.fund_daily_aum fda
    WHERE fda.fund_id IS NOT NULL
      AND fda.purpose = 'reporting'
      AND fda.is_month_end = true
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
  LEFT JOIN historical_aum ha ON f.id = ha.fund_uuid
  WHERE f.status = 'active';
END;
$$;

-- Add index for better performance on fund_daily_aum lookups
CREATE INDEX IF NOT EXISTS idx_fund_daily_aum_fund_purpose_date 
ON public.fund_daily_aum (fund_id, purpose, as_of_date DESC);