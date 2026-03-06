-- ============================================================================
-- PHASE 1: EXPERT ENHANCEMENTS - CRITICAL ITEMS
-- Date: January 5, 2026
-- Focus: Performance, Audit Trail, Rate Limiting
-- ============================================================================

-- ============================================================================
-- 1. DATABASE QUERY OPTIMIZATION - COMPOSITE INDEXES
-- ============================================================================

-- Index for investor positions by fund with value (for yield distribution queries)
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund_value 
  ON investor_positions(fund_id, current_value DESC) 
  WHERE current_value > 0;

-- Index for yield distributions by fund and date (for historical queries)
CREATE INDEX IF NOT EXISTS idx_yield_distributions_fund_date 
  ON yield_distributions(fund_id, effective_date DESC, voided_at) 
  WHERE voided_at IS NULL;

-- Index for transactions by investor, fund, and date
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_fund_date 
  ON transactions_v2(investor_id, fund_id, value_date DESC, is_voided) 
  WHERE is_voided = false;

-- Index for fee allocations by distribution
CREATE INDEX IF NOT EXISTS idx_fee_allocations_distribution 
  ON fee_allocations(distribution_id, is_voided) 
  WHERE is_voided = false;

-- Index for IB allocations by distribution
CREATE INDEX IF NOT EXISTS idx_ib_allocations_distribution 
  ON ib_allocations(distribution_id, is_voided) 
  WHERE is_voided = false;

-- Partial index for active positions only (fast lookup)
CREATE INDEX IF NOT EXISTS idx_investor_positions_active 
  ON investor_positions(fund_id, investor_id) 
  WHERE current_value > 0;

-- Index for investor fee schedule lookups
CREATE INDEX IF NOT EXISTS idx_investor_fee_schedule_lookup
  ON investor_fee_schedule(investor_id, fund_id, effective_date DESC, end_date);

-- Index for profiles by IB parent (for IB allocation queries)
CREATE INDEX IF NOT EXISTS idx_profiles_ib_parent
  ON profiles(ib_parent_id)
  WHERE ib_parent_id IS NOT NULL;

-- Index for profiles by account type (to exclude fees_account quickly)
CREATE INDEX IF NOT EXISTS idx_profiles_account_type
  ON profiles(account_type);

-- ============================================================================
-- 2. COMPREHENSIVE AUDIT TRAIL
-- ============================================================================

-- Enhanced audit log table for complete system visibility
CREATE TABLE IF NOT EXISTS system_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'yield_distribution', 'deposit', 'withdrawal', 'void', etc.
  event_category text NOT NULL, -- 'financial', 'admin', 'security', 'system'
  actor_id uuid REFERENCES auth.users(id),
  actor_type text, -- 'admin', 'system', 'api'
  target_type text, -- 'fund', 'investor', 'transaction', 'distribution'
  target_id uuid,
  action text NOT NULL, -- 'create', 'update', 'delete', 'void', 'approve', 'preview'
  details jsonb,
  ip_address inet,
  user_agent text,
  request_id text, -- For tracing requests across services
  execution_time_ms numeric,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_system_audit_log_event_type 
  ON system_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_actor 
  ON system_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_target 
  ON system_audit_log(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_request 
  ON system_audit_log(request_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_log_created 
  ON system_audit_log(created_at DESC);

-- Audit helper function to log events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type text,
  p_event_category text,
  p_actor_id uuid,
  p_actor_type text,
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_details jsonb DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_execution_time_ms numeric DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO system_audit_log (
    event_type, event_category, actor_id, actor_type,
    target_type, target_id, action, details, request_id,
    execution_time_ms, success, error_message
  ) VALUES (
    p_event_type, p_event_category, p_actor_id, p_actor_type,
    p_target_type, p_target_id, p_action, p_details, p_request_id,
    p_execution_time_ms, p_success, p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger function for automatic yield distribution auditing
CREATE OR REPLACE FUNCTION audit_yield_distribution_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor_id uuid;
  v_action text;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.voided_at IS NOT NULL AND OLD.voided_at IS NULL THEN
      v_action := 'void';
    ELSIF NEW.status != OLD.status THEN
      v_action := 'status_change';
    ELSE
      v_action := 'update';
    END IF;
  END IF;
  
  -- Get actor from applied_by or created_by
  v_actor_id := COALESCE(NEW.applied_by, NEW.created_by);
  
  INSERT INTO system_audit_log (
    event_type, event_category, actor_id, actor_type,
    target_type, target_id, action, details, success
  ) VALUES (
    'yield_distribution', 'financial', v_actor_id, 'admin',
    'distribution', NEW.id, v_action,
    jsonb_build_object(
      'fund_id', NEW.fund_id,
      'effective_date', NEW.effective_date,
      'gross_yield', NEW.gross_yield,
      'net_yield', NEW.net_yield,
      'total_fees', NEW.total_fees,
      'total_ib', NEW.total_ib,
      'investor_count', NEW.investor_count,
      'status', NEW.status,
      'opening_aum', NEW.opening_aum,
      'closing_aum', NEW.closing_aum
    ),
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for yield distributions
DROP TRIGGER IF EXISTS audit_yield_distribution ON yield_distributions;
CREATE TRIGGER audit_yield_distribution
  AFTER INSERT OR UPDATE ON yield_distributions
  FOR EACH ROW
  EXECUTE FUNCTION audit_yield_distribution_trigger();

-- Trigger function for transaction auditing
CREATE OR REPLACE FUNCTION audit_transaction_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_voided = true AND OLD.is_voided = false THEN
      v_action := 'void';
    ELSE
      v_action := 'update';
    END IF;
  END IF;
  
  INSERT INTO system_audit_log (
    event_type, event_category, actor_id, actor_type,
    target_type, target_id, action, details, success
  ) VALUES (
    LOWER(NEW.type), 'financial', NEW.created_by, 'admin',
    'transaction', NEW.id, v_action,
    jsonb_build_object(
      'investor_id', NEW.investor_id,
      'fund_id', NEW.fund_id,
      'type', NEW.type,
      'amount', NEW.amount,
      'value_date', NEW.value_date,
      'is_voided', NEW.is_voided
    ),
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for transactions
DROP TRIGGER IF EXISTS audit_transaction ON transactions_v2;
CREATE TRIGGER audit_transaction
  AFTER INSERT OR UPDATE ON transactions_v2
  FOR EACH ROW
  EXECUTE FUNCTION audit_transaction_trigger();

-- ============================================================================
-- 3. RATE LIMITING & ABUSE PREVENTION
-- ============================================================================

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action_type text NOT NULL, -- 'yield_distribution', 'deposit', 'withdrawal', 'void'
  action_count int DEFAULT 1,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_actor_action 
  ON rate_limits(actor_id, action_type, window_start DESC);

-- Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_actor_id uuid,
  p_action_type text,
  p_max_actions int DEFAULT 10,
  p_window_minutes int DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_remaining int;
BEGIN
  -- Calculate current window
  v_window_start := date_trunc('hour', now()) + 
    (EXTRACT(minute FROM now())::int / p_window_minutes) * 
    (p_window_minutes || ' minutes')::interval;
  v_window_end := v_window_start + (p_window_minutes || ' minutes')::interval;
  
  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO v_count
  FROM rate_limits
  WHERE actor_id = p_actor_id
    AND action_type = p_action_type
    AND window_start >= v_window_start;
  
  v_remaining := p_max_actions - v_count;
  
  IF v_count >= p_max_actions THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_allowed', p_max_actions,
      'remaining', 0,
      'reset_at', v_window_end,
      'message', format('Rate limit exceeded. Max %s actions per %s minutes. Resets at %s', 
                        p_max_actions, p_window_minutes, v_window_end)
    );
  END IF;
  
  -- Record this action
  INSERT INTO rate_limits (actor_id, action_type, window_start, window_end, action_count)
  VALUES (p_actor_id, p_action_type, v_window_start, v_window_end, 1)
  ON CONFLICT DO NOTHING;
  
  -- Update count if record exists
  UPDATE rate_limits
  SET action_count = action_count + 1
  WHERE actor_id = p_actor_id
    AND action_type = p_action_type
    AND window_start = v_window_start;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'max_allowed', p_max_actions,
    'remaining', v_remaining - 1,
    'reset_at', v_window_end
  );
END;
$$;

-- Rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text UNIQUE NOT NULL,
  max_actions int NOT NULL DEFAULT 10,
  window_minutes int NOT NULL DEFAULT 60,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default rate limits
INSERT INTO rate_limit_config (action_type, max_actions, window_minutes, description) VALUES
  ('yield_distribution', 5, 60, 'Yield distributions per hour'),
  ('deposit', 20, 60, 'Deposits per hour'),
  ('withdrawal', 20, 60, 'Withdrawals per hour'),
  ('void_transaction', 10, 60, 'Void operations per hour'),
  ('void_distribution', 3, 60, 'Distribution voids per hour')
ON CONFLICT (action_type) DO UPDATE SET
  max_actions = EXCLUDED.max_actions,
  window_minutes = EXCLUDED.window_minutes,
  description = EXCLUDED.description,
  updated_at = now();

-- Function to check rate limit using config
CREATE OR REPLACE FUNCTION check_action_rate_limit(
  p_actor_id uuid,
  p_action_type text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_config record;
BEGIN
  -- Get config for action type
  SELECT * INTO v_config
  FROM rate_limit_config
  WHERE action_type = p_action_type AND is_active = true;
  
  -- If no config, allow by default
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'message', 'No rate limit configured');
  END IF;
  
  -- Check rate limit
  RETURN check_rate_limit(p_actor_id, p_action_type, v_config.max_actions, v_config.window_minutes);
END;
$$;

-- ============================================================================
-- 4. PERFORMANCE METRICS TABLE
-- ============================================================================

-- Performance metrics for monitoring function execution
CREATE TABLE IF NOT EXISTS function_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  execution_start timestamptz NOT NULL,
  execution_end timestamptz,
  duration_ms numeric,
  fund_id uuid REFERENCES funds(id),
  investor_count int,
  parameters jsonb,
  result_status text, -- 'success', 'error', 'warning'
  error_message text,
  rows_processed int,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_function_performance_function 
  ON function_performance_metrics(function_name, execution_start DESC);
CREATE INDEX IF NOT EXISTS idx_function_performance_duration 
  ON function_performance_metrics(duration_ms DESC) 
  WHERE duration_ms > 1000;
CREATE INDEX IF NOT EXISTS idx_function_performance_errors
  ON function_performance_metrics(result_status, execution_start DESC)
  WHERE result_status = 'error';

-- Function to record performance metrics
CREATE OR REPLACE FUNCTION record_performance_metric(
  p_function_name text,
  p_execution_start timestamptz,
  p_execution_end timestamptz,
  p_fund_id uuid DEFAULT NULL,
  p_investor_count int DEFAULT NULL,
  p_parameters jsonb DEFAULT NULL,
  p_result_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL,
  p_rows_processed int DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id uuid;
  v_duration_ms numeric;
BEGIN
  v_duration_ms := EXTRACT(EPOCH FROM (p_execution_end - p_execution_start)) * 1000;
  
  INSERT INTO function_performance_metrics (
    function_name, execution_start, execution_end, duration_ms,
    fund_id, investor_count, parameters, result_status, 
    error_message, rows_processed, created_by
  ) VALUES (
    p_function_name, p_execution_start, p_execution_end, v_duration_ms,
    p_fund_id, p_investor_count, p_parameters, p_result_status,
    p_error_message, p_rows_processed, p_created_by
  )
  RETURNING id INTO v_metric_id;
  
  RETURN v_metric_id;
END;
$$;

-- ============================================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE system_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Audit log policies (admins only)
CREATE POLICY "Admins can view audit logs"
  ON system_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Rate limits policies
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Rate limit config policies (admins only)
CREATE POLICY "Admins can manage rate limit config"
  ON rate_limit_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Performance metrics policies (admins only)
CREATE POLICY "Admins can view performance metrics"
  ON function_performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "System can insert performance metrics"
  ON function_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 6. CLEANUP OLD RATE LIMITS (Scheduled task helper)
-- ============================================================================

-- Function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits(p_older_than_hours int DEFAULT 24)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM rate_limits
  WHERE window_end < now() - (p_older_than_hours || ' hours')::interval;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Log the cleanup
  PERFORM log_audit_event(
    'rate_limit_cleanup', 'system', NULL, 'system',
    NULL, NULL, 'cleanup',
    jsonb_build_object('deleted_count', v_deleted, 'older_than_hours', p_older_than_hours)
  );
  
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- PHASE 1 COMPLETE
-- ============================================================================

COMMENT ON TABLE system_audit_log IS 'Comprehensive audit trail for all system operations';
COMMENT ON TABLE rate_limits IS 'Rate limiting tracking for abuse prevention';
COMMENT ON TABLE rate_limit_config IS 'Configuration for rate limiting thresholds';
COMMENT ON TABLE function_performance_metrics IS 'Performance metrics for monitoring critical functions';
