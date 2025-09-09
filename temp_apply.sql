-- Apply all KPI functions
CREATE OR REPLACE FUNCTION get_total_aum()
RETURNS TABLE(total_aum NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(p.balance * 
    CASE 
      WHEN a.symbol = 'BTC' THEN 67500
      WHEN a.symbol = 'ETH' THEN 3200
      WHEN a.symbol = 'SOL' THEN 148
      WHEN a.symbol = 'USDT' THEN 1
      WHEN a.symbol = 'EUR' THEN 1.08
      ELSE 1
    END
  ), 0) as total_aum
  FROM portfolios p
  JOIN assets a ON p.asset_id = a.id
  WHERE p.balance > 0;
END;
$$;
