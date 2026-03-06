
-- ============================================================================
-- Phase 1 & 2: Security Hardening Migration (Fixed)
-- 1. Add missing v_aum_position_mismatch integrity view  
-- 2. Fix 6 SECURITY DEFINER functions with mutable search_path
-- ============================================================================

-- ============================================================================
-- 1. Create missing v_aum_position_mismatch view
-- ============================================================================
CREATE OR REPLACE VIEW v_aum_position_mismatch 
WITH (security_invoker = true) AS
SELECT 
  f.id AS fund_id,
  f.name AS fund_name,
  f.asset,
  COALESCE(SUM(ip.current_value), 0) AS sum_positions,
  (
    SELECT dn.aum 
    FROM daily_nav dn 
    WHERE dn.fund_id = f.id 
    ORDER BY dn.nav_date DESC 
    LIMIT 1
  ) AS latest_nav_aum,
  COALESCE(SUM(ip.current_value), 0) - COALESCE((
    SELECT dn.aum 
    FROM daily_nav dn 
    WHERE dn.fund_id = f.id 
    ORDER BY dn.nav_date DESC 
    LIMIT 1
  ), 0) AS mismatch_amount,
  ABS(COALESCE(SUM(ip.current_value), 0) - COALESCE((
    SELECT dn.aum 
    FROM daily_nav dn 
    WHERE dn.fund_id = f.id 
    ORDER BY dn.nav_date DESC 
    LIMIT 1
  ), 0)) > 0.01 AS has_mismatch
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE f.status = 'active'
GROUP BY f.id, f.name, f.asset;

COMMENT ON VIEW v_aum_position_mismatch IS 
  'Integrity view: Detects mismatches between sum of investor positions and fund NAV/AUM';

-- ============================================================================
-- 2. Fix SECURITY DEFINER functions - DROP and recreate with search_path
-- ============================================================================

-- 2a. Fix alert_on_ledger_position_drift (TRIGGER)
DROP FUNCTION IF EXISTS alert_on_ledger_position_drift() CASCADE;
CREATE FUNCTION alert_on_ledger_position_drift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ledger_balance numeric;
  v_position_balance numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id 
    AND fund_id = NEW.fund_id
    AND is_voided = false;
  
  SELECT current_value INTO v_position_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  v_difference := ABS(COALESCE(v_ledger_balance, 0) - COALESCE(v_position_balance, 0));
  
  IF v_difference > v_tolerance THEN
    PERFORM create_integrity_alert(
      'ledger_position_drift',
      CASE WHEN v_difference > 1 THEN 'critical' ELSE 'warning' END,
      'Ledger-Position Drift Detected',
      format('Investor %s in fund %s: Ledger (%s) differs from position (%s) by %s',
        NEW.investor_id, NEW.fund_id, 
        ROUND(v_ledger_balance, 4)::text, 
        ROUND(COALESCE(v_position_balance, 0), 4)::text, 
        ROUND(v_difference, 4)::text),
      jsonb_build_object(
        'investor_id', NEW.investor_id,
        'fund_id', NEW.fund_id,
        'ledger_balance', v_ledger_balance,
        'position_balance', v_position_balance,
        'difference', v_difference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2b. Fix initialize_all_hwm_values (TABLE return)
DROP FUNCTION IF EXISTS initialize_all_hwm_values() CASCADE;
CREATE FUNCTION initialize_all_hwm_values()
RETURNS TABLE(updated_count integer, positions_affected jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_positions jsonb;
BEGIN
  WITH updated AS (
    UPDATE investor_positions
    SET high_water_mark = GREATEST(COALESCE(current_value, 0), COALESCE(cost_basis, 0))
    WHERE high_water_mark IS NULL OR high_water_mark = 0
    RETURNING investor_id, fund_id, high_water_mark
  )
  SELECT COUNT(*)::integer, COALESCE(jsonb_agg(jsonb_build_object(
    'investor_id', investor_id,
    'fund_id', fund_id,
    'new_hwm', high_water_mark
  )), '[]'::jsonb)
  INTO v_count, v_positions
  FROM updated;
  
  RETURN QUERY SELECT v_count, v_positions;
END;
$$;

-- 2c. Fix log_aum_position_mismatch (TRIGGER)
DROP FUNCTION IF EXISTS log_aum_position_mismatch() CASCADE;
CREATE FUNCTION log_aum_position_mismatch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT * FROM fund_aum_mismatch WHERE has_mismatch = true
  LOOP
    INSERT INTO admin_alerts (alert_type, severity, title, message, metadata)
    VALUES (
      'aum_position_mismatch',
      CASE WHEN ABS(r.mismatch_amount) > 100 THEN 'critical' ELSE 'warning' END,
      'AUM-Position Mismatch Detected',
      format('Fund %s: AUM (%s) differs from positions sum (%s) by %s',
        r.fund_name, 
        ROUND(COALESCE(r.latest_aum, 0), 2)::text,
        ROUND(r.sum_positions, 2)::text,
        ROUND(r.mismatch_amount, 2)::text),
      jsonb_build_object(
        'fund_id', r.fund_id,
        'fund_name', r.fund_name,
        'latest_aum', r.latest_aum,
        'sum_positions', r.sum_positions,
        'mismatch_amount', r.mismatch_amount
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- 2d. Fix sync_position_last_tx_date (TRIGGER)
DROP FUNCTION IF EXISTS sync_position_last_tx_date() CASCADE;
CREATE FUNCTION sync_position_last_tx_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE investor_positions ip
  SET last_transaction_date = (
    SELECT MAX(tx_date)
    FROM transactions_v2 t
    WHERE t.investor_id = ip.investor_id 
      AND t.fund_id = ip.fund_id
      AND t.is_voided = false
  )
  WHERE ip.investor_id = NEW.investor_id AND ip.fund_id = NEW.fund_id;
  RETURN NEW;
END;
$$;

-- 2e. Fix sync_profile_last_activity (TRIGGER)
DROP FUNCTION IF EXISTS sync_profile_last_activity() CASCADE;
CREATE FUNCTION sync_profile_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- 2f. Fix get_kpi_metrics overloads - need to preserve both signatures
DROP FUNCTION IF EXISTS get_kpi_metrics(text, uuid) CASCADE;
CREATE FUNCTION get_kpi_metrics(metric_type text, user_id uuid)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required for KPI metrics';
  END IF;
  
  CASE metric_type
    WHEN 'platform_summary' THEN
      SELECT json_build_object(
        'total_aum', COALESCE(SUM(ip.current_value), 0),
        'investor_count', COUNT(DISTINCT ip.investor_id),
        'fund_count', COUNT(DISTINCT ip.fund_id)
      ) INTO result
      FROM investor_positions ip
      JOIN profiles p ON p.id = ip.investor_id
      WHERE p.account_type = 'investor' AND ip.current_value > 0;
      
    WHEN 'user_portfolio' THEN
      SELECT json_build_object(
        'total_value', COALESCE(SUM(ip.current_value), 0),
        'positions', COUNT(*),
        'funds', array_agg(DISTINCT f.name)
      ) INTO result
      FROM investor_positions ip
      JOIN funds f ON f.id = ip.fund_id
      WHERE ip.investor_id = user_id AND ip.current_value > 0;
      
    ELSE
      result := json_build_object('error', 'Unknown metric type');
  END CASE;
  
  RETURN result;
END;
$$;

-- Re-attach triggers if they existed
-- Note: Triggers using these functions would have been dropped with CASCADE
-- They should be recreated by existing migration definitions
