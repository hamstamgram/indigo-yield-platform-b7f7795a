-- Fix sync_aum_on_transaction trigger
-- The ON CONFLICT clause was missing 'purpose' column which is part of the unique index
-- Unique index: fund_daily_aum_unique_active ON (fund_id, aum_date, purpose) WHERE (is_voided = false)

CREATE OR REPLACE FUNCTION public.sync_aum_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_aum numeric(28,10);
  v_today date := CURRENT_DATE;
BEGIN
  -- Only process non-voided transactions
  IF NEW.is_voided = true THEN
    RETURN NEW;
  END IF;

  -- Calculate new AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_new_aum
  FROM investor_positions
  WHERE fund_id = NEW.fund_id AND is_active = true;

  -- Upsert today's AUM with 'reporting' purpose (matches unique index)
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_voided)
  VALUES (NEW.fund_id, v_today, v_new_aum, 'reporting', 'tx_sync', false)
  ON CONFLICT (fund_id, aum_date, purpose) WHERE is_voided = false
  DO UPDATE SET
    total_aum = v_new_aum,
    source = 'tx_sync',
    updated_at = now();

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION sync_aum_on_transaction() IS 'Trigger to sync AUM when transactions are created. Fixed to include purpose in ON CONFLICT clause.';
