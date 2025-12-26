-- ============================================================================
-- Fix Fund AUM Mismatch and Backfill Period Snapshots
-- ============================================================================

-- Part 1: Clear stale fund_daily_aum records for funds with no active transactions
-- These are orphan AUM records where calculated_aum = 0 (all transactions voided)
DELETE FROM fund_daily_aum 
WHERE fund_id IN (
  SELECT fam.fund_id 
  FROM fund_aum_mismatch fam
  WHERE fam.calculated_aum = 0
);

-- Part 2: Backfill missing fund_period_snapshot records
-- For finalized periods that are missing snapshots
INSERT INTO fund_period_snapshot (fund_id, period_id, snapshot_date, total_aum, investor_count, is_locked, created_at)
SELECT 
  f.id as fund_id,
  sp.id as period_id,
  sp.period_end_date as snapshot_date,
  COALESCE(
    (SELECT total_aum FROM fund_daily_aum fda 
     WHERE fda.fund_id = f.id 
     AND fda.aum_date <= sp.period_end_date
     AND fda.is_voided = false
     ORDER BY fda.aum_date DESC 
     LIMIT 1),
    0
  ) as total_aum,
  COALESCE(
    (SELECT COUNT(DISTINCT investor_id) FROM investor_positions ip 
     WHERE ip.fund_id = f.id AND ip.current_value > 0),
    0
  )::integer as investor_count,
  CASE WHEN sp.status = 'finalized' THEN true ELSE false END as is_locked,
  now()
FROM statement_periods sp
CROSS JOIN funds f
WHERE f.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM fund_period_snapshot fps 
  WHERE fps.period_id = sp.id AND fps.fund_id = f.id
);