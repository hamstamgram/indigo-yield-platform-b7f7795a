-- Phase 3: Fix v_liquidity_risk to use live investor_positions instead of stale fund_daily_aum
-- Problem: View used fund_daily_aum snapshots which could be stale (e.g. 58 BTC vs actual 87.89)
-- Fix: SUM investor_positions.current_value for live, accurate AUM
-- Must DROP first because column types changed (active_positions: integer vs bigint)

DROP VIEW IF EXISTS v_liquidity_risk;

CREATE VIEW v_liquidity_risk AS
SELECT
  f.id AS fund_id,
  f.code AS fund_code,
  f.name AS fund_name,
  COALESCE(pos.total_aum, 0)::numeric AS total_aum,
  COALESCE(wr_agg.total_pending, 0)::numeric AS pending_withdrawals,
  COALESCE(pos.active_positions, 0)::integer AS active_positions,
  CASE
    WHEN COALESCE(pos.total_aum, 0) > 0 THEN
      ROUND((COALESCE(wr_agg.total_pending, 0) / pos.total_aum * 100)::numeric, 2)
    ELSE 0::numeric
  END AS withdrawal_ratio,
  CASE
    WHEN COALESCE(pos.total_aum, 0) = 0 THEN 'NO_AUM'
    WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.3 THEN 'HIGH'
    WHEN (COALESCE(wr_agg.total_pending, 0) / NULLIF(pos.total_aum, 0)) > 0.15 THEN 'MEDIUM'
    ELSE 'LOW'
  END AS risk_level
FROM funds f
LEFT JOIN (
  SELECT
    ip.fund_id,
    SUM(ip.current_value) AS total_aum,
    COUNT(*)::integer AS active_positions
  FROM investor_positions ip
  WHERE ip.is_active = true
  GROUP BY ip.fund_id
) pos ON pos.fund_id = f.id
LEFT JOIN (
  SELECT
    wr.fund_id,
    SUM(wr.requested_amount) FILTER (
      WHERE wr.status IN ('pending', 'approved', 'processing')
    ) AS total_pending
  FROM withdrawal_requests wr
  GROUP BY wr.fund_id
) wr_agg ON wr_agg.fund_id = f.id
WHERE f.status = 'active';
