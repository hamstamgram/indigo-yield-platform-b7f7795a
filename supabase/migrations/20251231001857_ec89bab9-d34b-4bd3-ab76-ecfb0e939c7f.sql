-- =====================================================
-- Automated AUM Sync Enhancement
-- Fixes the issue where position changes don't update
-- historical AUM records, causing integrity mismatches
-- =====================================================

-- 1. Enhanced sync_nav_on_position_change function
-- Now updates BOTH today's record AND the most recent AUM record
CREATE OR REPLACE FUNCTION sync_nav_on_position_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_id uuid;
  v_new_aum numeric;
  v_latest_date date;
BEGIN
  -- Determine which fund was affected
  IF TG_OP = 'DELETE' THEN
    v_fund_id := OLD.fund_id;
  ELSE
    v_fund_id := NEW.fund_id;
  END IF;

  -- Calculate new total AUM from all positions
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = v_fund_id;

  -- Update today's AUM record if it exists
  UPDATE fund_daily_aum
  SET 
    total_aum = v_new_aum,
    updated_at = now()
  WHERE fund_id = v_fund_id
    AND aum_date = CURRENT_DATE
    AND NOT COALESCE(is_voided, false);

  -- Also update the most recent AUM record (if different from today)
  -- This ensures the fund_aum_mismatch view shows correct data
  SELECT MAX(aum_date) INTO v_latest_date
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND NOT COALESCE(is_voided, false);

  IF v_latest_date IS NOT NULL AND v_latest_date != CURRENT_DATE THEN
    UPDATE fund_daily_aum
    SET 
      total_aum = v_new_aum,
      updated_at = now()
    WHERE fund_id = v_fund_id
      AND aum_date = v_latest_date
      AND NOT COALESCE(is_voided, false);
  END IF;

  -- Update daily_nav as well for consistency
  UPDATE daily_nav
  SET 
    aum = v_new_aum,
    investor_count = (
      SELECT COUNT(DISTINCT investor_id)
      FROM investor_positions
      WHERE fund_id = v_fund_id
        AND current_value > 0
    )
  WHERE fund_id = v_fund_id
    AND nav_date = CURRENT_DATE;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. Create admin RPC to recalculate all AUM records
-- This fixes any existing mismatches in one call
CREATE OR REPLACE FUNCTION recalculate_all_aum()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count int := 0;
  v_fund RECORD;
  v_actual_aum numeric;
  v_updates_made int;
BEGIN
  -- Verify admin access
  IF NOT check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Loop through each fund
  FOR v_fund IN 
    SELECT DISTINCT fund_id FROM fund_daily_aum WHERE NOT COALESCE(is_voided, false)
  LOOP
    -- Calculate actual AUM from current positions
    SELECT COALESCE(SUM(current_value), 0) INTO v_actual_aum
    FROM investor_positions 
    WHERE fund_id = v_fund.fund_id;
    
    -- Update all non-voided AUM records where value differs
    UPDATE fund_daily_aum
    SET 
      total_aum = v_actual_aum, 
      updated_at = now(),
      source = COALESCE(source, '') || ' (auto-synced)'
    WHERE fund_id = v_fund.fund_id
      AND NOT COALESCE(is_voided, false)
      AND total_aum != v_actual_aum;
    
    GET DIAGNOSTICS v_updates_made = ROW_COUNT;
    IF v_updates_made > 0 THEN
      v_fixed_count := v_fixed_count + 1;
    END IF;
  END LOOP;

  -- Create audit log entry
  INSERT INTO audit_log (action, entity, actor_user, new_values)
  VALUES (
    'RECALCULATE_ALL_AUM', 
    'fund_daily_aum', 
    auth.uid(), 
    jsonb_build_object('funds_fixed', v_fixed_count, 'triggered_at', now())
  );

  RETURN jsonb_build_object(
    'success', true, 
    'funds_fixed', v_fixed_count,
    'message', format('%s fund(s) had AUM records updated', v_fixed_count)
  );
END;
$$;

-- 3. Grant execute permission to authenticated users (admin check is inside)
GRANT EXECUTE ON FUNCTION recalculate_all_aum() TO authenticated;

-- 4. Fix existing BTC Fund mismatch immediately
-- Update all non-voided AUM records to match actual position values
UPDATE fund_daily_aum fda
SET 
  total_aum = (
    SELECT COALESCE(SUM(ip.current_value), 0)
    FROM investor_positions ip
    WHERE ip.fund_id = fda.fund_id
  ),
  updated_at = now(),
  source = COALESCE(source, '') || ' (integrity-fix)'
WHERE NOT COALESCE(is_voided, false)
  AND EXISTS (
    -- Only update funds that have a mismatch
    SELECT 1 FROM fund_aum_mismatch m WHERE m.fund_id = fda.fund_id
  );