-- ============================================================================
-- PHASE 2: EXPERT ENHANCEMENTS - HIGH PRIORITY ITEMS
-- Date: January 5, 2026
-- Focus: Materialized Views, Reconciliation, Authorization, Batch Optimization
-- ============================================================================

-- ============================================================================
-- 1. MATERIALIZED VIEWS FOR REPORTING
-- ============================================================================

-- Fund daily performance view (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_fund_daily_performance AS
SELECT 
  f.id AS fund_id,
  f.name AS fund_name,
  f.currency,
  yd.effective_date,
  yd.gross_yield,
  yd.net_yield,
  yd.total_fees,
  yd.total_ib,
  yd.investor_count,
  yd.opening_aum,
  yd.closing_aum,
  yd.status,
  CASE 
    WHEN yd.opening_aum > 0 
    THEN ROUND((yd.net_yield / yd.opening_aum * 100)::numeric, 6)
    ELSE 0 
  END AS daily_yield_pct,
  SUM(yd.net_yield) OVER (
    PARTITION BY f.id 
    ORDER BY yd.effective_date 
    ROWS UNBOUNDED PRECEDING
  ) AS cumulative_yield,
  SUM(yd.total_fees) OVER (
    PARTITION BY f.id 
    ORDER BY yd.effective_date 
    ROWS UNBOUNDED PRECEDING
  ) AS cumulative_fees,
  COUNT(*) OVER (PARTITION BY f.id) AS total_distribution_days,
  yd.created_at AS distribution_created_at
FROM funds f
JOIN yield_distributions yd ON yd.fund_id = f.id
WHERE yd.voided_at IS NULL
  AND yd.status IN ('applied', 'locked')
ORDER BY f.id, yd.effective_date DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_fund_daily_perf_pk 
  ON mv_fund_daily_performance(fund_id, effective_date);
CREATE INDEX IF NOT EXISTS idx_mv_fund_daily_perf_date 
  ON mv_fund_daily_performance(effective_date DESC);

-- Investor portfolio summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_investor_portfolio_summary AS
SELECT 
  p.id AS investor_id,
  p.full_name,
  p.email,
  p.account_type,
  p.ib_parent_id,
  ip.fund_id,
  f.name AS fund_name,
  f.currency,
  ip.current_units,
  ip.current_value,
  ip.total_invested,
  ip.total_redeemed,
  ip.total_yield_earned,
  ip.last_transaction_date,
  ip.last_yield_date,
  CASE 
    WHEN ip.total_invested > 0 
    THEN ROUND(((ip.current_value + ip.total_redeemed + ip.total_yield_earned - ip.total_invested) / ip.total_invested * 100)::numeric, 4)
    ELSE 0
  END AS total_return_pct,
  ip.updated_at AS position_updated_at,
  (SELECT COUNT(*) FROM transactions_v2 t 
   WHERE t.investor_id = p.id AND t.fund_id = ip.fund_id AND t.is_voided = false
  ) AS transaction_count,
  (SELECT MAX(t.value_date) FROM transactions_v2 t 
   WHERE t.investor_id = p.id AND t.fund_id = ip.fund_id AND t.type = 'DEPOSIT' AND t.is_voided = false
  ) AS last_deposit_date
FROM profiles p
JOIN investor_positions ip ON ip.investor_id = p.id
JOIN funds f ON f.id = ip.fund_id
WHERE p.account_type != 'fees_account'
  AND ip.current_value > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_investor_portfolio_pk 
  ON mv_investor_portfolio_summary(investor_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_mv_investor_portfolio_fund 
  ON mv_investor_portfolio_summary(fund_id, current_value DESC);
CREATE INDEX IF NOT EXISTS idx_mv_investor_portfolio_ib 
  ON mv_investor_portfolio_summary(ib_parent_id) 
  WHERE ib_parent_id IS NOT NULL;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_reporting_views(p_concurrent boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start timestamptz;
  v_fund_perf_duration numeric;
  v_portfolio_duration numeric;
BEGIN
  v_start := clock_timestamp();
  
  IF p_concurrent THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fund_daily_performance;
  ELSE
    REFRESH MATERIALIZED VIEW mv_fund_daily_performance;
  END IF;
  
  v_fund_perf_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  
  v_start := clock_timestamp();
  
  IF p_concurrent THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_investor_portfolio_summary;
  ELSE
    REFRESH MATERIALIZED VIEW mv_investor_portfolio_summary;
  END IF;
  
  v_portfolio_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000;
  
  RETURN jsonb_build_object(
    'success', true,
    'refreshed_at', now(),
    'concurrent', p_concurrent,
    'durations', jsonb_build_object(
      'fund_daily_performance_ms', v_fund_perf_duration,
      'investor_portfolio_summary_ms', v_portfolio_duration
    )
  );
END;
$$;

-- ============================================================================
-- 2. MULTI-PERIOD YIELD RECONCILIATION
-- ============================================================================

-- Reconciliation results table
CREATE TABLE IF NOT EXISTS yield_reconciliation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date timestamptz NOT NULL DEFAULT now(),
  fund_id uuid REFERENCES funds(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  distribution_count int,
  total_gross_yield numeric,
  total_net_yield numeric,
  total_fees numeric,
  total_ib numeric,
  expected_position_value numeric,
  actual_position_value numeric,
  variance numeric,
  variance_pct numeric,
  discrepancies jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_fund_period 
  ON yield_reconciliation_results(fund_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status 
  ON yield_reconciliation_results(status, reconciliation_date DESC);

-- Comprehensive reconciliation function
CREATE OR REPLACE FUNCTION reconcile_yield_period(
  p_fund_id uuid,
  p_start_date date,
  p_end_date date,
  p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_distribution_count int;
  v_total_gross numeric := 0;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_expected_position_value numeric := 0;
  v_actual_position_value numeric := 0;
  v_variance numeric;
  v_variance_pct numeric;
  v_discrepancies jsonb := '[]'::jsonb;
  v_reconciliation_id uuid;
  v_investor_discrepancies jsonb := '[]'::jsonb;
  v_inv record;
BEGIN
  -- Get distribution totals for the period
  SELECT 
    COUNT(*),
    COALESCE(SUM(gross_yield), 0),
    COALESCE(SUM(net_yield), 0),
    COALESCE(SUM(total_fees), 0),
    COALESCE(SUM(total_ib), 0)
  INTO 
    v_distribution_count,
    v_total_gross,
    v_total_net,
    v_total_fees,
    v_total_ib
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND effective_date BETWEEN p_start_date AND p_end_date
    AND voided_at IS NULL
    AND status IN ('applied', 'locked');

  -- Calculate expected vs actual position values
  -- Expected: Opening position + deposits - redemptions + yield
  WITH period_transactions AS (
    SELECT 
      investor_id,
      SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) AS deposits,
      SUM(CASE WHEN type = 'REDEMPTION' THEN amount ELSE 0 END) AS redemptions
    FROM transactions_v2
    WHERE fund_id = p_fund_id
      AND value_date BETWEEN p_start_date AND p_end_date
      AND is_voided = false
    GROUP BY investor_id
  ),
  opening_positions AS (
    SELECT 
      ip.investor_id,
      COALESCE(
        (SELECT SUM(amount) FROM transactions_v2 t 
         WHERE t.investor_id = ip.investor_id 
           AND t.fund_id = p_fund_id 
           AND t.value_date < p_start_date 
           AND t.is_voided = false
           AND t.type IN ('DEPOSIT', 'YIELD')
        ) -
        (SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 t 
         WHERE t.investor_id = ip.investor_id 
           AND t.fund_id = p_fund_id 
           AND t.value_date < p_start_date 
           AND t.is_voided = false
           AND t.type = 'REDEMPTION'
        ), 0
      ) AS opening_value
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  ),
  period_yields AS (
    SELECT 
      t.investor_id,
      SUM(t.amount) AS yield_earned
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.value_date BETWEEN p_start_date AND p_end_date
      AND t.is_voided = false
      AND t.type = 'YIELD'
    GROUP BY t.investor_id
  )
  SELECT COALESCE(SUM(
    op.opening_value + 
    COALESCE(pt.deposits, 0) - 
    COALESCE(pt.redemptions, 0) + 
    COALESCE(py.yield_earned, 0)
  ), 0) INTO v_expected_position_value
  FROM opening_positions op
  LEFT JOIN period_transactions pt ON pt.investor_id = op.investor_id
  LEFT JOIN period_yields py ON py.investor_id = op.investor_id;

  -- Get actual current position value
  SELECT COALESCE(SUM(current_value), 0) INTO v_actual_position_value
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;

  v_variance := v_actual_position_value - v_expected_position_value;
  v_variance_pct := CASE 
    WHEN v_expected_position_value != 0 
    THEN ROUND((v_variance / v_expected_position_value * 100)::numeric, 6)
    ELSE 0 
  END;

  -- Check for individual investor discrepancies
  FOR v_inv IN 
    SELECT 
      ip.investor_id,
      p.full_name,
      ip.current_value AS actual_value,
      ip.total_yield_earned,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 t 
       WHERE t.investor_id = ip.investor_id 
         AND t.fund_id = p_fund_id 
         AND t.type = 'YIELD' 
         AND t.is_voided = false
      ) AS calculated_yield
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    IF ABS(v_inv.total_yield_earned - v_inv.calculated_yield) > 0.01 THEN
      v_investor_discrepancies := v_investor_discrepancies || jsonb_build_object(
        'investor_id', v_inv.investor_id,
        'investor_name', v_inv.full_name,
        'position_yield', v_inv.total_yield_earned,
        'transaction_yield', v_inv.calculated_yield,
        'difference', v_inv.total_yield_earned - v_inv.calculated_yield
      );
    END IF;
  END LOOP;

  -- Build discrepancies array
  IF ABS(v_variance) > 0.01 THEN
    v_discrepancies := v_discrepancies || jsonb_build_object(
      'type', 'position_value_mismatch',
      'expected', v_expected_position_value,
      'actual', v_actual_position_value,
      'variance', v_variance
    );
  END IF;

  IF jsonb_array_length(v_investor_discrepancies) > 0 THEN
    v_discrepancies := v_discrepancies || jsonb_build_object(
      'type', 'investor_yield_mismatches',
      'count', jsonb_array_length(v_investor_discrepancies),
      'details', v_investor_discrepancies
    );
  END IF;

  -- Check gross - fees - ib = net
  IF ABS(v_total_gross - v_total_fees - v_total_ib - v_total_net) > 0.01 THEN
    v_discrepancies := v_discrepancies || jsonb_build_object(
      'type', 'yield_calculation_mismatch',
      'gross', v_total_gross,
      'fees', v_total_fees,
      'ib', v_total_ib,
      'net', v_total_net,
      'expected_net', v_total_gross - v_total_fees - v_total_ib
    );
  END IF;

  -- Save reconciliation result
  INSERT INTO yield_reconciliation_results (
    fund_id, period_start, period_end, distribution_count,
    total_gross_yield, total_net_yield, total_fees, total_ib,
    expected_position_value, actual_position_value, variance, variance_pct,
    discrepancies, status, created_by
  ) VALUES (
    p_fund_id, p_start_date, p_end_date, v_distribution_count,
    v_total_gross, v_total_net, v_total_fees, v_total_ib,
    v_expected_position_value, v_actual_position_value, v_variance, v_variance_pct,
    v_discrepancies,
    CASE WHEN jsonb_array_length(v_discrepancies) = 0 THEN 'clean' ELSE 'needs_review' END,
    p_created_by
  )
  RETURNING id INTO v_reconciliation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reconciliation_id', v_reconciliation_id,
    'fund_id', p_fund_id,
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
    'distribution_count', v_distribution_count,
    'totals', jsonb_build_object(
      'gross_yield', v_total_gross,
      'net_yield', v_total_net,
      'fees', v_total_fees,
      'ib', v_total_ib
    ),
    'position_check', jsonb_build_object(
      'expected', v_expected_position_value,
      'actual', v_actual_position_value,
      'variance', v_variance,
      'variance_pct', v_variance_pct
    ),
    'status', CASE WHEN jsonb_array_length(v_discrepancies) = 0 THEN 'clean' ELSE 'needs_review' END,
    'discrepancy_count', jsonb_array_length(v_discrepancies),
    'discrepancies', v_discrepancies
  );
END;
$$;

-- ============================================================================
-- 3. ENHANCED AUTHORIZATION - PERMISSION MATRIX
-- ============================================================================

-- Permission definitions table
CREATE TABLE IF NOT EXISTS permission_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_code text UNIQUE NOT NULL,
  permission_name text NOT NULL,
  description text,
  category text NOT NULL,
  risk_level text DEFAULT 'low',
  requires_2fa boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  permission_code text NOT NULL REFERENCES permission_definitions(permission_code),
  conditions jsonb,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(role_name, permission_code)
);

-- User permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  permission_code text NOT NULL REFERENCES permission_definitions(permission_code),
  override_type text NOT NULL CHECK (override_type IN ('grant', 'deny')),
  conditions jsonb,
  reason text,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, permission_code)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
  ON role_permissions(role_name, is_active);
CREATE INDEX IF NOT EXISTS idx_user_overrides_user 
  ON user_permission_overrides(user_id, is_active);

-- Seed permission definitions
INSERT INTO permission_definitions (permission_code, permission_name, description, category, risk_level, requires_2fa) VALUES
  -- Fund Management
  ('fund.view', 'View Funds', 'View fund details and performance', 'fund', 'low', false),
  ('fund.create', 'Create Funds', 'Create new funds', 'fund', 'high', true),
  ('fund.edit', 'Edit Funds', 'Modify fund settings', 'fund', 'medium', false),
  ('fund.delete', 'Delete Funds', 'Delete/archive funds', 'fund', 'critical', true),
  
  -- Yield Management
  ('yield.view', 'View Yield Distributions', 'View yield distribution history', 'yield', 'low', false),
  ('yield.calculate', 'Calculate Yield', 'Run yield calculations', 'yield', 'high', false),
  ('yield.apply', 'Apply Yield', 'Apply yield distributions to positions', 'yield', 'critical', true),
  ('yield.void', 'Void Yield Distribution', 'Void applied yield distributions', 'yield', 'critical', true),
  
  -- Transaction Management
  ('transaction.view', 'View Transactions', 'View transaction history', 'transaction', 'low', false),
  ('transaction.create', 'Create Transactions', 'Create deposits/redemptions', 'transaction', 'high', false),
  ('transaction.void', 'Void Transactions', 'Void transactions', 'transaction', 'critical', true),
  ('transaction.backdate', 'Backdate Transactions', 'Create backdated transactions', 'transaction', 'critical', true),
  
  -- Investor Management
  ('investor.view', 'View Investors', 'View investor profiles', 'investor', 'low', false),
  ('investor.create', 'Create Investors', 'Create new investor accounts', 'investor', 'medium', false),
  ('investor.edit', 'Edit Investors', 'Modify investor profiles', 'investor', 'medium', false),
  ('investor.delete', 'Delete Investors', 'Delete/archive investors', 'investor', 'high', true),
  
  -- Reporting
  ('report.view', 'View Reports', 'Access standard reports', 'report', 'low', false),
  ('report.export', 'Export Reports', 'Export report data', 'report', 'medium', false),
  ('report.sensitive', 'Sensitive Reports', 'Access PII and sensitive data', 'report', 'high', false),
  
  -- System Administration
  ('admin.users', 'Manage Users', 'Create and manage admin users', 'admin', 'critical', true),
  ('admin.roles', 'Manage Roles', 'Configure roles and permissions', 'admin', 'critical', true),
  ('admin.audit', 'View Audit Logs', 'Access complete audit trail', 'admin', 'high', false),
  ('admin.settings', 'System Settings', 'Modify system configuration', 'admin', 'critical', true)
ON CONFLICT (permission_code) DO NOTHING;

-- Seed default role permissions
INSERT INTO role_permissions (role_name, permission_code) VALUES
  -- Viewer role
  ('viewer', 'fund.view'),
  ('viewer', 'yield.view'),
  ('viewer', 'transaction.view'),
  ('viewer', 'investor.view'),
  ('viewer', 'report.view'),
  
  -- Operator role
  ('operator', 'fund.view'),
  ('operator', 'fund.edit'),
  ('operator', 'yield.view'),
  ('operator', 'yield.calculate'),
  ('operator', 'transaction.view'),
  ('operator', 'transaction.create'),
  ('operator', 'investor.view'),
  ('operator', 'investor.create'),
  ('operator', 'investor.edit'),
  ('operator', 'report.view'),
  ('operator', 'report.export'),
  
  -- Manager role
  ('manager', 'fund.view'),
  ('manager', 'fund.edit'),
  ('manager', 'yield.view'),
  ('manager', 'yield.calculate'),
  ('manager', 'yield.apply'),
  ('manager', 'transaction.view'),
  ('manager', 'transaction.create'),
  ('manager', 'transaction.void'),
  ('manager', 'investor.view'),
  ('manager', 'investor.create'),
  ('manager', 'investor.edit'),
  ('manager', 'investor.delete'),
  ('manager', 'report.view'),
  ('manager', 'report.export'),
  ('manager', 'report.sensitive'),
  
  -- Admin role (all permissions)
  ('admin', 'fund.view'),
  ('admin', 'fund.create'),
  ('admin', 'fund.edit'),
  ('admin', 'fund.delete'),
  ('admin', 'yield.view'),
  ('admin', 'yield.calculate'),
  ('admin', 'yield.apply'),
  ('admin', 'yield.void'),
  ('admin', 'transaction.view'),
  ('admin', 'transaction.create'),
  ('admin', 'transaction.void'),
  ('admin', 'transaction.backdate'),
  ('admin', 'investor.view'),
  ('admin', 'investor.create'),
  ('admin', 'investor.edit'),
  ('admin', 'investor.delete'),
  ('admin', 'report.view'),
  ('admin', 'report.export'),
  ('admin', 'report.sensitive'),
  ('admin', 'admin.users'),
  ('admin', 'admin.roles'),
  ('admin', 'admin.audit'),
  ('admin', 'admin.settings')
ON CONFLICT (role_name, permission_code) DO NOTHING;

-- Permission check function
CREATE OR REPLACE FUNCTION check_permission(
  p_user_id uuid,
  p_permission_code text,
  p_context jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role text;
  v_has_override record;
  v_has_role_permission boolean;
  v_permission_def record;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM admin_roles
  WHERE user_id = p_user_id AND is_active = true
  LIMIT 1;

  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'User has no active role',
      'user_id', p_user_id,
      'permission', p_permission_code
    );
  END IF;

  -- Get permission definition
  SELECT * INTO v_permission_def
  FROM permission_definitions
  WHERE permission_code = p_permission_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Permission not found or inactive',
      'permission', p_permission_code
    );
  END IF;

  -- Check for user-specific override (deny takes precedence)
  SELECT * INTO v_has_override
  FROM user_permission_overrides
  WHERE user_id = p_user_id
    AND permission_code = p_permission_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF FOUND THEN
    IF v_has_override.override_type = 'deny' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Permission explicitly denied for user',
        'override_reason', v_has_override.reason
      );
    ELSIF v_has_override.override_type = 'grant' THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'Permission explicitly granted to user',
        'role', v_user_role,
        'requires_2fa', v_permission_def.requires_2fa,
        'risk_level', v_permission_def.risk_level
      );
    END IF;
  END IF;

  -- Check role-based permission
  SELECT EXISTS (
    SELECT 1 FROM role_permissions
    WHERE role_name = v_user_role
      AND permission_code = p_permission_code
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_role_permission;

  IF v_has_role_permission THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Permission granted via role',
      'role', v_user_role,
      'requires_2fa', v_permission_def.requires_2fa,
      'risk_level', v_permission_def.risk_level
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'Permission not granted to role',
    'role', v_user_role,
    'permission', p_permission_code
  );
END;
$$;

-- ============================================================================
-- 4. BATCH QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Optimized batch investor lookup
CREATE OR REPLACE FUNCTION get_investor_positions_batch(
  p_fund_id uuid,
  p_min_value numeric DEFAULT 0,
  p_limit int DEFAULT 1000,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  investor_id uuid,
  full_name text,
  email text,
  current_units numeric,
  current_value numeric,
  total_invested numeric,
  total_yield_earned numeric,
  fee_structure_id uuid,
  fee_override_pct numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ip.investor_id,
    p.full_name,
    p.email,
    ip.current_units,
    ip.current_value,
    ip.total_invested,
    ip.total_yield_earned,
    ifs.fee_structure_id,
    ifs.fee_override_pct
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id 
    AND ifs.fund_id = ip.fund_id
    AND ifs.effective_date <= CURRENT_DATE
    AND (ifs.end_date IS NULL OR ifs.end_date >= CURRENT_DATE)
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value >= p_min_value
    AND p.account_type != 'fees_account'
  ORDER BY ip.current_value DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Optimized distribution history lookup
CREATE OR REPLACE FUNCTION get_distribution_history(
  p_fund_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  distribution_id uuid,
  effective_date date,
  gross_yield numeric,
  net_yield numeric,
  total_fees numeric,
  total_ib numeric,
  investor_count int,
  opening_aum numeric,
  closing_aum numeric,
  daily_yield_pct numeric,
  status text,
  applied_by_name text,
  applied_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    yd.id AS distribution_id,
    yd.effective_date,
    yd.gross_yield,
    yd.net_yield,
    yd.total_fees,
    yd.total_ib,
    yd.investor_count,
    yd.opening_aum,
    yd.closing_aum,
    CASE 
      WHEN yd.opening_aum > 0 
      THEN ROUND((yd.net_yield / yd.opening_aum * 100)::numeric, 6)
      ELSE 0 
    END AS daily_yield_pct,
    yd.status,
    p.full_name AS applied_by_name,
    yd.applied_at
  FROM yield_distributions yd
  LEFT JOIN profiles p ON p.id = yd.applied_by
  WHERE yd.fund_id = p_fund_id
    AND yd.voided_at IS NULL
    AND (p_start_date IS NULL OR yd.effective_date >= p_start_date)
    AND (p_end_date IS NULL OR yd.effective_date <= p_end_date)
  ORDER BY yd.effective_date DESC
  LIMIT p_limit;
$$;

-- ============================================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE yield_reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reconciliation results"
  ON yield_reconciliation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can create reconciliation results"
  ON yield_reconciliation_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can update reconciliation results"
  ON yield_reconciliation_results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Anyone can view permission definitions"
  ON permission_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only super admins can modify permission definitions"
  ON permission_definitions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'admin' AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can view role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Only admins can manage role permissions"
  ON role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'admin' AND ar.is_active = true
    )
  );

CREATE POLICY "Users can view own permission overrides"
  ON user_permission_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_roles ar
    WHERE ar.user_id = auth.uid() AND ar.is_active = true
  ));

CREATE POLICY "Only admins can manage permission overrides"
  ON user_permission_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'admin' AND ar.is_active = true
    )
  );

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_fund_daily_performance IS 'Denormalized fund performance data for fast reporting';
COMMENT ON MATERIALIZED VIEW mv_investor_portfolio_summary IS 'Pre-computed investor portfolio summary for dashboards';
COMMENT ON TABLE yield_reconciliation_results IS 'Results from multi-period yield reconciliation checks';
COMMENT ON TABLE permission_definitions IS 'Centralized permission definitions for RBAC';
COMMENT ON TABLE role_permissions IS 'Role to permission mappings';
COMMENT ON TABLE user_permission_overrides IS 'User-specific permission grants or denials';
COMMENT ON FUNCTION reconcile_yield_period IS 'Comprehensive yield reconciliation for a date range';
COMMENT ON FUNCTION check_permission IS 'Check if user has specific permission with context';
