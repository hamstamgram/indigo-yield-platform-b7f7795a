-- Fix all functions that incorrectly use ON CONFLICT (fund_id, aum_date, purpose)
-- The partial index fund_daily_aum_unique_active cannot be used with standard ON CONFLICT

-- 1. Fix sync_fund_aum_on_position_change
DROP FUNCTION IF EXISTS public.sync_fund_aum_on_position_change() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_fund_aum_on_position_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_id uuid;
  v_new_total_aum numeric;
  v_today date := CURRENT_DATE;
  v_existing_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_fund_id := OLD.fund_id;
  ELSE
    v_fund_id := NEW.fund_id;
  END IF;
  
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_new_total_aum
  FROM public.investor_positions
  WHERE fund_id = v_fund_id AND current_value > 0;
  
  -- Check for existing non-voided record
  SELECT id INTO v_existing_id
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id AND aum_date = v_today AND purpose = 'reporting' AND is_voided = false
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    UPDATE fund_daily_aum
    SET total_aum = v_new_total_aum, source = 'position_sync_trigger', updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_month_end, is_voided)
    VALUES (v_fund_id, v_today, v_new_total_aum, 'reporting', 'position_sync_trigger',
      (v_today = (date_trunc('month', v_today) + interval '1 month - 1 day')::date), false);
  END IF;
  
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_sync_fund_aum_on_position_change
  AFTER INSERT OR DELETE OR UPDATE OF current_value ON investor_positions
  FOR EACH ROW EXECUTE FUNCTION sync_fund_aum_on_position_change();

-- 2. Fix carryforward_daily_aum
DROP FUNCTION IF EXISTS public.carryforward_daily_aum();
CREATE OR REPLACE FUNCTION public.carryforward_daily_aum()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_today date := CURRENT_DATE;
  v_count integer := 0;
  v_skipped integer := 0;
  v_latest_aum numeric;
  v_existing_id uuid;
BEGIN
  FOR v_fund IN SELECT f.id, f.code FROM funds f WHERE f.status = 'active'
  LOOP
    SELECT id INTO v_existing_id
    FROM fund_daily_aum WHERE fund_id = v_fund.id AND aum_date = v_today AND purpose = 'transaction' AND is_voided = false;
    
    IF v_existing_id IS NULL THEN
      SELECT total_aum INTO v_latest_aum
      FROM fund_daily_aum WHERE fund_id = v_fund.id AND purpose = 'transaction' AND is_voided = false
      ORDER BY aum_date DESC LIMIT 1;
      
      IF v_latest_aum IS NOT NULL THEN
        INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
        VALUES (v_fund.id, v_today, v_latest_aum, 'daily_carryforward_job', 'transaction', false);
        v_count := v_count + 1;
      END IF;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;
  
  INSERT INTO audit_log (action, entity, entity_id, meta)
  VALUES ('DAILY_AUM_CARRYFORWARD', 'fund_daily_aum', 'batch',
    jsonb_build_object('date', v_today, 'funds_updated', v_count, 'funds_skipped', v_skipped));
  
  RETURN jsonb_build_object('success', true, 'date', v_today, 'funds_updated', v_count, 'funds_skipped', v_skipped);
END;
$$;

-- 3. Fix validate_transaction_has_aum
DROP FUNCTION IF EXISTS public.validate_transaction_has_aum() CASCADE;
CREATE OR REPLACE FUNCTION public.validate_transaction_has_aum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_previous_aum numeric;
BEGIN
  IF NEW.type NOT IN ('DEPOSIT', 'WITHDRAWAL') THEN RETURN NEW; END IF;

  SELECT id INTO v_existing_id
  FROM fund_daily_aum WHERE fund_id = NEW.fund_id AND aum_date = NEW.tx_date AND purpose = 'transaction' AND is_voided = false;

  IF v_existing_id IS NULL THEN
    SELECT total_aum INTO v_previous_aum
    FROM fund_daily_aum
    WHERE fund_id = NEW.fund_id AND aum_date < NEW.tx_date AND purpose = 'transaction' AND is_voided = false
    ORDER BY aum_date DESC LIMIT 1;
    
    IF v_previous_aum IS NULL THEN
      SELECT COALESCE(SUM(current_value), 0) INTO v_previous_aum
      FROM investor_positions WHERE fund_id = NEW.fund_id;
    END IF;
    
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_voided)
    VALUES (NEW.fund_id, NEW.tx_date, COALESCE(v_previous_aum, 0), 
      CASE WHEN v_previous_aum IS NOT NULL THEN 'auto_carryforward' ELSE 'auto_bootstrap' END, 
      'transaction', false);
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_validate_transaction_has_aum
  BEFORE INSERT ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_has_aum();

-- 4. Fix set_fund_daily_aum
DROP FUNCTION IF EXISTS public.set_fund_daily_aum(text, date, numeric, numeric);
CREATE OR REPLACE FUNCTION public.set_fund_daily_aum(
  p_fund_id text, p_aum_date date, p_total_aum numeric, p_nav_per_share numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aum_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::uuid AND aum_date = p_aum_date AND purpose = 'transaction' AND is_voided = false;
  
  IF v_existing_id IS NOT NULL THEN
    UPDATE fund_daily_aum
    SET total_aum = p_total_aum, nav_per_share = p_nav_per_share, updated_at = now()
    WHERE id = v_existing_id
    RETURNING id INTO v_aum_id;
  ELSE
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, nav_per_share, purpose, created_by, is_voided)
    VALUES (p_fund_id::uuid, p_aum_date, p_total_aum, p_nav_per_share, 'transaction', auth.uid(), false)
    RETURNING id INTO v_aum_id;
  END IF;

  RETURN v_aum_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_fund_aum_on_position_change TO authenticated;
GRANT EXECUTE ON FUNCTION public.carryforward_daily_aum TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_transaction_has_aum TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_fund_daily_aum TO authenticated;