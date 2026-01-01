-- Expert Solution: Auto-AUM Carryforward System
-- Two-layer defense: reactive trigger + proactive daily cron job

-- ============================================
-- LAYER 1: Modified Validation Trigger (Reactive)
-- Auto-creates missing AUM instead of failing
-- ============================================

CREATE OR REPLACE FUNCTION validate_transaction_has_aum()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  aum_exists boolean;
  v_previous_aum numeric;
  v_previous_date date;
BEGIN
  -- Only validate for DEPOSIT and WITHDRAWAL types
  IF NEW.type NOT IN ('DEPOSIT', 'WITHDRAWAL') THEN
    RETURN NEW;
  END IF;

  -- Check if AUM record exists for this fund and date
  SELECT EXISTS(
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = NEW.fund_id 
      AND aum_date = NEW.tx_date 
      AND purpose = 'transaction'
      AND is_voided = false
  ) INTO aum_exists;

  IF NOT aum_exists THEN
    -- AUTO-CARRYFORWARD: Get the most recent AUM for this fund
    SELECT total_aum, aum_date 
    INTO v_previous_aum, v_previous_date
    FROM fund_daily_aum
    WHERE fund_id = NEW.fund_id
      AND aum_date < NEW.tx_date
      AND purpose = 'transaction'
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
    
    IF v_previous_aum IS NOT NULL THEN
      -- Create new AUM record by carrying forward
      INSERT INTO fund_daily_aum (
        fund_id, aum_date, total_aum, source, purpose, is_voided
      ) VALUES (
        NEW.fund_id, 
        NEW.tx_date, 
        v_previous_aum, 
        'auto_carryforward', 
        'transaction', 
        false
      )
      ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;
    ELSE
      -- No previous AUM exists - bootstrap from current investor positions
      SELECT COALESCE(SUM(ip.current_value), 0) 
      INTO v_previous_aum
      FROM investor_positions ip
      WHERE ip.fund_id = NEW.fund_id;
      
      INSERT INTO fund_daily_aum (
        fund_id, aum_date, total_aum, source, purpose, is_voided
      ) VALUES (
        NEW.fund_id, 
        NEW.tx_date, 
        v_previous_aum, 
        'auto_bootstrap', 
        'transaction', 
        false
      )
      ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- LAYER 2: Proactive Daily Carryforward Function
-- ============================================

CREATE OR REPLACE FUNCTION carryforward_daily_aum()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_today date := CURRENT_DATE;
  v_count integer := 0;
  v_skipped integer := 0;
  v_latest_aum numeric;
BEGIN
  FOR v_fund IN 
    SELECT f.id, f.code, f.asset 
    FROM funds f 
    WHERE f.status = 'active'
  LOOP
    -- Check if today's AUM already exists
    IF NOT EXISTS (
      SELECT 1 FROM fund_daily_aum 
      WHERE fund_id = v_fund.id 
        AND aum_date = v_today 
        AND purpose = 'transaction'
        AND is_voided = false
    ) THEN
      -- Get most recent AUM for this fund
      SELECT total_aum INTO v_latest_aum
      FROM fund_daily_aum 
      WHERE fund_id = v_fund.id 
        AND purpose = 'transaction'
        AND is_voided = false
      ORDER BY aum_date DESC 
      LIMIT 1;
      
      IF v_latest_aum IS NOT NULL THEN
        INSERT INTO fund_daily_aum (
          fund_id, aum_date, total_aum, source, purpose, is_voided
        ) VALUES (
          v_fund.id,
          v_today,
          v_latest_aum,
          'daily_carryforward_job',
          'transaction',
          false
        )
        ON CONFLICT (fund_id, aum_date, purpose) DO NOTHING;
        
        v_count := v_count + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  -- Log the operation
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES (
    'DAILY_AUM_CARRYFORWARD',
    'fund_daily_aum',
    'batch',
    jsonb_build_object(
      'date', v_today,
      'funds_updated', v_count,
      'funds_skipped', v_skipped
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'date', v_today,
    'funds_updated', v_count,
    'funds_skipped', v_skipped
  );
END;
$$;

-- ============================================
-- LAYER 3: Schedule Daily Cron Job at 00:01 UTC
-- (pg_cron extension already enabled in Supabase)
-- ============================================

SELECT cron.schedule(
  'daily-aum-carryforward',
  '1 0 * * *',
  $$SELECT public.carryforward_daily_aum()$$
);

-- ============================================
-- LAYER 4: Immediate Backfill for Today
-- ============================================

SELECT public.carryforward_daily_aum();