-- Fix the sync trigger which copies reporting AUM over to transaction AUM.
-- In V6, transaction AUMs no longer have a uniqueness constraint per day, so we drop the ON CONFLICT clause.
CREATE OR REPLACE FUNCTION public.sync_reporting_aum_to_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only sync when source is yield_distribution_v5 and purpose is reporting
  IF NEW.purpose = 'reporting' AND NEW.source = 'yield_distribution_v5' AND NEW.is_voided = false THEN
    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (NEW.fund_id, NEW.aum_date, NEW.total_aum, 'transaction', 'yield_aum_sync_v5', NEW.created_by, NEW.is_month_end);
  END IF;

  RETURN NEW;
END;
$function$;
