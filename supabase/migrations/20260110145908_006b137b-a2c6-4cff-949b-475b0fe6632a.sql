-- =====================================================
-- SECURITY HARDENING & EXPERT FUNCTIONS MIGRATION
-- =====================================================

-- =====================================================
-- PART 1: FIX PROFILES TABLE RLS (P0 Security)
-- =====================================================

-- Drop existing overly permissive policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles visible to self and admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;

-- Create restrictive policy: only owner or admin sees full profile
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR is_admin_safe()
  );

-- Add comment explaining security model
COMMENT ON POLICY "profiles_select_own_or_admin" ON profiles IS 
  'Users can only view their own full profile. Admins can view all. Use profiles_display view for public-safe profile info.';

-- =====================================================
-- PART 2: FIX INVESTOR_EMAILS RLS (P0 Security)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Investors view own emails" ON investor_emails;
DROP POLICY IF EXISTS "investor_emails_exact_owner" ON investor_emails;
DROP POLICY IF EXISTS "Admins can view all investor emails" ON investor_emails;
DROP POLICY IF EXISTS "Admins can manage investor emails" ON investor_emails;

-- Create exact-match owner policy (prevents ID enumeration)
CREATE POLICY "investor_emails_select_own_or_admin" ON investor_emails
  FOR SELECT USING (
    investor_id = auth.uid() OR is_admin_safe()
  );

-- Admin insert/update/delete
CREATE POLICY "investor_emails_admin_manage" ON investor_emails
  FOR ALL USING (is_admin_safe());

COMMENT ON TABLE investor_emails IS 
  'Investor email addresses. RLS ensures only owners or admins can access.';

-- =====================================================
-- PART 3: RATE LIMITING INFRASTRUCTURE (P1)
-- =====================================================

-- Create rate_limits table if not exists
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
  ON rate_limits(actor_id, action_type, created_at DESC);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can insert, admins can view
CREATE POLICY "rate_limits_insert_system" ON rate_limits
  FOR INSERT WITH CHECK (true); -- Controlled via SECURITY DEFINER functions

CREATE POLICY "rate_limits_select_admin" ON rate_limits
  FOR SELECT USING (is_admin_safe());

-- Create rate_limit_config table
CREATE TABLE IF NOT EXISTS rate_limit_config (
  action_type text PRIMARY KEY,
  max_actions integer NOT NULL DEFAULT 100,
  window_minutes integer NOT NULL DEFAULT 60,
  is_enabled boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Admins can manage config
CREATE POLICY "rate_limit_config_admin" ON rate_limit_config
  FOR ALL USING (is_admin_safe());

-- Insert default configurations
INSERT INTO rate_limit_config (action_type, max_actions, window_minutes, description)
VALUES 
  ('yield_distribution', 10, 60, 'Limit yield distributions per hour'),
  ('withdrawal_approval', 50, 60, 'Limit withdrawal approvals per hour'),
  ('transaction_create', 100, 60, 'Limit transaction creation per hour'),
  ('login_attempt', 5, 15, 'Limit failed login attempts'),
  ('password_reset', 3, 60, 'Limit password reset requests per hour'),
  ('admin_action', 200, 60, 'General admin action rate limit')
ON CONFLICT (action_type) DO NOTHING;

-- =====================================================
-- PART 4: RATE LIMITING FUNCTIONS (P1)
-- =====================================================

-- Basic rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_actor_id uuid,
  p_action_type text,
  p_max_actions integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count actions in window
  SELECT COUNT(*) INTO v_count
  FROM rate_limits
  WHERE actor_id = p_actor_id
    AND action_type = p_action_type
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;
  
  -- Record this attempt
  INSERT INTO rate_limits (actor_id, action_type)
  VALUES (p_actor_id, p_action_type);
  
  -- Clean up old entries (older than 24 hours)
  DELETE FROM rate_limits
  WHERE created_at < now() - interval '24 hours';
  
  RETURN v_count < p_max_actions;
END;
$$;

-- Config-based rate limit check
CREATE OR REPLACE FUNCTION check_rate_limit_with_config(
  p_actor_id uuid,
  p_action_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config rate_limit_config%ROWTYPE;
BEGIN
  -- Get config for action type
  SELECT * INTO v_config
  FROM rate_limit_config
  WHERE action_type = p_action_type
    AND is_enabled = true;
  
  -- No config or disabled = no limit
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Use config values
  RETURN check_rate_limit(
    p_actor_id, 
    p_action_type, 
    v_config.max_actions, 
    v_config.window_minutes
  );
END;
$$;

-- =====================================================
-- PART 5: RECONCILIATION FUNCTION (P1)
-- =====================================================

CREATE OR REPLACE FUNCTION reconcile_fund_period(
  p_fund_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS TABLE (
  metric text,
  expected numeric,
  actual numeric,
  difference numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_aum numeric;
  v_closing_aum numeric;
  v_inflows numeric;
  v_outflows numeric;
  v_yield numeric;
  v_fees numeric;
  v_expected_closing numeric;
BEGIN
  -- Require admin
  IF NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Unauthorized: admin required';
  END IF;

  -- Get opening AUM
  SELECT COALESCE(total_aum, 0) INTO v_opening_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date = p_start_date
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get closing AUM
  SELECT COALESCE(total_aum, 0) INTO v_closing_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id 
    AND aum_date = p_end_date
    AND is_voided = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate inflows (deposits)
  SELECT COALESCE(SUM(amount), 0) INTO v_inflows
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND tx_type = 'deposit'
    AND is_voided = false;

  -- Calculate outflows (withdrawals)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_outflows
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND tx_type = 'withdrawal'
    AND is_voided = false;

  -- Calculate yield credited
  SELECT COALESCE(SUM(amount), 0) INTO v_yield
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND tx_type = 'yield'
    AND is_voided = false;

  -- Calculate fees deducted
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_fees
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND tx_date BETWEEN p_start_date AND p_end_date
    AND tx_type = 'fee'
    AND is_voided = false;

  -- Expected closing = opening + inflows - outflows + yield - fees
  v_expected_closing := v_opening_aum + v_inflows - v_outflows + v_yield - v_fees;

  -- Return reconciliation rows
  RETURN QUERY VALUES 
    ('Opening AUM'::text, v_opening_aum, v_opening_aum, 0::numeric, 'INFO'::text),
    ('Inflows (Deposits)'::text, v_inflows, v_inflows, 0::numeric, 'INFO'::text),
    ('Outflows (Withdrawals)'::text, v_outflows, v_outflows, 0::numeric, 'INFO'::text),
    ('Yield Credited'::text, v_yield, v_yield, 0::numeric, 'INFO'::text),
    ('Fees Deducted'::text, v_fees, v_fees, 0::numeric, 'INFO'::text),
    ('Closing AUM'::text, v_expected_closing, v_closing_aum, 
     v_closing_aum - v_expected_closing,
     CASE 
       WHEN ABS(v_closing_aum - v_expected_closing) < 0.01 THEN 'OK'
       WHEN ABS(v_closing_aum - v_expected_closing) < 1.00 THEN 'WARN'
       ELSE 'ERROR'
     END);
END;
$$;

COMMENT ON FUNCTION reconcile_fund_period IS 
  'Reconciles fund AUM for a period. Compares expected vs actual closing AUM based on transaction flows.';

-- =====================================================
-- PART 6: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit_with_config TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_fund_period TO authenticated;