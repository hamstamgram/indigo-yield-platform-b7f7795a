-- ============================================================================
-- PHASE 4: EXPERT ENHANCEMENTS - FUTURE / LOW PRIORITY ITEMS
-- Date: January 5, 2026
-- Focus: Type-safe RPC, API Docs, Multi-currency, Advanced Fees
-- ============================================================================

-- ============================================================================
-- 1. TYPE-SAFE RPC WRAPPER FUNCTIONS
-- ============================================================================

-- Strongly typed response wrapper
CREATE TYPE api_response AS (
  success boolean,
  data jsonb,
  error_code text,
  error_message text,
  request_id text,
  execution_time_ms numeric
);

-- Generic API wrapper function
CREATE OR REPLACE FUNCTION api_call(
  p_function_name text,
  p_params jsonb DEFAULT '{}'::jsonb
)
RETURNS api_response
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result api_response;
  v_start timestamptz;
  v_request_id text;
  v_data jsonb;
BEGIN
  v_start := clock_timestamp();
  v_request_id := gen_random_uuid()::text;
  
  BEGIN
    -- Dynamic function call based on name
    CASE p_function_name
      WHEN 'health_check' THEN
        v_data := perform_system_health_check();
      WHEN 'refresh_views' THEN
        v_data := refresh_reporting_views(COALESCE((p_params->>'concurrent')::boolean, true));
      WHEN 'project_yield' THEN
        v_data := project_yield(
          (p_params->>'fund_id')::uuid,
          COALESCE((p_params->>'horizon_days')::int, 30),
          COALESCE(p_params->>'method', 'historical_average'),
          COALESCE((p_params->>'lookback_days')::int, 90)
        );
      WHEN 'reconcile_period' THEN
        v_data := reconcile_yield_period(
          (p_params->>'fund_id')::uuid,
          (p_params->>'start_date')::date,
          (p_params->>'end_date')::date,
          (p_params->>'created_by')::uuid
        );
      ELSE
        RAISE EXCEPTION 'Unknown function: %', p_function_name;
    END CASE;
    
    v_result := (
      true,
      v_data,
      NULL,
      NULL,
      v_request_id,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000
    );
    
  EXCEPTION WHEN OTHERS THEN
    v_result := (
      false,
      NULL,
      SQLSTATE,
      SQLERRM,
      v_request_id,
      EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000
    );
  END;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- 2. MULTI-CURRENCY SUPPORT FOUNDATION
-- ============================================================================

-- Currency definitions
CREATE TABLE IF NOT EXISTS currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places int DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Exchange rates history
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL REFERENCES currencies(code),
  to_currency text NOT NULL REFERENCES currencies(code),
  rate numeric NOT NULL,
  effective_date date NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
  ON exchange_rates(from_currency, to_currency, effective_date DESC);

-- Seed common currencies
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
  ('USD', 'US Dollar', '$', 2),
  ('EUR', 'Euro', '€', 2),
  ('GBP', 'British Pound', '£', 2),
  ('CHF', 'Swiss Franc', 'CHF', 2),
  ('JPY', 'Japanese Yen', '¥', 0),
  ('SGD', 'Singapore Dollar', 'S$', 2),
  ('HKD', 'Hong Kong Dollar', 'HK$', 2),
  ('AUD', 'Australian Dollar', 'A$', 2),
  ('CAD', 'Canadian Dollar', 'C$', 2),
  ('CNY', 'Chinese Yuan', '¥', 2)
ON CONFLICT (code) DO NOTHING;

-- Get exchange rate function
CREATE OR REPLACE FUNCTION get_exchange_rate(
  p_from_currency text,
  p_to_currency text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
$$;

-- Convert currency amount
CREATE OR REPLACE FUNCTION convert_currency(
  p_amount numeric,
  p_from_currency text,
  p_to_currency text,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rate numeric;
  v_converted numeric;
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN jsonb_build_object(
      'amount', p_amount,
      'currency', p_to_currency,
      'rate', 1,
      'date', p_date
    );
  END IF;

  v_rate := get_exchange_rate(p_from_currency, p_to_currency, p_date);
  
  IF v_rate IS NULL THEN
    -- Try reverse rate
    v_rate := get_exchange_rate(p_to_currency, p_from_currency, p_date);
    IF v_rate IS NOT NULL AND v_rate != 0 THEN
      v_rate := 1 / v_rate;
    ELSE
      RETURN jsonb_build_object(
        'error', 'Exchange rate not found',
        'from', p_from_currency,
        'to', p_to_currency,
        'date', p_date
      );
    END IF;
  END IF;

  v_converted := ROUND(p_amount * v_rate, 2);
  
  RETURN jsonb_build_object(
    'original_amount', p_amount,
    'original_currency', p_from_currency,
    'converted_amount', v_converted,
    'target_currency', p_to_currency,
    'rate', v_rate,
    'date', p_date
  );
END;
$$;

-- ============================================================================
-- 3. ADVANCED FEE STRUCTURES
-- ============================================================================

-- Fee structure templates
CREATE TABLE IF NOT EXISTS fee_structure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text UNIQUE NOT NULL,
  description text,
  fee_type text NOT NULL,
  calculation_method text NOT NULL,
  base_rate numeric,
  tiers jsonb,
  high_water_mark boolean DEFAULT false,
  hurdle_rate numeric,
  clawback_enabled boolean DEFAULT false,
  accrual_frequency text DEFAULT 'daily',
  payment_frequency text DEFAULT 'monthly',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fee calculation history
CREATE TABLE IF NOT EXISTS fee_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES profiles(id),
  fund_id uuid REFERENCES funds(id),
  fee_type text NOT NULL,
  calculation_date date NOT NULL,
  aum_basis numeric,
  gross_return numeric,
  net_return numeric,
  fee_amount numeric NOT NULL,
  calculation_details jsonb,
  distribution_id uuid REFERENCES yield_distributions(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_calculations_investor 
  ON fee_calculations(investor_id, fund_id, calculation_date DESC);

-- Seed fee structure templates
INSERT INTO fee_structure_templates (
  template_name, description, fee_type, calculation_method, base_rate, tiers
) VALUES
  ('standard_management', 'Standard management fee', 'management', 'flat_rate', 0.01, NULL),
  ('tiered_management', 'Tiered management fee based on AUM', 'management', 'tiered',
   NULL, '[
     {"min": 0, "max": 1000000, "rate": 0.015},
     {"min": 1000000, "max": 5000000, "rate": 0.0125},
     {"min": 5000000, "max": null, "rate": 0.01}
   ]'::jsonb),
  ('performance_20', 'Standard 20% performance fee', 'performance', 'percentage', 0.20, NULL),
  ('performance_hwm', 'Performance fee with high water mark', 'performance', 'hwm_percentage', 0.20, NULL)
ON CONFLICT (template_name) DO NOTHING;

-- Calculate tiered fee
CREATE OR REPLACE FUNCTION calculate_tiered_fee(
  p_aum numeric,
  p_tiers jsonb
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_tier record;
  v_fee numeric := 0;
  v_remaining numeric := p_aum;
  v_tier_amount numeric;
  v_tier_max numeric;
BEGIN
  FOR v_tier IN 
    SELECT * FROM jsonb_to_recordset(p_tiers) AS x(min numeric, max numeric, rate numeric)
    ORDER BY min
  LOOP
    IF v_remaining <= 0 THEN
      EXIT;
    END IF;
    
    v_tier_max := COALESCE(v_tier.max, v_remaining + v_tier.min);
    v_tier_amount := LEAST(v_remaining, v_tier_max - v_tier.min);
    
    IF v_tier_amount > 0 THEN
      v_fee := v_fee + (v_tier_amount * v_tier.rate);
      v_remaining := v_remaining - v_tier_amount;
    END IF;
  END LOOP;
  
  RETURN v_fee;
END;
$$;

-- ============================================================================
-- 4. INVESTOR COMMUNICATION TEMPLATES
-- ============================================================================

-- Communication templates
CREATE TABLE IF NOT EXISTS communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text UNIQUE NOT NULL,
  template_name text NOT NULL,
  template_type text NOT NULL,
  subject_template text,
  body_template text NOT NULL,
  variables jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Communication log
CREATE TABLE IF NOT EXISTS communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES profiles(id),
  template_code text REFERENCES communication_templates(template_code),
  channel text NOT NULL,
  subject text,
  body text,
  variables_used jsonb,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_communication_log_investor 
  ON communication_log(investor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_log_status 
  ON communication_log(status, created_at DESC);

-- Seed communication templates
INSERT INTO communication_templates (
  template_code, template_name, template_type, subject_template, body_template, variables
) VALUES
  ('yield_notification', 'Yield Distribution Notification', 'email',
   'Yield Distribution - {{fund_name}} - {{effective_date}}',
   'Dear {{investor_name}},

We are pleased to inform you that a yield distribution has been applied to your investment in {{fund_name}}.

Distribution Details:
- Effective Date: {{effective_date}}
- Your Yield: {{investor_yield}}
- New Balance: {{new_balance}}

Thank you for your continued investment.

Best regards,
Investment Team',
   '["investor_name", "fund_name", "effective_date", "investor_yield", "new_balance"]'::jsonb),
   
  ('deposit_confirmation', 'Deposit Confirmation', 'email',
   'Deposit Confirmed - {{fund_name}}',
   'Dear {{investor_name}},

Your deposit has been processed successfully.

Transaction Details:
- Amount: {{amount}}
- Fund: {{fund_name}}
- Value Date: {{value_date}}
- New Balance: {{new_balance}}

Thank you for your investment.

Best regards,
Investment Team',
   '["investor_name", "fund_name", "amount", "value_date", "new_balance"]'::jsonb),
   
  ('monthly_statement', 'Monthly Statement', 'email',
   'Monthly Investment Statement - {{month}} {{year}}',
   'Dear {{investor_name}},

Please find attached your monthly investment statement for {{month}} {{year}}.

Summary:
- Opening Balance: {{opening_balance}}
- Deposits: {{total_deposits}}
- Redemptions: {{total_redemptions}}
- Yield Earned: {{total_yield}}
- Closing Balance: {{closing_balance}}

Best regards,
Investment Team',
   '["investor_name", "month", "year", "opening_balance", "total_deposits", "total_redemptions", "total_yield", "closing_balance"]'::jsonb)
ON CONFLICT (template_code) DO NOTHING;

-- Render template function
CREATE OR REPLACE FUNCTION render_communication_template(
  p_template_code text,
  p_variables jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_template record;
  v_subject text;
  v_body text;
  v_key text;
  v_value text;
BEGIN
  SELECT * INTO v_template
  FROM communication_templates
  WHERE template_code = p_template_code AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Template not found');
  END IF;
  
  v_subject := v_template.subject_template;
  v_body := v_template.body_template;
  
  -- Replace variables
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', COALESCE(v_value, ''));
    v_body := REPLACE(v_body, '{{' || v_key || '}}', COALESCE(v_value, ''));
  END LOOP;
  
  RETURN jsonb_build_object(
    'template_code', p_template_code,
    'template_type', v_template.template_type,
    'subject', v_subject,
    'body', v_body
  );
END;
$$;

-- ============================================================================
-- 5. SCHEDULED JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text UNIQUE NOT NULL,
  job_type text NOT NULL,
  schedule_cron text NOT NULL,
  function_name text NOT NULL,
  function_params jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  last_run_duration_ms numeric,
  last_run_result jsonb,
  next_run_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed scheduled jobs
INSERT INTO scheduled_jobs (job_name, job_type, schedule_cron, function_name, function_params) VALUES
  ('daily_view_refresh', 'maintenance', '0 2 * * *', 'refresh_reporting_views', '{"concurrent": true}'::jsonb),
  ('hourly_health_check', 'monitoring', '0 * * * *', 'perform_system_health_check', NULL),
  ('daily_rate_limit_cleanup', 'maintenance', '0 3 * * *', 'cleanup_old_rate_limits', '{"older_than_hours": 48}'::jsonb),
  ('weekly_reconciliation', 'validation', '0 4 * * 0', 'reconcile_yield_period', NULL)
ON CONFLICT (job_name) DO NOTHING;

-- ============================================================================
-- 6. API DOCUMENTATION SCHEMA
-- ============================================================================

-- API endpoints documentation
CREATE TABLE IF NOT EXISTS api_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text UNIQUE NOT NULL,
  description text,
  category text,
  http_method text DEFAULT 'POST',
  request_schema jsonb,
  response_schema jsonb,
  example_request jsonb,
  example_response jsonb,
  auth_required boolean DEFAULT true,
  permissions_required text[],
  rate_limit_key text,
  deprecated boolean DEFAULT false,
  deprecated_message text,
  version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed API documentation
INSERT INTO api_documentation (
  function_name, description, category, request_schema, response_schema, permissions_required
) VALUES
  ('perform_system_health_check', 'Comprehensive system health check', 'monitoring',
   '{"type": "object", "properties": {}}'::jsonb,
   '{"type": "object", "properties": {"overall_status": {"type": "string"}, "checks": {"type": "object"}}}'::jsonb,
   ARRAY['admin.settings']),
   
  ('project_yield', 'Project future yields based on historical data', 'analytics',
   '{"type": "object", "required": ["fund_id"], "properties": {"fund_id": {"type": "string"}, "horizon_days": {"type": "integer"}, "method": {"type": "string"}}}'::jsonb,
   '{"type": "object", "properties": {"success": {"type": "boolean"}, "projected_total_yield": {"type": "number"}}}'::jsonb,
   ARRAY['yield.view']),
   
  ('reconcile_yield_period', 'Reconcile yields for a date range', 'validation',
   '{"type": "object", "required": ["fund_id", "start_date", "end_date"], "properties": {"fund_id": {"type": "string"}, "start_date": {"type": "string"}, "end_date": {"type": "string"}}}'::jsonb,
   '{"type": "object", "properties": {"success": {"type": "boolean"}, "status": {"type": "string"}, "discrepancies": {"type": "array"}}}'::jsonb,
   ARRAY['yield.view', 'report.sensitive'])
ON CONFLICT (function_name) DO NOTHING;

-- ============================================================================
-- 7. RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structure_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_documentation ENABLE ROW LEVEL SECURITY;

-- Currencies - publicly readable
CREATE POLICY "Anyone can view currencies"
  ON currencies FOR SELECT
  TO authenticated
  USING (true);

-- Exchange rates - publicly readable
CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage exchange rates"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Fee structure templates
CREATE POLICY "Admins can manage fee templates"
  ON fee_structure_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Fee calculations
CREATE POLICY "Admins can view fee calculations"
  ON fee_calculations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Communication templates
CREATE POLICY "Admins can manage communication templates"
  ON communication_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Communication log
CREATE POLICY "Admins can view communication log"
  ON communication_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

CREATE POLICY "Admins can create communication log entries"
  ON communication_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.is_active = true
    )
  );

-- Scheduled jobs
CREATE POLICY "Admins can manage scheduled jobs"
  ON scheduled_jobs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'admin' AND ar.is_active = true
    )
  );

-- API documentation - publicly readable
CREATE POLICY "Anyone can view API documentation"
  ON api_documentation FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage API documentation"
  ON api_documentation FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'admin' AND ar.is_active = true
    )
  );

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TYPE api_response IS 'Standardized API response type for RPC functions';
COMMENT ON TABLE currencies IS 'Supported currencies for multi-currency operations';
COMMENT ON TABLE exchange_rates IS 'Historical exchange rates for currency conversion';
COMMENT ON TABLE fee_structure_templates IS 'Reusable fee structure templates';
COMMENT ON TABLE fee_calculations IS 'Historical record of fee calculations';
COMMENT ON TABLE communication_templates IS 'Email and notification templates';
COMMENT ON TABLE communication_log IS 'Log of all investor communications';
COMMENT ON TABLE scheduled_jobs IS 'Configuration for scheduled background jobs';
COMMENT ON TABLE api_documentation IS 'Self-documenting API schema';
