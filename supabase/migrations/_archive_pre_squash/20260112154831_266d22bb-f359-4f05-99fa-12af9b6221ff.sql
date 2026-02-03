-- =====================================================
-- Fix Missing Views, Tables & Schema Mismatches
-- =====================================================

-- 1. Create v_orphaned_transactions view (transactions without matching positions)
CREATE OR REPLACE VIEW v_orphaned_transactions AS
SELECT t.*
FROM transactions_v2 t
LEFT JOIN investor_positions ip ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE ip.investor_id IS NULL
  AND t.investor_id IS NOT NULL
  AND NOT t.is_voided;

-- 2. Create v_fee_calculation_orphans view (fee allocations without valid distributions)
-- yield_distributions uses 'status' column, not 'is_voided'
CREATE OR REPLACE VIEW v_fee_calculation_orphans AS
SELECT fa.*
FROM fee_allocations fa
LEFT JOIN yield_distributions yd ON fa.distribution_id = yd.id
WHERE yd.id IS NULL OR yd.status = 'voided';

-- 3. Create v_position_transaction_variance view (position-ledger mismatches)
CREATE OR REPLACE VIEW v_position_transaction_variance AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value AS position_value,
  COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS transaction_sum,
  ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0) AS variance
FROM investor_positions ip
LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
GROUP BY ip.investor_id, ip.fund_id, ip.current_value
HAVING ABS(ip.current_value - COALESCE(SUM(t.amount) FILTER (WHERE NOT t.is_voided), 0)) > 0.01;

-- 4. Create system_health_snapshots table for health monitoring (if not exists)
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_anomalies INTEGER NOT NULL DEFAULT 0,
  ledger_reconciliation_count INTEGER DEFAULT 0,
  fund_aum_mismatch_count INTEGER DEFAULT 0,
  orphaned_positions_count INTEGER DEFAULT 0,
  orphaned_transactions_count INTEGER DEFAULT 0,
  fee_calculation_orphans_count INTEGER DEFAULT 0,
  position_variance_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'healthy',
  details JSONB,
  triggered_by TEXT
);

-- Add index for querying recent snapshots
CREATE INDEX IF NOT EXISTS idx_health_snapshots_at ON system_health_snapshots(snapshot_at DESC);

-- Enable RLS
ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin-only policy (drop first if exists to avoid conflict)
DROP POLICY IF EXISTS "Admins can manage health snapshots" ON system_health_snapshots;
CREATE POLICY "Admins can manage health snapshots" ON system_health_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 5. Add is_active column to investor_positions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_positions' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE investor_positions ADD COLUMN is_active BOOLEAN DEFAULT true;
    UPDATE investor_positions SET is_active = true WHERE is_active IS NULL;
  END IF;
END $$;

-- 6. Create helper functions for health monitoring
CREATE OR REPLACE FUNCTION get_latest_health_status()
RETURNS TABLE (
  snapshot_id UUID,
  snapshot_at TIMESTAMPTZ,
  total_anomalies INTEGER,
  status TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.snapshot_id,
    s.snapshot_at,
    s.total_anomalies,
    s.status,
    s.details
  FROM system_health_snapshots s
  ORDER BY s.snapshot_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_health_trend(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  snapshot_date DATE,
  avg_anomalies NUMERIC,
  max_anomalies INTEGER,
  snapshot_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.snapshot_at) AS snapshot_date,
    AVG(s.total_anomalies)::NUMERIC AS avg_anomalies,
    MAX(s.total_anomalies) AS max_anomalies,
    COUNT(*) AS snapshot_count
  FROM system_health_snapshots s
  WHERE s.snapshot_at >= CURRENT_DATE - p_days
  GROUP BY DATE(s.snapshot_at)
  ORDER BY snapshot_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;