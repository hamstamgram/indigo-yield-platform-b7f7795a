-- Fix calculate_yield_allocations: rename output columns to match callers
-- DROP first because PostgreSQL won't allow changing return column names in-place

DROP FUNCTION IF EXISTS public.calculate_yield_allocations(uuid, numeric, date);

CREATE OR REPLACE FUNCTION public.calculate_yield_allocations(
  p_fund_id uuid,
  p_recorded_aum numeric,
  p_period_end date
)
RETURNS TABLE(
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
  net numeric,
  fee_credit numeric,
  ib_credit numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fees_account_id uuid;
  v_opening_aum numeric := 0;
  v_total_month_yield numeric := 0;
  v_is_negative_yield boolean := false;
BEGIN
  SELECT id INTO v_fees_account_id FROM profiles
  WHERE profiles.account_type = 'fees_account'::account_type
  ORDER BY created_at ASC LIMIT 1;

  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_opening_aum
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id AND ip.is_active = true;

  v_total_month_yield := p_recorded_aum - v_opening_aum;
  v_is_negative_yield := (v_total_month_yield < 0);

  RETURN QUERY
  WITH all_relevant_investors AS (
    SELECT ip_in.investor_id, ip_in.current_value
    FROM investor_positions ip_in
    WHERE ip_in.fund_id = p_fund_id AND ip_in.is_active = true AND ip_in.current_value > 0
    UNION
    SELECT v_fees_account_id, 0::numeric
    WHERE v_fees_account_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM investor_positions WHERE investor_id = v_fees_account_id AND fund_id = p_fund_id AND is_active = true AND current_value > 0)
    UNION
    SELECT DISTINCT p_child.ib_parent_id, 0::numeric
    FROM investor_positions ip_child
    JOIN profiles p_child ON p_child.id = ip_child.investor_id
    WHERE ip_child.fund_id = p_fund_id 
      AND ip_child.is_active = true 
      AND ip_child.current_value > 0
      AND p_child.ib_parent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM investor_positions WHERE investor_id = p_child.ib_parent_id AND fund_id = p_fund_id AND is_active = true AND current_value > 0)
  ),
  raw_alloc AS (
    SELECT 
      ari.investor_id as r_investor_id,
      trim(COALESCE(p_in.first_name, '') || ' ' || COALESCE(p_in.last_name, '')) AS r_investor_name,
      p_in.email AS r_investor_email,
      p_in.account_type::text AS r_account_type,
      p_in.ib_parent_id as r_ib_parent_id,
      ari.current_value as r_current_value,
      COALESCE((ari.current_value / NULLIF(v_opening_aum, 0)), 0) AS r_share,
      ROUND((v_total_month_yield * COALESCE((ari.current_value / NULLIF(v_opening_aum, 0)), 0))::numeric, 8) AS r_gross,
      CASE 
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.account_type = 'fees_account' THEN 0::numeric
        ELSE get_investor_fee_pct(ari.investor_id, p_fund_id, p_period_end)
      END AS r_fee_pct,
      CASE
        WHEN v_is_negative_yield THEN 0::numeric
        WHEN p_in.ib_parent_id IS NULL THEN 0::numeric
        ELSE get_investor_ib_pct(ari.investor_id, p_fund_id, p_period_end)
      END AS r_ib_rate
    FROM all_relevant_investors ari
    JOIN profiles p_in ON p_in.id = ari.investor_id
  ),
  computed_alloc AS (
    SELECT ra.*,
      ROUND((ra.r_gross * ra.r_fee_pct / 100)::numeric, 8) AS r_fee,
      ROUND((ra.r_gross * ra.r_ib_rate / 100)::numeric, 8) AS r_ib
    FROM raw_alloc ra
  ),
  final_alloc_p0 AS (
    SELECT ca.*, (ca.r_gross - ca.r_fee - ca.r_ib) AS r_net
    FROM computed_alloc ca
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(ca.r_gross), 0) as r_sum_gross,
      COALESCE(SUM(ca.r_fee), 0) as r_total_fees_credit
    FROM final_alloc_p0 ca
  ),
  ib_credits AS (
    SELECT r_ib_parent_id, SUM(r_ib) as total_ib_credit
    FROM final_alloc_p0
    WHERE r_ib_parent_id IS NOT NULL
    GROUP BY r_ib_parent_id
  ),
  final_alloc_p1 AS (
    SELECT fa.*,
      CASE 
        WHEN fa.r_investor_id = v_fees_account_id THEN 
          fa.r_net + (v_total_month_yield - (SELECT r_sum_gross FROM totals))
        ELSE fa.r_net
      END AS r_net_final
    FROM final_alloc_p0 fa
  )
  SELECT 
    p1.r_investor_id,
    p1.r_investor_name,
    p1.r_investor_email,
    p1.r_account_type,
    p1.r_ib_parent_id,
    p1.r_current_value,
    p1.r_share,
    p1.r_gross,
    p1.r_fee_pct,
    p1.r_fee,
    p1.r_ib_rate,
    p1.r_ib,
    p1.r_net_final,
    CASE WHEN p1.r_investor_id = v_fees_account_id THEN (SELECT r_total_fees_credit FROM totals) ELSE 0::numeric END,
    COALESCE(ic.total_ib_credit, 0::numeric)
  FROM final_alloc_p1 p1
  LEFT JOIN ib_credits ic ON ic.r_ib_parent_id = p1.r_investor_id;
END;
$$;