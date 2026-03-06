-- Seed missing fund_daily_aum records for all active funds
-- This enables yield preview to work by providing required "previous AUM"

INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_at, updated_at)
SELECT 
  f.id,
  (CURRENT_DATE - INTERVAL '1 day')::date,
  COALESCE(
    (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = f.id),
    0
  ),
  'reporting'::aum_purpose,
  'system_baseline',
  NOW(),
  NOW()
FROM funds f
WHERE f.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM fund_daily_aum fda 
    WHERE fda.fund_id = f.id 
    AND fda.purpose = 'reporting'
  )
ON CONFLICT DO NOTHING;