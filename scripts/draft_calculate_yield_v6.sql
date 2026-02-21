-- V6 Yield Computation Pipeline: Pure Mathematical Single Source of Truth

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define the return type matching the required JSON structure for the frontend 'V5AllocationItem'
-- Since we return JSON from the RPCs, we can just return a TABLE that the RPCs aggregate into JSON.
-- We also need to return the header info (gross, net, fees, ib). But we can just sum those up in the RPC.
-- So this function just computes the exact allocations line by line.

DROP FUNCTION IF EXISTS public.calculate_yield_allocations(uuid, numeric, date);

CREATE OR REPLACE FUNCTION public.calculate_yield_allocations(
  p_fund_id uuid,
  p_recorded_aum numeric,
  p_period_end date
)
RETURNS TABLE (
  investor_id uuid,
  investor_name text,
  investor_email text,
  account_type text,
  ib_parent_id uuid,
  current_value numeric,
  share numeric,
  gross numeric,
  fee_pct numeric,
  fee numeric,
  ib_rate numeric,
  ib numeric,
  net numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
  v_residual numeric := 0;
  v_total_gross numeric := 0;
  v_fees_account_gross numeric := 0;
BEGIN
  -- 1. Identify the system Fees Account
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  -- 2. Compute Opening AUM (sum of all active current_values)
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  -- 3. Total Yield Generated
  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  -- 4. Calculate allocations line by line
  -- We use a TEMP TABLE pattern to allow a second pass for Dust Collection if necessary,
  -- but a RETURN QUERY allows streaming. We will use a RETURN QUERY combined with a CTE.
  
  RETURN QUERY
  WITH raw_alloc AS (
    SELECT 
      ip.investor_id,
      trim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS investor_name,
      p.email AS investor_email,
      p.account_type::text AS account_type,
      p.ib_parent_id,
      ip.current_value,
      (ip.current_value / NULLIF(v_opening_aum, 0)) AS share,
      ROUND((v_total_month_yield * (ip.current_value / NULLIF(v_opening_aum, 0)))::numeric, 8) AS gross,
      
      -- Fee Pct
      CASE 
        WHEN v_is_negative_yield THEN 0
        WHEN p.account_type = 'fees_account' THEN 0
        ELSE get_investor_fee_pct(ip.investor_id, p_fund_id, p_period_end)
      END AS fee_pct,

      -- IB Rate
      CASE
        WHEN v_is_negative_yield THEN 0
        WHEN p.ib_parent_id IS NULL THEN 0
        ELSE get_investor_ib_pct(ip.investor_id, p_fund_id, p_period_end)
      END AS ib_rate

    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.is_active = true AND ip.current_value > 0
  ),
  computed_alloc AS (
    SELECT 
      ra.*,
      ROUND((ra.gross * ra.fee_pct / 100)::numeric, 8) AS fee,
      ROUND((ra.gross * ra.ib_rate / 100)::numeric, 8) AS ib
    FROM raw_alloc ra
  ),
  final_alloc AS (
    SELECT 
      ca.*,
      (ca.gross - ca.fee - ca.ib) AS net
    FROM computed_alloc ca
  ),
  totals AS (
     SELECT 
       COALESCE(SUM(ca.gross), 0) as sum_gross,
       COALESCE(SUM(CASE WHEN ca.investor_id = v_fees_account_id THEN ca.gross ELSE 0 END), 0) as fees_gross
     FROM final_alloc ca
  )
  SELECT 
    fa.investor_id,
    fa.investor_name,
    fa.investor_email,
    fa.account_type,
    fa.ib_parent_id,
    fa.current_value,
    fa.share,
    fa.gross,
    fa.fee_pct,
    fa.fee,
    fa.ib_rate,
    fa.ib,
    -- Dust routing: if this row is the fees account, add the rounding residual to its net yield
    CASE 
      WHEN fa.investor_id = v_fees_account_id THEN 
        fa.net + (v_total_month_yield - t.sum_gross)
      ELSE 
        fa.net
    END AS net
  FROM final_alloc fa
  CROSS JOIN totals t;

END;
$$;
