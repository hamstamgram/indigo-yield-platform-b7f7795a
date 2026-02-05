-- Fix: fund card AUM must represent conserved NAV, not investor-only net AUM.
-- Fees/IB are internal ownership reallocations and remain part of fund total AUM.

CREATE OR REPLACE FUNCTION "public"."get_funds_with_aum"()
RETURNS TABLE(
  "fund_id" "uuid",
  "fund_name" "text",
  "fund_code" "text",
  "asset" "text",
  "fund_class" "text",
  "status" "text",
  "total_aum" numeric,
  "investor_count" bigint
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.code,
    f.asset,
    f.fund_class,
    f.status::text,
    COALESCE(SUM(CASE WHEN ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0) AS total_aum,
    COUNT(DISTINCT CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.investor_id END) AS investor_count
  FROM public.funds f
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id
  ORDER BY f.name;
END;
$$;

COMMENT ON FUNCTION "public"."get_funds_with_aum"() IS
'Returns fund totals with conserved NAV. total_aum sums all positive positions (investor + fees_account + ib); investor_count remains investor-only.';
