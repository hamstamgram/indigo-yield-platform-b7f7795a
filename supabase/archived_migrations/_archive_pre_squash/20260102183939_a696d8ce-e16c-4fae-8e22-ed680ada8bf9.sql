-- Auto-sync fund_daily_aum when investor_positions change
-- This prevents AUM discrepancies by keeping fund_daily_aum in sync with actual positions

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.sync_fund_aum_on_position_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_id uuid;
  v_new_total_aum numeric;
  v_today date := CURRENT_DATE;
BEGIN
  -- Determine which fund to sync
  IF TG_OP = 'DELETE' THEN
    v_fund_id := OLD.fund_id;
  ELSE
    v_fund_id := NEW.fund_id;
  END IF;
  
  -- Calculate new total AUM from all positions in this fund
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_new_total_aum
  FROM public.investor_positions
  WHERE fund_id = v_fund_id 
    AND current_value > 0;
  
  -- Upsert fund_daily_aum for today with 'reporting' purpose
  INSERT INTO public.fund_daily_aum (
    fund_id, 
    aum_date, 
    total_aum, 
    purpose, 
    source,
    is_month_end
  )
  VALUES (
    v_fund_id,
    v_today,
    v_new_total_aum,
    'reporting',
    'position_sync_trigger',
    (v_today = (date_trunc('month', v_today) + interval '1 month - 1 day')::date)
  )
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    source = 'position_sync_trigger',
    updated_at = now();
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create the trigger on investor_positions
DROP TRIGGER IF EXISTS trg_sync_fund_aum_on_position_change ON public.investor_positions;

CREATE TRIGGER trg_sync_fund_aum_on_position_change
AFTER INSERT OR UPDATE OF current_value OR DELETE 
ON public.investor_positions
FOR EACH ROW 
EXECUTE FUNCTION public.sync_fund_aum_on_position_change();

-- Fix existing discrepancies: Sync all funds' AUM to match current positions
INSERT INTO public.fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, is_month_end)
SELECT 
  ip.fund_id,
  CURRENT_DATE,
  COALESCE(SUM(ip.current_value), 0),
  'reporting',
  'migration_sync_fix',
  (CURRENT_DATE = (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date)
FROM public.investor_positions ip
WHERE ip.current_value > 0
GROUP BY ip.fund_id
ON CONFLICT (fund_id, aum_date, purpose) 
DO UPDATE SET 
  total_aum = EXCLUDED.total_aum, 
  source = 'migration_sync_fix', 
  updated_at = now();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.sync_fund_aum_on_position_change() IS 
'Automatically syncs fund_daily_aum when investor_positions change to prevent AUM discrepancies';