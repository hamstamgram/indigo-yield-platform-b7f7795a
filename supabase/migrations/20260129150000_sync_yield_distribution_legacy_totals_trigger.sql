-- Keep legacy summary columns in sync with canonical totals
CREATE OR REPLACE FUNCTION public.sync_yield_distribution_legacy_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Prefer canonical totals when present
  IF NEW.total_net_amount IS NOT NULL THEN
    NEW.net_yield := COALESCE(NEW.net_yield, NEW.total_net_amount);
  END IF;
  IF NEW.total_fee_amount IS NOT NULL THEN
    NEW.total_fees := COALESCE(NEW.total_fees, NEW.total_fee_amount);
  END IF;
  IF NEW.total_ib_amount IS NOT NULL THEN
    NEW.total_ib := COALESCE(NEW.total_ib, NEW.total_ib_amount);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_yield_distribution_legacy_totals ON public.yield_distributions;
CREATE TRIGGER trg_sync_yield_distribution_legacy_totals
BEFORE INSERT OR UPDATE ON public.yield_distributions
FOR EACH ROW EXECUTE FUNCTION public.sync_yield_distribution_legacy_totals();
