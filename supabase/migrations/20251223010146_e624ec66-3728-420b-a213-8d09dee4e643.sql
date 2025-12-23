-- Fix the SECURITY DEFINER view issue by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS monthly_fee_summary;

CREATE VIEW monthly_fee_summary 
WITH (security_invoker = true)
AS
WITH monthly_fees AS (
  SELECT 
    to_char(tx_date, 'YYYY-MM') AS summary_month,
    asset AS asset_code,
    SUM(ABS(amount)) AS total_fees_collected,
    COUNT(DISTINCT investor_id) AS investor_count
  FROM transactions_v2
  WHERE type = 'FEE'
  GROUP BY to_char(tx_date, 'YYYY-MM'), asset
),
monthly_yields AS (
  SELECT 
    to_char(tx_date, 'YYYY-MM') AS summary_month,
    asset AS asset_code,
    SUM(amount) AS total_gross_yield
  FROM transactions_v2
  WHERE type = 'INTEREST'
  GROUP BY to_char(tx_date, 'YYYY-MM'), asset
)
SELECT 
  COALESCE(y.summary_month, f.summary_month) AS summary_month,
  COALESCE(y.asset_code, f.asset_code) AS asset_code,
  COALESCE(f.total_fees_collected, 0) AS total_fees_collected,
  COALESCE(y.total_gross_yield, 0) AS total_gross_yield,
  COALESCE(y.total_gross_yield, 0) - COALESCE(f.total_fees_collected, 0) AS total_net_yield,
  COALESCE(f.investor_count, 0) AS investor_count
FROM monthly_yields y
FULL OUTER JOIN monthly_fees f 
  ON y.summary_month = f.summary_month 
  AND y.asset_code = f.asset_code
ORDER BY summary_month DESC, asset_code;