-- System Health Snapshots Table and Scheduled Integrity Checker
-- Stores historical integrity check results for trend analysis

-- 1. Create the system_health_snapshots table
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),

  -- Integrity check counts (0 = healthy)
  ledger_reconciliation_count int NOT NULL DEFAULT 0,
  fund_aum_mismatch_count int NOT NULL DEFAULT 0,
  orphaned_positions_count int NOT NULL DEFAULT 0,
  orphaned_transactions_count int NOT NULL DEFAULT 0,
  fee_calculation_orphans_count int NOT NULL DEFAULT 0,
  position_variance_count int NOT NULL DEFAULT 0,

  -- Computed overall health
  total_anomalies int GENERATED ALWAYS AS (
    ledger_reconciliation_count +
    fund_aum_mismatch_count +
    orphaned_positions_count +
    orphaned_transactions_count +
    fee_calculation_orphans_count +
    position_variance_count
  ) STORED,

  -- Additional metadata
  triggered_by text DEFAULT 'scheduled', -- 'scheduled', 'manual', 'on_deploy'
  execution_time_ms int,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_system_health_snapshots_at
  ON public.system_health_snapshots(snapshot_at DESC);

-- 2. Create function to run integrity checks and store results
CREATE OR REPLACE FUNCTION public.run_integrity_check(
  p_triggered_by text DEFAULT 'scheduled'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_ts timestamptz;
  v_snapshot_id uuid;
  v_ledger_count int;
  v_aum_mismatch_count int;
  v_orphan_positions_count int;
  v_orphan_transactions_count int;
  v_fee_orphans_count int;
  v_variance_count int;
  v_execution_ms int;
BEGIN
  v_start_ts := clock_timestamp();

  -- Count anomalies from each integrity view
  SELECT COUNT(*) INTO v_ledger_count FROM v_ledger_reconciliation;
  SELECT COUNT(*) INTO v_aum_mismatch_count FROM fund_aum_mismatch;
  SELECT COUNT(*) INTO v_orphan_positions_count FROM v_orphaned_positions;
  SELECT COUNT(*) INTO v_orphan_transactions_count FROM v_orphaned_transactions;
  SELECT COUNT(*) INTO v_fee_orphans_count FROM v_fee_calculation_orphans;
  SELECT COUNT(*) INTO v_variance_count FROM v_position_transaction_variance;

  v_execution_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_ts))::int;

  -- Insert snapshot
  INSERT INTO system_health_snapshots (
    ledger_reconciliation_count,
    fund_aum_mismatch_count,
    orphaned_positions_count,
    orphaned_transactions_count,
    fee_calculation_orphans_count,
    position_variance_count,
    triggered_by,
    execution_time_ms
  ) VALUES (
    v_ledger_count,
    v_aum_mismatch_count,
    v_orphan_positions_count,
    v_orphan_transactions_count,
    v_fee_orphans_count,
    v_variance_count,
    p_triggered_by,
    v_execution_ms
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

-- 3. Create function to get health trend (last N days)
CREATE OR REPLACE FUNCTION public.get_health_trend(
  p_days int DEFAULT 30
)
RETURNS TABLE (
  snapshot_date date,
  total_anomalies int,
  ledger_issues int,
  aum_mismatches int,
  orphaned_records int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    snapshot_at::date AS snapshot_date,
    MAX(total_anomalies) AS total_anomalies,
    MAX(ledger_reconciliation_count) AS ledger_issues,
    MAX(fund_aum_mismatch_count) AS aum_mismatches,
    MAX(orphaned_positions_count + orphaned_transactions_count + fee_calculation_orphans_count) AS orphaned_records
  FROM system_health_snapshots
  WHERE snapshot_at >= (CURRENT_DATE - p_days)
  GROUP BY snapshot_at::date
  ORDER BY snapshot_date DESC;
$$;

-- 4. Create function to get latest health status
CREATE OR REPLACE FUNCTION public.get_latest_health_status()
RETURNS TABLE (
  snapshot_id uuid,
  snapshot_at timestamptz,
  total_anomalies int,
  ledger_reconciliation_count int,
  fund_aum_mismatch_count int,
  orphaned_positions_count int,
  orphaned_transactions_count int,
  fee_calculation_orphans_count int,
  position_variance_count int,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id AS snapshot_id,
    snapshot_at,
    total_anomalies,
    ledger_reconciliation_count,
    fund_aum_mismatch_count,
    orphaned_positions_count,
    orphaned_transactions_count,
    fee_calculation_orphans_count,
    position_variance_count,
    CASE
      WHEN total_anomalies = 0 THEN 'healthy'
      WHEN total_anomalies <= 5 THEN 'warning'
      ELSE 'critical'
    END AS status
  FROM system_health_snapshots
  ORDER BY snapshot_at DESC
  LIMIT 1;
$$;

-- 5. Grant permissions
GRANT SELECT ON public.system_health_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_integrity_check(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_health_trend(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_health_status() TO authenticated;

-- 6. Add RLS policy (admin only for writes)
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health snapshots"
  ON public.system_health_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Comment for documentation
COMMENT ON TABLE public.system_health_snapshots IS
'Stores historical integrity check results. Run daily via scheduled edge function.';

COMMENT ON FUNCTION public.run_integrity_check(text) IS
'Executes all integrity views and stores snapshot. Call from scheduled edge function.';
