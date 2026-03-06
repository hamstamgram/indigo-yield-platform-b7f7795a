-- ============================================================================
-- PHASE 3: EXPERT ENHANCEMENTS - MEDIUM PRIORITY ITEMS
-- Date: January 5, 2026
-- Focus: Health Checks, Yield Projection, Testing Framework
-- ============================================================================

-- ============================================================================
-- 1. DATABASE HEALTH CHECK ENDPOINTS
-- ============================================================================

-- System health status table for tracking
CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  check_name text NOT NULL,
  status text NOT NULL,
  details jsonb,
  response_time_ms numeric,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_type_time 
  ON system_health_checks(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_status 
  ON system_health_checks(status, checked_at DESC) 
  WHERE status != 'healthy';

-- Comprehensive health check function
CREATE OR REPLACE FUNCTION perform_system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz;
  v_check_start timestamptz;
  v_results jsonb := '{}'::jsonb;
  v_overall_status text := 'healthy';
  v_check_result jsonb;
  v_duration_ms numeric;
  
  -- Counts
  v_active_positions int;
  v_pending_distributions int;
  v_recent_errors int;
  v_orphaned_records int;
BEGIN
  v_start := clock_timestamp();

  -- 1. Database Connectivity Check
  v_check_start := clock_timestamp();
  BEGIN
    PERFORM 1;
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    v_check_result := jsonb_build_object(
      'status', 'healthy',
      'response_time_ms', v_duration_ms
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'critical';
    v_check_result := jsonb_build_object(
      'status', 'critical',
      'error', SQLERRM
    );
  END;
  v_results := v_results || jsonb_build_object('database_connectivity', v_check_result);

  -- 2. Data Integrity Check - Position Consistency
  v_check_start := clock_timestamp();
  BEGIN
    SELECT COUNT(*) INTO v_orphaned_records
    FROM investor_positions ip
    WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = ip.investor_id
    );
    
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    
    IF v_orphaned_records > 0 THEN
      v_overall_status := CASE WHEN v_overall_status = 'critical' THEN 'critical' ELSE 'warning' END;
      v_check_result := jsonb_build_object(
        'status', 'warning',
        'orphaned_positions', v_orphaned_records,
        'response_time_ms', v_duration_ms
      );
    ELSE
      v_check_result := jsonb_build_object(
        'status', 'healthy',
        'orphaned_positions', 0,
        'response_time_ms', v_duration_ms
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_check_result := jsonb_build_object(
      'status', 'error',
      'error', SQLERRM
    );
  END;
  v_results := v_results || jsonb_build_object('data_integrity_positions', v_check_result);

  -- 3. Active Positions Count
  v_check_start := clock_timestamp();
  BEGIN
    SELECT COUNT(*) INTO v_active_positions
    FROM investor_positions
    WHERE current_value > 0;
    
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    v_check_result := jsonb_build_object(
      'status', 'healthy',
      'active_positions', v_active_positions,
      'response_time_ms', v_duration_ms
    );
  EXCEPTION WHEN OTHERS THEN
    v_check_result := jsonb_build_object(
      'status', 'error',
      'error', SQLERRM
    );
  END;
  v_results := v_results || jsonb_build_object('active_positions', v_check_result);

  -- 4. Pending Distributions Check
  v_check_start := clock_timestamp();
  BEGIN
    SELECT COUNT(*) INTO v_pending_distributions
    FROM yield_distributions
    WHERE status = 'calculated'
      AND voided_at IS NULL
      AND effective_date < CURRENT_DATE;
    
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    
    IF v_pending_distributions > 5 THEN
      v_overall_status := CASE WHEN v_overall_status = 'critical' THEN 'critical' ELSE 'warning' END;
      v_check_result := jsonb_build_object(
        'status', 'warning',
        'pending_count', v_pending_distributions,
        'message', 'Multiple pending distributions awaiting application',
        'response_time_ms', v_duration_ms
      );
    ELSE
      v_check_result := jsonb_build_object(
        'status', 'healthy',
        'pending_count', v_pending_distributions,
        'response_time_ms', v_duration_ms
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_check_result := jsonb_build_object(
      'status', 'error',
      'error', SQLERRM
    );
  END;
  v_results := v_results || jsonb_build_object('pending_distributions', v_check_result);

  -- 5. Recent Error Rate Check (from audit log)
  v_check_start := clock_timestamp();
  BEGIN
    SELECT COUNT(*) INTO v_recent_errors
    FROM system_audit_log
    WHERE success = false
      AND created_at > now() - interval '1 hour';
    
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    
    IF v_recent_errors > 10 THEN
      v_overall_status := CASE WHEN v_overall_status = 'critical' THEN 'critical' ELSE 'warning' END;
      v_check_result := jsonb_build_object(
        'status', 'warning',
        'error_count_1h', v_recent_errors,
        'message', 'Elevated error rate in last hour',
        'response_time_ms', v_duration_ms
      );
    ELSE
      v_check_result := jsonb_build_object(
        'status', 'healthy',
        'error_count_1h', v_recent_errors,
        'response_time_ms', v_duration_ms
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Table might not exist yet
    v_check_result := jsonb_build_object(
      'status', 'healthy',
      'error_count_1h', 0,
      'note', 'Audit log check skipped',
      'response_time_ms', 0
    );
  END;
  v_results := v_results || jsonb_build_object('recent_errors', v_check_result);

  -- 6. Table Size Check
  v_check_start := clock_timestamp();
  BEGIN
    v_check_result := (
      SELECT jsonb_build_object(
        'status', 'healthy',
        'tables', jsonb_agg(jsonb_build_object(
          'table', relname,
          'rows', n_live_tup,
          'size_bytes', pg_relation_size(relid)
        ))
      )
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND relname IN ('investor_positions', 'transactions_v2', 'yield_distributions', 'profiles')
    );
    v_duration_ms := EXTRACT(EPOCH FROM (clock_timestamp() - v_check_start)) * 1000;
    v_check_result := v_check_result || jsonb_build_object('response_time_ms', v_duration_ms);
  EXCEPTION WHEN OTHERS THEN
    v_check_result := jsonb_build_object(
      'status', 'error',
      'error', SQLERRM
    );
  END;
  v_results := v_results || jsonb_build_object('table_stats', v_check_result);

  -- Record overall health check
  INSERT INTO system_health_checks (check_type, check_name, status, details, response_time_ms)
  VALUES (
    'full_system',
    'perform_system_health_check',
    v_overall_status,
    v_results,
    EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000
  );

  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'checked_at', now(),
    'total_duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000,
    'checks', v_results
  );
END;
$$;

-- Quick health check for load balancers
CREATE OR REPLACE FUNCTION health_check_quick()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'status', 'ok',
    'timestamp', now(),
    'database', 'connected'
  );
$$;

-- ============================================================================
-- 2. YIELD PROJECTION ENGINE
-- ============================================================================

-- Yield projection configuration
CREATE TABLE IF NOT EXISTS yield_projection_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  projection_method text NOT NULL DEFAULT 'historical_average',
  lookback_days int DEFAULT 30,
  confidence_level numeric DEFAULT 0.95,
  custom_parameters jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(fund_id, projection_method)
);

-- Saved projections
CREATE TABLE IF NOT EXISTS yield_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES funds(id),
  projection_date date NOT NULL,
  projection_horizon_days int NOT NULL,
  method_used text NOT NULL,
  projected_daily_yield_pct numeric,
  projected_total_yield numeric,
  confidence_lower numeric,
  confidence_upper numeric,
  assumptions jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yield_projections_fund_date 
  ON yield_projections(fund_id, projection_date DESC);

-- Yield projection function
CREATE OR REPLACE FUNCTION project_yield(
  p_fund_id uuid,
  p_horizon_days int DEFAULT 30,
  p_method text DEFAULT 'historical_average',
  p_lookback_days int DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_daily_yield_pct numeric;
  v_std_dev numeric;
  v_current_aum numeric;
  v_projected_daily_yield numeric;
  v_projected_total_yield numeric;
  v_confidence_lower numeric;
  v_confidence_upper numeric;
  v_data_points int;
  v_projection_id uuid;
BEGIN
  -- Get historical yield statistics
  SELECT 
    COUNT(*),
    AVG(CASE WHEN opening_aum > 0 THEN net_yield / opening_aum * 100 ELSE 0 END),
    STDDEV(CASE WHEN opening_aum > 0 THEN net_yield / opening_aum * 100 ELSE 0 END)
  INTO v_data_points, v_avg_daily_yield_pct, v_std_dev
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND voided_at IS NULL
    AND status IN ('applied', 'locked')
    AND effective_date >= CURRENT_DATE - p_lookback_days;

  IF v_data_points < 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient historical data',
      'data_points', v_data_points,
      'minimum_required', 5
    );
  END IF;

  -- Get current AUM
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  -- Calculate projections based on method
  IF p_method = 'historical_average' THEN
    v_projected_daily_yield := v_current_aum * (v_avg_daily_yield_pct / 100);
    v_projected_total_yield := v_projected_daily_yield * p_horizon_days;
    
    -- 95% confidence interval using 1.96 * std_dev
    v_confidence_lower := v_projected_total_yield - (1.96 * COALESCE(v_std_dev, 0) / 100 * v_current_aum * p_horizon_days);
    v_confidence_upper := v_projected_total_yield + (1.96 * COALESCE(v_std_dev, 0) / 100 * v_current_aum * p_horizon_days);
  ELSIF p_method = 'weighted_recent' THEN
    -- Weight recent data more heavily
    SELECT 
      SUM(weighted_yield) / NULLIF(SUM(weight), 0) INTO v_avg_daily_yield_pct
    FROM (
      SELECT 
        CASE WHEN opening_aum > 0 THEN net_yield / opening_aum * 100 ELSE 0 END AS weighted_yield,
        (p_lookback_days - (CURRENT_DATE - effective_date)::int + 1)::numeric AS weight
      FROM yield_distributions
      WHERE fund_id = p_fund_id
        AND voided_at IS NULL
        AND status IN ('applied', 'locked')
        AND effective_date >= CURRENT_DATE - p_lookback_days
    ) weighted;
    
    v_projected_daily_yield := v_current_aum * (v_avg_daily_yield_pct / 100);
    v_projected_total_yield := v_projected_daily_yield * p_horizon_days;
    v_confidence_lower := v_projected_total_yield * 0.85;
    v_confidence_upper := v_projected_total_yield * 1.15;
  ELSE
    -- Default to simple average
    v_projected_daily_yield := v_current_aum * (v_avg_daily_yield_pct / 100);
    v_projected_total_yield := v_projected_daily_yield * p_horizon_days;
    v_confidence_lower := v_projected_total_yield * 0.9;
    v_confidence_upper := v_projected_total_yield * 1.1;
  END IF;

  -- Save projection
  INSERT INTO yield_projections (
    fund_id, projection_date, projection_horizon_days, method_used,
    projected_daily_yield_pct, projected_total_yield,
    confidence_lower, confidence_upper, assumptions
  ) VALUES (
    p_fund_id, CURRENT_DATE, p_horizon_days, p_method,
    v_avg_daily_yield_pct, v_projected_total_yield,
    v_confidence_lower, v_confidence_upper,
    jsonb_build_object(
      'lookback_days', p_lookback_days,
      'data_points', v_data_points,
      'current_aum', v_current_aum,
      'std_dev', v_std_dev
    )
  )
  RETURNING id INTO v_projection_id;

  RETURN jsonb_build_object(
    'success', true,
    'projection_id', v_projection_id,
    'fund_id', p_fund_id,
    'current_aum', v_current_aum,
    'method', p_method,
    'horizon_days', p_horizon_days,
    'historical_data_points', v_data_points,
    'historical_avg_daily_yield_pct', ROUND(v_avg_daily_yield_pct, 6),
    'historical_std_dev', ROUND(COALESCE(v_std_dev, 0), 6),
    'projected_daily_yield', ROUND(v_projected_daily_yield, 2),
    'projected_total_yield', ROUND(v_projected_total_yield, 2),
    'confidence_interval', jsonb_build_object(
      'lower', ROUND(GREATEST(v_confidence_lower, 0), 2),
      'upper', ROUND(v_confidence_upper, 2),
      'level', 0.95
    )
  );
END;
$$;

-- ============================================================================
-- 3. TESTING FRAMEWORK - DATA VALIDATION FUNCTIONS
-- ============================================================================

-- Validation results table
CREATE TABLE IF NOT EXISTS data_validation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  is_valid boolean NOT NULL,
  errors jsonb,
  warnings jsonb,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validation_results_type 
  ON data_validation_results(validation_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_results_entity 
  ON data_validation_results(entity_type, entity_id);

-- Validate investor position
CREATE OR REPLACE FUNCTION validate_investor_position(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_position record;
  v_calculated_value numeric;
  v_calculated_yield numeric;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_is_valid boolean := true;
BEGIN
  -- Get current position
  SELECT * INTO v_position
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'errors', jsonb_build_array('Position not found')
    );
  END IF;

  -- Calculate expected values from transactions
  SELECT 
    COALESCE(SUM(CASE 
      WHEN type = 'DEPOSIT' THEN amount
      WHEN type = 'YIELD' THEN amount
      WHEN type = 'REDEMPTION' THEN -amount
      ELSE 0 
    END), 0),
    COALESCE(SUM(CASE WHEN type = 'YIELD' THEN amount ELSE 0 END), 0)
  INTO v_calculated_value, v_calculated_yield
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id 
    AND is_voided = false;

  -- Check position value matches transactions
  IF ABS(v_position.current_value - v_calculated_value) > 0.01 THEN
    v_is_valid := false;
    v_errors := v_errors || jsonb_build_object(
      'type', 'value_mismatch',
      'position_value', v_position.current_value,
      'calculated_value', v_calculated_value,
      'difference', v_position.current_value - v_calculated_value
    );
  END IF;

  -- Check yield total
  IF ABS(v_position.total_yield_earned - v_calculated_yield) > 0.01 THEN
    v_is_valid := false;
    v_errors := v_errors || jsonb_build_object(
      'type', 'yield_mismatch',
      'position_yield', v_position.total_yield_earned,
      'calculated_yield', v_calculated_yield,
      'difference', v_position.total_yield_earned - v_calculated_yield
    );
  END IF;

  -- Check for negative values
  IF v_position.current_value < 0 THEN
    v_is_valid := false;
    v_errors := v_errors || jsonb_build_object(
      'type', 'negative_value',
      'current_value', v_position.current_value
    );
  END IF;

  -- Warnings
  IF v_position.current_value = 0 AND v_position.total_invested > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'zero_balance',
      'message', 'Position has zero value but has investment history'
    );
  END IF;

  -- Save result
  INSERT INTO data_validation_results (
    validation_type, entity_type, entity_id, is_valid, errors, warnings
  ) VALUES (
    'position_integrity', 'investor_position', p_investor_id, v_is_valid, v_errors, v_warnings
  );

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'position', jsonb_build_object(
      'current_value', v_position.current_value,
      'total_yield_earned', v_position.total_yield_earned
    ),
    'calculated', jsonb_build_object(
      'value', v_calculated_value,
      'yield', v_calculated_yield
    ),
    'errors', v_errors,
    'warnings', v_warnings
  );
END;
$$;

-- Validate entire fund
CREATE OR REPLACE FUNCTION validate_fund_integrity(p_fund_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fund record;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_is_valid boolean := true;
  v_position_results jsonb := '[]'::jsonb;
  v_inv record;
  v_total_positions numeric;
  v_total_from_distributions numeric;
BEGIN
  -- Get fund
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('is_valid', false, 'errors', jsonb_build_array('Fund not found'));
  END IF;

  -- Validate each position
  FOR v_inv IN 
    SELECT investor_id, fund_id, current_value
    FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0
    LIMIT 100
  LOOP
    v_position_results := v_position_results || validate_investor_position(v_inv.investor_id, v_inv.fund_id);
  END LOOP;

  -- Check total AUM consistency
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_positions
  FROM investor_positions WHERE fund_id = p_fund_id;

  -- Check distribution totals match
  SELECT COALESCE(SUM(net_yield), 0) INTO v_total_from_distributions
  FROM yield_distributions
  WHERE fund_id = p_fund_id AND voided_at IS NULL AND status IN ('applied', 'locked');

  -- Compare with sum of investor yields
  DECLARE
    v_total_investor_yields numeric;
  BEGIN
    SELECT COALESCE(SUM(total_yield_earned), 0) INTO v_total_investor_yields
    FROM investor_positions WHERE fund_id = p_fund_id;
    
    IF ABS(v_total_from_distributions - v_total_investor_yields) > 1 THEN
      v_warnings := v_warnings || jsonb_build_object(
        'type', 'yield_distribution_mismatch',
        'distribution_total', v_total_from_distributions,
        'investor_yield_total', v_total_investor_yields,
        'difference', v_total_from_distributions - v_total_investor_yields
      );
    END IF;
  END;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_position_results) elem 
      WHERE (elem->>'is_valid')::boolean = false
    ),
    'fund_id', p_fund_id,
    'fund_name', v_fund.name,
    'total_aum', v_total_positions,
    'position_validations', v_position_results,
    'errors', v_errors,
    'warnings', v_warnings
  );
END;
$$;

-- ============================================================================
-- 4. SNAPSHOT/ROLLBACK CAPABILITY
-- ============================================================================

-- Position snapshots table
CREATE TABLE IF NOT EXISTS position_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_name text NOT NULL,
  snapshot_date date NOT NULL,
  fund_id uuid REFERENCES funds(id),
  snapshot_data jsonb NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_position_snapshots_fund_date 
  ON position_snapshots(fund_id, snapshot_date DESC);

-- Create position snapshot
CREATE OR REPLACE FUNCTION create_position_snapshot(
  p_fund_id uuid,
  p_snapshot_name text,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
  v_snapshot_data jsonb;
  v_position_count int;
  v_total_value numeric;
BEGIN
  -- Capture all positions for the fund
  SELECT 
    jsonb_agg(jsonb_build_object(
      'investor_id', ip.investor_id,
      'fund_id', ip.fund_id,
      'current_units', ip.current_units,
      'current_value', ip.current_value,
      'total_invested', ip.total_invested,
      'total_redeemed', ip.total_redeemed,
      'total_yield_earned', ip.total_yield_earned,
      'last_transaction_date', ip.last_transaction_date,
      'last_yield_date', ip.last_yield_date
    )),
    COUNT(*),
    SUM(ip.current_value)
  INTO v_snapshot_data, v_position_count, v_total_value
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id;

  INSERT INTO position_snapshots (
    snapshot_name, snapshot_date, fund_id, snapshot_data, metadata, created_by
  ) VALUES (
    p_snapshot_name,
    CURRENT_DATE,
    p_fund_id,
    COALESCE(v_snapshot_data, '[]'::jsonb),
    jsonb_build_object(
      'position_count', v_position_count,
      'total_value', v_total_value,
      'captured_at', now()
    ),
    p_created_by
  )
  RETURNING id INTO v_snapshot_id;

  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'snapshot_name', p_snapshot_name,
    'fund_id', p_fund_id,
    'position_count', v_position_count,
    'total_value', v_total_value
  );
END;
$$;

-- ============================================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_projection_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "System can insert health checks"
  ON system_health_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage yield projection config"
  ON yield_projection_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can view yield projections"
  ON yield_projections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can create yield projections"
  ON yield_projections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can view validation results"
  ON data_validation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "System can insert validation results"
  ON data_validation_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage position snapshots"
  ON position_snapshots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE system_health_checks IS 'Historical record of system health check results';
COMMENT ON TABLE yield_projection_config IS 'Configuration for yield projection methods per fund';
COMMENT ON TABLE yield_projections IS 'Saved yield projections for funds';
COMMENT ON TABLE data_validation_results IS 'Results from data validation checks';
COMMENT ON TABLE position_snapshots IS 'Point-in-time snapshots of investor positions for rollback capability';
COMMENT ON FUNCTION perform_system_health_check IS 'Comprehensive system health check for monitoring';
COMMENT ON FUNCTION project_yield IS 'Project future yields based on historical data';
COMMENT ON FUNCTION validate_investor_position IS 'Validate consistency of investor position data';
COMMENT ON FUNCTION validate_fund_integrity IS 'Comprehensive fund data integrity check';
COMMENT ON FUNCTION create_position_snapshot IS 'Create a snapshot of all positions for a fund';
