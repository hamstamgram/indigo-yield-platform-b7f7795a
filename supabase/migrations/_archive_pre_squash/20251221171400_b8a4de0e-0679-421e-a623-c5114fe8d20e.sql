-- Fix fund_daily_aum unique constraint for ON CONFLICT
-- Drop the old constraint (not index) that only has fund_id, aum_date - missing purpose
ALTER TABLE public.fund_daily_aum 
DROP CONSTRAINT IF EXISTS fund_daily_aum_fund_id_aum_date_key;

-- Drop any existing index with the new name
DROP INDEX IF EXISTS idx_fund_daily_aum_unique;

-- Create the correct unique index including purpose to match ON CONFLICT clause
CREATE UNIQUE INDEX idx_fund_daily_aum_unique 
ON public.fund_daily_aum (fund_id, aum_date, purpose);

-- Add guardrail function to block deprecated/inactive funds
CREATE OR REPLACE FUNCTION public.check_fund_is_active()
RETURNS TRIGGER AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Get the fund status
  SELECT status INTO v_fund_status
  FROM public.funds 
  WHERE id = NEW.fund_id::uuid;
  
  -- If fund doesn't exist or is not active, block the operation
  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive or deprecated fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply trigger to investor_positions (only if not exists)
DROP TRIGGER IF EXISTS trg_investor_positions_active_fund ON public.investor_positions;
CREATE TRIGGER trg_investor_positions_active_fund
BEFORE INSERT OR UPDATE ON public.investor_positions
FOR EACH ROW EXECUTE FUNCTION public.check_fund_is_active();

-- Apply trigger to transactions_v2 (only if not exists)
DROP TRIGGER IF EXISTS trg_transactions_v2_active_fund ON public.transactions_v2;
CREATE TRIGGER trg_transactions_v2_active_fund
BEFORE INSERT OR UPDATE ON public.transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.check_fund_is_active();