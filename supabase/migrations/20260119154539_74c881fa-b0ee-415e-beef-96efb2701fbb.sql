-- P0-01: Add admin guard to upsert_fund_aum_after_yield
-- This function writes to fund_daily_aum and requires admin access

CREATE OR REPLACE FUNCTION public.upsert_fund_aum_after_yield(
  p_fund_id uuid,
  p_aum_date date,
  p_total_aum numeric,
  p_source text DEFAULT 'yield_distribution'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- P0 FIX: Add admin guard - this function modifies financial data
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required for AUM upsert operations';
  END IF;

  -- Check for existing non-voided record
  IF EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id 
    AND aum_date = p_aum_date 
    AND purpose = 'reporting'
    AND is_voided = false
  ) THEN
    -- Update existing record
    UPDATE fund_daily_aum
    SET total_aum = p_total_aum,
        updated_at = now(),
        updated_by = auth.uid(),
        source = p_source
    WHERE fund_id = p_fund_id 
    AND aum_date = p_aum_date 
    AND purpose = 'reporting'
    AND is_voided = false;
  ELSE
    -- Insert new record
    INSERT INTO fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, created_by
    ) VALUES (
      p_fund_id, p_aum_date, p_total_aum, 'reporting', p_source, auth.uid()
    );
  END IF;
END;
$$;

-- Add comment documenting the security requirement
COMMENT ON FUNCTION public.upsert_fund_aum_after_yield(uuid, date, numeric, text) IS 
'Updates or inserts fund AUM after yield distribution. ADMIN ONLY - writes to fund_daily_aum table.';