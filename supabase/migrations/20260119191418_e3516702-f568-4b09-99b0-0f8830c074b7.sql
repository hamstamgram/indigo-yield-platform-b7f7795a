-- Phase 1: Create live views to replace materialized views
-- These compute in real-time, eliminating the need for MV refresh

-- Live Fund Summary View (replaces mv_fund_summary)
CREATE OR REPLACE VIEW v_fund_summary_live AS
SELECT f.id AS fund_id,
    f.code,
    f.name,
    f.asset,
    f.status,
    count(DISTINCT
        CASE
            WHEN ((p.account_type = 'investor'::account_type) AND (ip.current_value > (0)::numeric)) THEN ip.investor_id
            ELSE NULL::uuid
        END) AS investor_count,
    COALESCE(sum(
        CASE
            WHEN (p.account_type = 'investor'::account_type) THEN ip.current_value
            ELSE (0)::numeric
        END), (0)::numeric) AS investor_aum,
    COALESCE(sum(
        CASE
            WHEN (p.account_type = 'fees_account'::account_type) THEN ip.current_value
            ELSE (0)::numeric
        END), (0)::numeric) AS fees_balance,
    COALESCE(sum(
        CASE
            WHEN (p.account_type = 'ib'::account_type) THEN ip.current_value
            ELSE (0)::numeric
        END), (0)::numeric) AS ib_balance,
    COALESCE(sum(ip.current_value), (0)::numeric) AS total_positions,
    ( SELECT fund_daily_aum.total_aum
           FROM fund_daily_aum
          WHERE ((fund_daily_aum.fund_id = f.id) AND (fund_daily_aum.is_voided = false))
          ORDER BY fund_daily_aum.aum_date DESC, fund_daily_aum.created_at DESC
         LIMIT 1) AS latest_aum,
    ( SELECT fund_daily_aum.aum_date
           FROM fund_daily_aum
          WHERE ((fund_daily_aum.fund_id = f.id) AND (fund_daily_aum.is_voided = false))
          ORDER BY fund_daily_aum.aum_date DESC, fund_daily_aum.created_at DESC
         LIMIT 1) AS latest_aum_date
FROM ((funds f
     LEFT JOIN investor_positions ip ON ((ip.fund_id = f.id)))
     LEFT JOIN profiles p ON ((p.id = ip.investor_id)))
GROUP BY f.id, f.code, f.name, f.asset, f.status;

-- Live Platform Metrics View (replaces mv_daily_platform_metrics)
CREATE OR REPLACE VIEW v_daily_platform_metrics_live AS
SELECT CURRENT_DATE AS metric_date,
    ( SELECT count(*) AS count
           FROM profiles
          WHERE ((profiles.account_type = 'investor'::account_type) AND (profiles.status = 'active'::text))) AS active_investors,
    ( SELECT count(*) AS count
           FROM profiles
          WHERE (profiles.account_type = 'ib'::account_type)) AS total_ibs,
    ( SELECT count(*) AS count
           FROM funds
          WHERE (funds.status = 'active'::fund_status)) AS active_funds,
    ( SELECT COALESCE(sum(latest_aums.total_aum), (0)::numeric) AS "coalesce"
           FROM ( SELECT DISTINCT ON (fund_daily_aum.fund_id) fund_daily_aum.total_aum
                   FROM fund_daily_aum
                  WHERE (fund_daily_aum.is_voided = false)
                  ORDER BY fund_daily_aum.fund_id, fund_daily_aum.aum_date DESC, fund_daily_aum.created_at DESC) latest_aums) AS total_platform_aum,
    ( SELECT count(*) AS count
           FROM withdrawal_requests
          WHERE (withdrawal_requests.status = ANY (ARRAY['pending'::withdrawal_status, 'approved'::withdrawal_status]))) AS pending_withdrawals,
    ( SELECT COALESCE(sum(withdrawal_requests.requested_amount), (0)::numeric) AS "coalesce"
           FROM withdrawal_requests
          WHERE (withdrawal_requests.status = ANY (ARRAY['pending'::withdrawal_status, 'approved'::withdrawal_status]))) AS pending_withdrawal_amount,
    ( SELECT count(*) AS count
           FROM yield_distributions
          WHERE ((yield_distributions.status = 'applied'::text) AND (yield_distributions.effective_date = CURRENT_DATE))) AS yields_today,
    now() AS refreshed_at;

-- Phase 2: Real-time alert triggers for integrity violations

-- Function to create integrity alert
CREATE OR REPLACE FUNCTION create_integrity_alert(
  p_alert_type text,
  p_severity text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO admin_alerts (alert_type, severity, title, message, metadata)
  VALUES (p_alert_type, p_severity, p_title, p_message, p_metadata)
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Trigger: Alert on AUM mismatch after position changes
CREATE OR REPLACE FUNCTION alert_on_aum_position_mismatch()
RETURNS TRIGGER AS $$
DECLARE
  v_fund_id uuid;
  v_position_sum numeric;
  v_recorded_aum numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  -- Get the fund_id from the changed position
  v_fund_id := COALESCE(NEW.fund_id, OLD.fund_id);
  
  -- Calculate sum of positions for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_position_sum
  FROM investor_positions
  WHERE fund_id = v_fund_id;
  
  -- Get latest recorded AUM
  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id AND is_voided = false
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;
  
  -- Check for mismatch
  v_difference := ABS(COALESCE(v_position_sum, 0) - COALESCE(v_recorded_aum, 0));
  
  IF v_difference > v_tolerance THEN
    -- Create alert
    PERFORM create_integrity_alert(
      'aum_mismatch',
      CASE WHEN v_difference > 1 THEN 'error' ELSE 'warning' END,
      'AUM Position Mismatch Detected',
      format('Fund %s: Position sum (%.4f) differs from recorded AUM (%.4f) by %.4f', 
        v_fund_id, v_position_sum, v_recorded_aum, v_difference),
      jsonb_build_object(
        'fund_id', v_fund_id,
        'position_sum', v_position_sum,
        'recorded_aum', v_recorded_aum,
        'difference', v_difference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_aum_position_mismatch'
  ) THEN
    CREATE TRIGGER trg_alert_aum_position_mismatch
    AFTER UPDATE ON investor_positions
    FOR EACH ROW
    WHEN (NEW.current_value IS DISTINCT FROM OLD.current_value)
    EXECUTE FUNCTION alert_on_aum_position_mismatch();
  END IF;
END $$;

-- Trigger: Alert on yield conservation violation
CREATE OR REPLACE FUNCTION alert_on_yield_conservation_violation()
RETURNS TRIGGER AS $$
DECLARE
  v_investor_yield numeric;
  v_fee_total numeric;
  v_ib_total numeric;
  v_expected_total numeric;
  v_difference numeric;
  v_tolerance numeric := 0.0001;
BEGIN
  -- Only check on newly applied distributions
  IF NEW.status != 'applied' THEN
    RETURN NEW;
  END IF;
  
  -- Get investor yield allocations
  SELECT COALESCE(SUM(amount), 0) INTO v_investor_yield
  FROM investor_yield_allocations
  WHERE distribution_id = NEW.id AND is_voided = false;
  
  -- Get fee allocations
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_fee_total
  FROM fee_allocations
  WHERE distribution_id = NEW.id AND is_voided = false;
  
  -- Get IB allocations
  SELECT COALESCE(SUM(amount), 0) INTO v_ib_total
  FROM ib_allocations
  WHERE distribution_id = NEW.id AND is_voided = false;
  
  v_expected_total := v_investor_yield + v_fee_total + v_ib_total;
  v_difference := ABS(NEW.gross_yield_amount - v_expected_total);
  
  IF v_difference > v_tolerance THEN
    PERFORM create_integrity_alert(
      'yield_conservation_violation',
      'error',
      'Yield Conservation Violation',
      format('Distribution %s: Gross (%.6f) != Allocations (%.6f), difference: %.6f',
        NEW.id, NEW.gross_yield_amount, v_expected_total, v_difference),
      jsonb_build_object(
        'distribution_id', NEW.id,
        'fund_id', NEW.fund_id,
        'gross_yield', NEW.gross_yield_amount,
        'investor_yield', v_investor_yield,
        'fee_total', v_fee_total,
        'ib_total', v_ib_total,
        'difference', v_difference
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_yield_conservation'
  ) THEN
    CREATE TRIGGER trg_alert_yield_conservation
    AFTER INSERT OR UPDATE ON yield_distributions
    FOR EACH ROW
    EXECUTE FUNCTION alert_on_yield_conservation_violation();
  END IF;
END $$;

-- Trigger: Alert on ledger position drift
CREATE OR REPLACE FUNCTION alert_on_ledger_position_drift()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_balance numeric;
  v_position_balance numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  -- Calculate balance from ledger
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id 
    AND fund_id = NEW.fund_id
    AND is_voided = false;
  
  -- Get position balance
  SELECT current_value INTO v_position_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  v_difference := ABS(COALESCE(v_ledger_balance, 0) - COALESCE(v_position_balance, 0));
  
  IF v_difference > v_tolerance THEN
    PERFORM create_integrity_alert(
      'ledger_position_drift',
      CASE WHEN v_difference > 1 THEN 'error' ELSE 'warning' END,
      'Ledger-Position Drift Detected',
      format('Investor %s in fund %s: Ledger (%.4f) differs from position (%.4f) by %.4f',
        NEW.investor_id, NEW.fund_id, v_ledger_balance, v_position_balance, v_difference),
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
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_alert_ledger_drift'
  ) THEN
    CREATE TRIGGER trg_alert_ledger_drift
    AFTER INSERT ON transactions_v2
    FOR EACH ROW
    EXECUTE FUNCTION alert_on_ledger_position_drift();
  END IF;
END $$;

-- Phase 3: Auto-healing triggers

-- Function to auto-sync AUM when drift is detected
CREATE OR REPLACE FUNCTION auto_heal_aum_drift()
RETURNS TRIGGER AS $$
DECLARE
  v_position_sum numeric;
  v_recorded_aum numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  -- Calculate sum of positions for this fund
  SELECT COALESCE(SUM(current_value), 0) INTO v_position_sum
  FROM investor_positions
  WHERE fund_id = NEW.fund_id;
  
  -- Get latest recorded AUM
  SELECT total_aum INTO v_recorded_aum
  FROM fund_daily_aum
  WHERE fund_id = NEW.fund_id AND is_voided = false
  ORDER BY aum_date DESC, created_at DESC
  LIMIT 1;
  
  v_difference := ABS(COALESCE(v_position_sum, 0) - COALESCE(v_recorded_aum, 0));
  
  -- Auto-heal if drift detected
  IF v_difference > v_tolerance AND v_recorded_aum IS NOT NULL THEN
    -- Update the AUM record to match positions
    UPDATE fund_daily_aum
    SET total_aum = v_position_sum,
        updated_at = now(),
        source = 'auto_heal_sync'
    WHERE fund_id = NEW.fund_id 
      AND is_voided = false
      AND aum_date = (
        SELECT aum_date FROM fund_daily_aum 
        WHERE fund_id = NEW.fund_id AND is_voided = false
        ORDER BY aum_date DESC, created_at DESC LIMIT 1
      );
    
    -- Log the auto-heal action
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'AUTO_HEAL_AUM',
      'fund_daily_aum',
      NEW.fund_id::text,
      jsonb_build_object(
        'previous_aum', v_recorded_aum,
        'corrected_aum', v_position_sum,
        'difference', v_difference,
        'triggered_by', 'position_change'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_heal_aum'
  ) THEN
    CREATE TRIGGER trg_auto_heal_aum
    AFTER INSERT OR UPDATE ON investor_positions
    FOR EACH ROW
    EXECUTE FUNCTION auto_heal_aum_drift();
  END IF;
END $$;

-- Function to auto-recompute position when ledger changes
CREATE OR REPLACE FUNCTION auto_heal_position_from_ledger()
RETURNS TRIGGER AS $$
DECLARE
  v_ledger_balance numeric;
  v_position_balance numeric;
  v_difference numeric;
  v_tolerance numeric := 0.01;
BEGIN
  -- Skip if transaction is voided
  IF NEW.is_voided THEN
    RETURN NEW;
  END IF;
  
  -- Calculate balance from ledger
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_balance
  FROM transactions_v2
  WHERE investor_id = NEW.investor_id 
    AND fund_id = NEW.fund_id
    AND is_voided = false;
  
  -- Get current position balance
  SELECT current_value INTO v_position_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  
  v_difference := ABS(COALESCE(v_ledger_balance, 0) - COALESCE(v_position_balance, 0));
  
  -- Auto-heal if drift detected
  IF v_difference > v_tolerance THEN
    -- Update position to match ledger
    UPDATE investor_positions
    SET current_value = v_ledger_balance,
        updated_at = now()
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    
    -- Log the auto-heal action
    INSERT INTO audit_log (action, entity, entity_id, meta)
    VALUES (
      'AUTO_HEAL_POSITION',
      'investor_positions',
      NEW.investor_id::text || ':' || NEW.fund_id::text,
      jsonb_build_object(
        'previous_balance', v_position_balance,
        'corrected_balance', v_ledger_balance,
        'difference', v_difference,
        'triggered_by', 'transaction_insert'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_auto_heal_position'
  ) THEN
    CREATE TRIGGER trg_auto_heal_position
    AFTER INSERT ON transactions_v2
    FOR EACH ROW
    EXECUTE FUNCTION auto_heal_position_from_ledger();
  END IF;
END $$;

-- Grant access to the new views
GRANT SELECT ON v_fund_summary_live TO authenticated;
GRANT SELECT ON v_daily_platform_metrics_live TO authenticated;

-- Add comment documenting the real-time architecture
COMMENT ON VIEW v_fund_summary_live IS 'Real-time fund summary - computes on read, no refresh needed';
COMMENT ON VIEW v_daily_platform_metrics_live IS 'Real-time platform metrics - computes on read, no refresh needed';