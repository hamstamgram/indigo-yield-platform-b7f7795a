-- ==============================================================================
-- Migration: RPC get_monthly_platform_aum
-- Date: 2025-12-14
-- Description: Aggregates monthly platform AUM from fund_daily_aum
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_monthly_platform_aum()
RETURNS TABLE (
    month text,
    total_aum numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_latest_aum AS (
        SELECT
            fund_id,
            TO_CHAR(aum_date, 'YYYY-MM') AS month_key,
            total_aum,
            aum_date,
            ROW_NUMBER() OVER (PARTITION BY fund_id, TO_CHAR(aum_date, 'YYYY-MM') ORDER BY aum_date DESC) as rn
        FROM public.fund_daily_aum
    )
    SELECT
        mla.month_key AS month,
        SUM(mla.total_aum) AS total_aum
    FROM monthly_latest_aum mla
    WHERE mla.rn = 1
    GROUP BY mla.month_key
    ORDER BY mla.month_key;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_monthly_platform_aum() TO authenticated;
