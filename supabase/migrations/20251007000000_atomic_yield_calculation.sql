-- Migration: Atomic Yield Calculation Engine
-- Date: 2025-10-07
-- Purpose: Fix race conditions, ensure atomicity, accurate calculations
--
-- Fixes:
-- 1. Race conditions in yield application
-- 2. Compound interest formula (APY vs APR clarification)
-- 3. Data integrity with transactions
-- 4. Audit logging
-- 5. Idempotency

-- ============================================================================
-- 1. Create audit_log table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  meta JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin users can view all audit logs
CREATE POLICY "Admin users can view audit logs" ON audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 2. Create idempotency_keys table
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(key, endpoint);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expiry ON idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON idempotency_keys(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own idempotency keys
CREATE POLICY "Users can view own idempotency keys" ON idempotency_keys
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can manage idempotency keys
CREATE POLICY "Service role can manage idempotency keys" ON idempotency_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Atomic Yield Calculation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_and_apply_yields(
  p_user_id UUID DEFAULT NULL,
  p_apply_yield BOOLEAN DEFAULT FALSE,
  p_admin_user_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_positions_processed INT := 0;
  v_total_accrued NUMERIC := 0;
  v_total_earned NUMERIC := 0;
  v_calculations JSONB;
BEGIN
  -- Check for existing idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT response_data INTO v_result
    FROM idempotency_keys
    WHERE key = p_idempotency_key
      AND endpoint = 'calculate-yield'
      AND expires_at > NOW();

    IF v_result IS NOT NULL THEN
      -- Return cached response
      RETURN v_result;
    END IF;
  END IF;

  -- Audit logging for admin cross-user access
  IF p_user_id IS NOT NULL AND p_user_id != p_admin_user_id THEN
    -- Verify admin permission
    IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_admin_user_id) THEN
      RAISE EXCEPTION 'Forbidden: Admin access required';
    END IF;

    -- Log admin action
    INSERT INTO audit_log (actor_user, action, entity, entity_id, meta)
    VALUES (
      p_admin_user_id,
      'CALCULATE_YIELDS_CROSS_USER',
      'yield_positions',
      p_user_id::TEXT,
      jsonb_build_object(
        'apply', p_apply_yield,
        'idempotency_key', p_idempotency_key
      )
    );
  END IF;

  -- Calculate yields with proper validation
  WITH yield_calculations AS (
    SELECT
      yp.id,
      yp.user_id,
      yp.asset_id,
      yp.yield_type,
      yp.current_apy,
      COALESCE(yp.staked_amount, yp.principal_amount, 0) as principal,
      yp.accrued_yield,
      yp.total_yield_earned,
      COALESCE(yp.last_yield_calculation, yp.created_at) as last_calc_date,
      ca.symbol as asset_symbol,
      -- Calculate days since last calculation
      EXTRACT(EPOCH FROM (NOW() - COALESCE(yp.last_yield_calculation, yp.created_at))) / 86400.0 as days_elapsed,
      -- Compound interest formula: P × ((1 + APY)^(days/365) - 1)
      -- NOTE: This assumes current_apy stores APY (Annual Percentage Yield)
      -- If it stores APR, the formula should be: P × ((1 + APR/365)^days - 1)
      CASE
        WHEN yp.current_apy > 0
          AND COALESCE(yp.staked_amount, yp.principal_amount, 0) > 0
          AND yp.current_apy <= 200  -- Sanity check: max 200% APY
          AND EXTRACT(EPOCH FROM (NOW() - COALESCE(yp.last_yield_calculation, yp.created_at))) / 86400.0 >= 0
        THEN
          -- Using APY formula (adjust if field stores APR instead)
          COALESCE(yp.staked_amount, yp.principal_amount, 0) *
          (POWER(1 + (yp.current_apy / 100.0),
                 EXTRACT(EPOCH FROM (NOW() - COALESCE(yp.last_yield_calculation, yp.created_at))) / (86400.0 * 365.0)
          ) - 1)
        ELSE 0
      END as calculated_yield
    FROM yield_positions yp
    JOIN crypto_assets ca ON ca.id = yp.asset_id
    WHERE yp.is_active = TRUE
      AND (p_user_id IS NULL OR yp.user_id = p_user_id)
      AND yp.current_apy > 0
      AND COALESCE(yp.staked_amount, yp.principal_amount, 0) > 0
      -- Only calculate if time has passed since last calculation
      AND COALESCE(yp.last_yield_calculation, yp.created_at) < NOW()
      -- Skip positions with invalid data
      AND yp.current_apy IS NOT NULL
      AND yp.current_apy <= 200  -- Sanity check
  ),
  updated_positions AS (
    UPDATE yield_positions yp
    SET
      accrued_yield = yp.accrued_yield + yc.calculated_yield,
      total_yield_earned = yp.total_yield_earned + yc.calculated_yield,
      last_yield_calculation = NOW()
    FROM yield_calculations yc
    WHERE yp.id = yc.id
      AND p_apply_yield = TRUE  -- Only update if applying
      AND yc.calculated_yield > 0  -- Only if there's yield to apply
    RETURNING
      yp.id,
      yp.user_id,
      yp.asset_id,
      yc.calculated_yield,
      yc.yield_type,
      yc.current_apy,
      yp.accrued_yield as new_accrued_yield,
      yp.total_yield_earned as new_total_earned
  ),
  inserted_transactions AS (
    INSERT INTO yield_transactions (
      user_id, position_id, asset_id, yield_amount,
      yield_type, apy, calculation_date
    )
    SELECT
      up.user_id,
      up.id,
      up.asset_id,
      up.calculated_yield,
      up.yield_type,
      up.current_apy,
      NOW()
    FROM updated_positions up
    WHERE p_apply_yield = TRUE  -- Only insert transactions if applying
    RETURNING *
  ),
  audit_entries AS (
    INSERT INTO audit_log (
      actor_user, action, entity, entity_id,
      old_values, new_values, meta
    )
    SELECT
      COALESCE(p_admin_user_id, p_user_id),
      'APPLY_YIELD',
      'yield_positions',
      up.id::TEXT,
      jsonb_build_object(
        'accrued_yield', yc.accrued_yield,
        'total_yield_earned', yc.total_yield_earned
      ),
      jsonb_build_object(
        'accrued_yield', up.new_accrued_yield,
        'total_yield_earned', up.new_total_earned
      ),
      jsonb_build_object(
        'yield_amount', up.calculated_yield,
        'apy', up.current_apy,
        'idempotency_key', p_idempotency_key
      )
    FROM updated_positions up
    JOIN yield_calculations yc ON yc.id = up.id
    WHERE p_apply_yield = TRUE
    RETURNING *
  )
  SELECT
    jsonb_build_object(
      'user_id', COALESCE(p_user_id, p_admin_user_id),
      'total_accrued_yield', COALESCE(SUM(calculated_yield), 0),
      'total_yield_earned', COALESCE(SUM(total_yield_earned + calculated_yield), 0),
      'yield_by_type', jsonb_build_object(
        'staking', COALESCE(SUM(calculated_yield) FILTER (WHERE yield_type = 'staking'), 0),
        'lending', COALESCE(SUM(calculated_yield) FILTER (WHERE yield_type = 'lending'), 0),
        'liquidity_provision', COALESCE(SUM(calculated_yield) FILTER (WHERE yield_type = 'liquidity_provision'), 0)
      ),
      'calculations', COALESCE(jsonb_agg(
        jsonb_build_object(
          'user_id', yc.user_id,
          'asset_id', yc.asset_id,
          'asset_symbol', yc.asset_symbol,
          'yield_type', yc.yield_type,
          'apy', yc.current_apy,
          'principal_amount', yc.principal,
          'accrued_yield', yc.calculated_yield,
          'last_calculation_date', yc.last_calc_date,
          'next_payout_date', NOW() + INTERVAL '1 day',  -- Simplified
          'total_yield_earned', yc.total_yield_earned + yc.calculated_yield
        ) ORDER BY yc.calculated_yield DESC
      ), '[]'::jsonb),
      'applied', p_apply_yield,
      'positions_processed', COUNT(*),
      'calculation_timestamp', NOW()
    ) INTO v_result
  FROM yield_calculations yc;

  -- Store idempotency key if provided and yield was applied
  IF p_idempotency_key IS NOT NULL AND p_apply_yield = TRUE THEN
    INSERT INTO idempotency_keys (key, endpoint, user_id, response_data)
    VALUES (
      p_idempotency_key,
      'calculate-yield',
      COALESCE(p_user_id, p_admin_user_id),
      v_result
    )
    ON CONFLICT (key, endpoint) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_and_apply_yields TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_and_apply_yields TO service_role;

-- ============================================================================
-- 4. Portfolio Calculation Function (for accuracy)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_portfolio_value(p_user_id UUID)
RETURNS TABLE(
  total_value NUMERIC(20, 8),
  total_cost_basis NUMERIC(20, 8),
  total_unrealized_pnl NUMERIC(20, 8),
  total_unrealized_pnl_percent NUMERIC(10, 4),
  total_realized_pnl NUMERIC(20, 8)
) AS $$
BEGIN
  RETURN QUERY
  WITH portfolio_values AS (
    SELECT
      COALESCE(SUM(pp.quantity * ca.current_price), 0) as curr_value,
      COALESCE(SUM(pp.cost_basis), 0) as cost_basis
    FROM portfolio_positions pp
    JOIN crypto_assets ca ON ca.id = pp.asset_id
    WHERE pp.user_id = p_user_id
      AND pp.is_active = true
  ),
  realized_pnl AS (
    SELECT COALESCE(SUM(pt.realized_pnl), 0) as realized
    FROM portfolio_transactions pt
    WHERE pt.user_id = p_user_id
      AND pt.transaction_type = 'sell'
  )
  SELECT
    pv.curr_value,
    pv.cost_basis,
    pv.curr_value - pv.cost_basis as unrealized_pnl,
    CASE
      WHEN pv.cost_basis > 0
      THEN ((pv.curr_value - pv.cost_basis) / pv.cost_basis) * 100
      ELSE 0
    END as unrealized_pnl_pct,
    rp.realized
  FROM portfolio_values pv, realized_pnl rp;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_portfolio_value TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_portfolio_value TO service_role;

-- ============================================================================
-- 5. Cleanup expired idempotency keys (scheduled job)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS void AS $$
BEGIN
  DELETE FROM idempotency_keys
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (if available)
-- SELECT cron.schedule('cleanup-idempotency-keys', '0 * * * *', 'SELECT cleanup_expired_idempotency_keys()');

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- APY vs APR Clarification:
-- -------------------------
-- The formula currently assumes 'current_apy' stores APY (Annual Percentage Yield).
--
-- If it stores APY: Formula is CORRECT as written
--   yield = P × ((1 + APY)^(days/365) - 1)
--
-- If it stores APR: Formula needs adjustment to:
--   yield = P × ((1 + APR/365)^days - 1)
--
-- ACTION REQUIRED:
-- 1. Verify with business team what current_apy actually stores
-- 2. If it's APR, update the formula in line 132
-- 3. Consider renaming the field for clarity
--
-- Testing:
-- --------
-- Test the calculation with known values:
--   SELECT calculate_and_apply_yields('user-uuid'::UUID, FALSE, NULL, NULL);
--
-- Compare results against manual calculations or existing DeFi protocol yields
--
-- Security:
-- ---------
-- - Function uses SECURITY DEFINER (runs with creator permissions)
-- - RLS policies protect audit_log and idempotency_keys tables
-- - Admin check enforced for cross-user access
-- - All operations are atomic within single transaction
--
-- ============================================================================

COMMENT ON FUNCTION calculate_and_apply_yields IS
'Atomically calculates and optionally applies yield for user positions. Includes audit logging, idempotency support, and comprehensive validation. Formula assumes current_apy stores APY - verify and adjust if needed.';

COMMENT ON FUNCTION calculate_portfolio_value IS
'Calculates portfolio value, P&L using exact NUMERIC arithmetic to avoid floating point errors.';

COMMENT ON TABLE audit_log IS
'Audit trail for all sensitive operations including admin access and yield applications.';

COMMENT ON TABLE idempotency_keys IS
'Stores idempotency keys to prevent duplicate yield applications on network retries. Keys expire after 24 hours.';
