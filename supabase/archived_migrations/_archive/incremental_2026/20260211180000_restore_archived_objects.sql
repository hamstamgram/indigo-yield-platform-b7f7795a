-- ============================================================================
-- Migration: Restore Archived Objects Missing from Baseline
-- Created: 2026-02-11
-- Purpose: Restore tables and functions from archived migrations that were
--          lost during schema squash. These objects are required by yield RPCs.
-- ============================================================================

-- ============================================================================
-- 1. Create correction_runs table (double-correction prevention)
-- Source: 20260113140000_fortune500_enhancements.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS correction_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_hash text NOT NULL,
  correction_type text NOT NULL,
  fund_id uuid REFERENCES funds(id),
  effective_date date,
  parameters jsonb NOT NULL,
  result jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  CONSTRAINT unique_correction_input UNIQUE (input_hash)
);

CREATE INDEX IF NOT EXISTS idx_correction_runs_fund ON correction_runs(fund_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_correction_runs_status ON correction_runs(status);

COMMENT ON TABLE correction_runs IS
'Tracks yield correction runs to prevent duplicate corrections.
input_hash is computed from fund_id + date + correction_type to ensure idempotency.
Fortune 500 audit trail requirement added 2026-01-13.';

ALTER TABLE correction_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage correction_runs" ON correction_runs;
CREATE POLICY "Admins can manage correction_runs" ON correction_runs
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT, INSERT, UPDATE ON correction_runs TO authenticated;


-- ============================================================================
-- 2. Create position snapshots table for point-in-time reconciliation
-- Source: 20260113140000_fortune500_enhancements.sql
-- Required by: calc_avg_daily_balance function
-- ============================================================================

CREATE TABLE IF NOT EXISTS investor_position_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  investor_id uuid NOT NULL REFERENCES profiles(id),
  fund_id uuid NOT NULL REFERENCES funds(id),
  current_value numeric(28,10) NOT NULL,
  snapshot_source text DEFAULT 'daily_job',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_position_snapshot UNIQUE (snapshot_date, investor_id, fund_id)
);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_date ON investor_position_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_position_snapshots_fund ON investor_position_snapshots(fund_id, snapshot_date);

COMMENT ON TABLE investor_position_snapshots IS
'Daily position snapshots for point-in-time reconciliation and regulatory audit trail.
Required by calc_avg_daily_balance function for yield distribution calculations.
Fortune 500 compliance requirement added 2026-01-13.';

ALTER TABLE investor_position_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage position_snapshots" ON investor_position_snapshots;
CREATE POLICY "Admins can manage position_snapshots" ON investor_position_snapshots
  FOR ALL TO authenticated
  USING (is_admin());

GRANT SELECT, INSERT ON investor_position_snapshots TO authenticated;


-- ============================================================================
-- 3. Create daily position snapshot function
-- Source: 20260113140000_fortune500_enhancements.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_daily_position_snapshot(
  p_snapshot_date date DEFAULT CURRENT_DATE,
  p_fund_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO investor_position_snapshots (snapshot_date, investor_id, fund_id, current_value, snapshot_source)
  SELECT
    p_snapshot_date,
    ip.investor_id,
    ip.fund_id,
    ip.current_value,
    'daily_snapshot'
  FROM investor_positions ip
  WHERE ip.current_value != 0
    AND (p_fund_id IS NULL OR ip.fund_id = p_fund_id)
  ON CONFLICT (snapshot_date, investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    snapshot_source = 'updated_snapshot';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_date', p_snapshot_date,
    'positions_captured', v_count,
    'fund_id', p_fund_id
  );
END;
$function$;

COMMENT ON FUNCTION create_daily_position_snapshot IS
'Creates daily position snapshots for all active positions. Run via cron job.
Fortune 500 audit trail requirement added 2026-01-13.';

GRANT EXECUTE ON FUNCTION create_daily_position_snapshot TO authenticated;


-- ============================================================================
-- 4. Fortune 500 tolerance calculation function
-- Source: 20260113140000_fortune500_enhancements.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_reconciliation_tolerance(
  p_aum numeric,
  p_tier text DEFAULT 'normal'
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN CASE p_tier
    WHEN 'strict' THEN GREATEST(0.0001 * p_aum, 0.01)   -- 1bp or $0.01
    WHEN 'normal' THEN GREATEST(0.0005 * p_aum, 1.00)   -- 5bp or $1.00
    WHEN 'relaxed' THEN GREATEST(0.001 * p_aum, 10.00)  -- 10bp or $10.00
    WHEN 'yield_distribution' THEN GREATEST(0.00001 * p_aum, 0.0001)
    ELSE GREATEST(0.0005 * p_aum, 1.00)
  END;
END;
$function$;

COMMENT ON FUNCTION calculate_reconciliation_tolerance IS
'Calculates appropriate reconciliation tolerance based on AUM and tier.
Fortune 500 compliance: basis point precision with minimum floors.';

GRANT EXECUTE ON FUNCTION calculate_reconciliation_tolerance TO authenticated;


-- ============================================================================
-- 5. Strict AUM validation with Fortune 500 tolerance
-- Source: 20260113140000_fortune500_enhancements.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_aum_matches_positions_strict(
  p_fund_id uuid,
  p_aum_date date DEFAULT CURRENT_DATE,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_recorded_aum numeric;
  v_positions_total numeric;
  v_discrepancy numeric;
  v_tolerance numeric;
  v_discrepancy_pct numeric;
  v_fund_code text;
  v_is_valid boolean;
  v_position_count integer;
BEGIN
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'FUND_NOT_FOUND');
  END IF;

  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id AND aum_date = p_aum_date
    AND purpose = p_purpose AND NOT is_voided
  ORDER BY created_at DESC LIMIT 1;

  SELECT COALESCE(SUM(current_value), 0), COUNT(*)
  INTO v_positions_total, v_position_count
  FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0;

  IF v_recorded_aum IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 'error', 'NO_AUM_RECORD',
      'positions_total', v_positions_total,
      'position_count', v_position_count
    );
  END IF;

  v_discrepancy := v_recorded_aum - v_positions_total;
  v_tolerance := calculate_reconciliation_tolerance(v_recorded_aum, 'strict');
  v_is_valid := ABS(v_discrepancy) <= v_tolerance;

  IF v_recorded_aum > 0 THEN
    v_discrepancy_pct := ABS(v_discrepancy / v_recorded_aum) * 100;
  ELSE
    v_discrepancy_pct := CASE WHEN v_positions_total > 0 THEN 100 ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'fund_code', v_fund_code,
    'recorded_aum', v_recorded_aum,
    'positions_total', v_positions_total,
    'discrepancy', v_discrepancy,
    'discrepancy_pct', ROUND(v_discrepancy_pct, 6),
    'tolerance_used', v_tolerance,
    'tolerance_tier', 'strict',
    'position_count', v_position_count,
    'fortune_500_compliant', v_is_valid
  );
END;
$function$;

COMMENT ON FUNCTION validate_aum_matches_positions_strict IS
'Strict AUM validation with Fortune 500 basis point tolerance.
Use for yield distributions and financial reporting.';

GRANT EXECUTE ON FUNCTION validate_aum_matches_positions_strict TO authenticated;


-- ============================================================================
-- 6. calc_avg_daily_balance function - CRITICAL for yield distribution
-- Source: 20260116100003_adb_yield_allocation.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calc_avg_daily_balance(
  p_investor_id uuid,
  p_fund_id uuid,
  p_period_start date,
  p_period_end date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result numeric := 0;
  v_total_weighted_balance numeric := 0;
  v_total_days int;
  v_current_balance numeric := 0;
  v_current_date date;
  v_next_date date;
  v_days_at_balance int;
  v_tx RECORD;
  v_initial_balance numeric;
BEGIN
  -- Calculate total days in period
  v_total_days := (p_period_end - p_period_start + 1);

  IF v_total_days <= 0 THEN
    RETURN 0;
  END IF;

  -- Get initial balance at period start (from position snapshot or calculate from transactions)
  SELECT COALESCE(
    (
      SELECT ps.current_value
      FROM investor_position_snapshots ps
      WHERE ps.investor_id = p_investor_id
        AND ps.fund_id = p_fund_id
        AND ps.snapshot_date = p_period_start - 1
      ORDER BY ps.created_at DESC
      LIMIT 1
    ),
    (
      SELECT COALESCE(SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE t.amount
        END
      ), 0)
      FROM transactions_v2 t
      WHERE t.investor_id = p_investor_id
        AND t.fund_id = p_fund_id
        AND t.tx_date < p_period_start
        AND t.is_voided = false
    )
  ) INTO v_initial_balance;

  v_current_balance := COALESCE(v_initial_balance, 0);
  v_current_date := p_period_start;

  -- Process each transaction in the period
  FOR v_tx IN
    SELECT
      t.tx_date,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
          WHEN t.type = 'ADJUSTMENT' THEN t.amount  -- Can be positive or negative
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE 0
        END
      ) as daily_net_change
    FROM transactions_v2 t
    WHERE t.investor_id = p_investor_id
      AND t.fund_id = p_fund_id
      AND t.tx_date >= p_period_start
      AND t.tx_date <= p_period_end
      AND t.is_voided = false
    GROUP BY t.tx_date
    ORDER BY t.tx_date
  LOOP
    -- Days at current balance (before this transaction date)
    v_days_at_balance := v_tx.tx_date - v_current_date;

    IF v_days_at_balance > 0 THEN
      v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
    END IF;

    -- Update balance and date
    v_current_balance := v_current_balance + v_tx.daily_net_change;
    v_current_date := v_tx.tx_date;
  END LOOP;

  -- Days from last transaction to period end
  v_days_at_balance := (p_period_end - v_current_date + 1);
  IF v_days_at_balance > 0 THEN
    v_total_weighted_balance := v_total_weighted_balance + (v_current_balance * v_days_at_balance);
  END IF;

  -- Calculate average
  v_result := v_total_weighted_balance / v_total_days;

  RETURN ROUND(v_result, 8);
END;
$$;

COMMENT ON FUNCTION calc_avg_daily_balance IS
  'Calculates the Average Daily Balance for an investor position over a date range.
   Used for fair yield allocation in apply_adb_yield_distribution_v3 and preview functions.';

GRANT EXECUTE ON FUNCTION calc_avg_daily_balance TO authenticated;


-- ============================================================================
-- Summary: Restored objects from archived migrations
-- ============================================================================
-- Tables:
--   - correction_runs (for idempotent yield corrections)
--   - investor_position_snapshots (for ADB calculations)
--
-- Functions:
--   - calc_avg_daily_balance (CRITICAL - used by yield distribution RPCs)
--   - create_daily_position_snapshot (creates snapshots for positions)
--   - calculate_reconciliation_tolerance (tolerance calculations)
--   - validate_aum_matches_positions_strict (AUM validation)
-- ============================================================================
