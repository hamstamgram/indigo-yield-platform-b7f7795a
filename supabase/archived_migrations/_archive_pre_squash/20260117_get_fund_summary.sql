-- Migration: Create get_fund_summary function
-- Description: Returns summary statistics for all active funds

CREATE OR REPLACE FUNCTION public.get_fund_summary()
RETURNS TABLE (
  fund_id UUID,
  fund_code TEXT,
  fund_name TEXT,
  asset TEXT,
  status TEXT,
  total_aum NUMERIC,
  investor_count BIGINT,
  active_investor_count BIGINT,
  total_deposits NUMERIC,
  total_withdrawals NUMERIC,
  total_yield_distributed NUMERIC,
  total_fees_collected NUMERIC,
  last_yield_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    f.asset,
    f.status,
    COALESCE(SUM(ip.current_value), 0) AS total_aum,
    COUNT(DISTINCT ip.investor_id) AS investor_count,
    COUNT(DISTINCT CASE WHEN ip.current_value > 0 THEN ip.investor_id END) AS active_investor_count,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'DEPOSIT'
    ), 0) AS total_deposits,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'WITHDRAWAL'
    ), 0) AS total_withdrawals,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD'
    ), 0) AS total_yield_distributed,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'FEE_CREDIT'
    ), 0) AS total_fees_collected,
    (
      SELECT MAX(t.tx_date)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD'
    ) AS last_yield_date,
    f.created_at
  FROM funds f
  LEFT JOIN investor_positions ip ON ip.fund_id = f.id
  WHERE f.status = 'active'
  GROUP BY f.id, f.code, f.name, f.asset, f.status, f.created_at
  ORDER BY f.code;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_fund_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fund_summary() TO service_role;

COMMENT ON FUNCTION public.get_fund_summary() IS
'Returns summary statistics for all active funds including AUM, investor counts, transaction totals, and yield information.';
