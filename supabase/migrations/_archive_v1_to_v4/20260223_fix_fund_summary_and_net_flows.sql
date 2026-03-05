-- Fix get_fund_net_flows: withdrawal amounts are already negative in transactions_v2,
-- so -t.amount double-negates them, overstating net_flow by 2x withdrawal amount.
-- Fix get_fund_summary: 5 subqueries missing is_voided = false filter,
-- causing fund totals to include voided transactions.

-- Fix 1: get_fund_net_flows - remove double-negation of withdrawal amounts
CREATE OR REPLACE FUNCTION public.get_fund_net_flows(
  p_fund_id text,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  period_date date,
  inflows numeric,
  outflows numeric,
  net_flow numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tx_date as period_date,
    COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as inflows,
    COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as outflows,
    COALESCE(SUM(CASE
      WHEN t.type = 'DEPOSIT' THEN t.amount
      WHEN t.type = 'WITHDRAWAL' THEN t.amount
      ELSE 0
    END), 0) as net_flow
  FROM public.transactions_v2 t
  WHERE t.fund_id = p_fund_id::uuid
    AND t.tx_date >= p_start_date
    AND t.tx_date <= p_end_date
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
  GROUP BY t.tx_date
  ORDER BY period_date;
END;
$$;

-- Fix 2: get_fund_summary - add is_voided = false to all 5 subqueries
CREATE OR REPLACE FUNCTION public.get_fund_summary()
RETURNS TABLE(
  fund_id uuid,
  fund_code text,
  fund_name text,
  asset text,
  status text,
  total_aum numeric,
  investor_count bigint,
  active_investor_count bigint,
  total_deposits numeric,
  total_withdrawals numeric,
  total_yield_distributed numeric,
  total_fees_collected numeric,
  last_yield_date date,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
      WHERE t.fund_id = f.id AND t.type = 'DEPOSIT' AND t.is_voided = false
    ), 0) AS total_deposits,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'WITHDRAWAL' AND t.is_voided = false
    ), 0) AS total_withdrawals,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD' AND t.is_voided = false
    ), 0) AS total_yield_distributed,
    COALESCE((
      SELECT SUM(t.amount)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'FEE_CREDIT' AND t.is_voided = false
    ), 0) AS total_fees_collected,
    (
      SELECT MAX(t.tx_date)
      FROM transactions_v2 t
      WHERE t.fund_id = f.id AND t.type = 'YIELD' AND t.is_voided = false
    ) AS last_yield_date,
    f.created_at
  FROM funds f
  LEFT JOIN investor_positions ip ON ip.fund_id = f.id
  WHERE f.status = 'active'
  GROUP BY f.id, f.code, f.name, f.asset, f.status, f.created_at
  ORDER BY f.code;
END;
$$;
