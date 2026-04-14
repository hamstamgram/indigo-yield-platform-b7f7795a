-- Fix: get_funds_with_aum was excluding IB accounts from investor_count
-- IBs with positions are yield-eligible and should be counted
-- Only fees_account is excluded (system account, not a real investor)
--
-- Before: p.account_type = 'investor' (excluded IBs)
-- After:  p.account_type != 'fees_account' (includes IBs)

CREATE OR REPLACE FUNCTION get_funds_with_aum()
RETURNS TABLE (
  fund_id uuid,
  fund_name text,
  fund_code text,
  asset text,
  fund_class text,
  status text,
  logo_url text,
  inception_date date,
  total_aum numeric,
  investor_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.code,
    f.asset,
    f.fund_class,
    f.status::text,
    f.logo_url,
    f.inception_date,
    -- ALL accounts with equity contribute to total AUM (fees/IB compound)
    COALESCE(SUM(CASE WHEN ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) AS total_aum,
    -- Count all position holders except fees_account (IBs are yield-eligible)
    COUNT(DISTINCT CASE WHEN ip.current_value > 0 AND p.account_type != 'fees_account' THEN ip.investor_id END) AS investor_count
  FROM public.funds f
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id
  ORDER BY f.name;
END;
$$;
