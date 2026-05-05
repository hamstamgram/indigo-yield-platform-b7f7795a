-- Unify AUM source: switch get_active_funds_summary to live positions
-- Previously used fund_daily_aum (recorded snapshots), now uses SUM of
-- investor_positions.current_value like get_funds_with_aum.
-- This eliminates data drift between dashboard and Apply Yield modal.

CREATE OR REPLACE FUNCTION "public"."get_active_funds_summary"() RETURNS TABLE("fund_id" "uuid", "fund_code" "text", "fund_name" "text", "fund_asset" "text", "total_aum" numeric, "investor_count" bigint, "aum_record_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    f.id as fund_id,
    f.code as fund_code,
    f.name as fund_name,
    f.asset as fund_asset,
    COALESCE(SUM(CASE WHEN ip.current_value > 0 THEN ip.current_value ELSE 0 END), 0)::numeric as total_aum,
    COUNT(DISTINCT CASE WHEN p.account_type = 'investor' AND ip.current_value > 0 THEN ip.investor_id END)::bigint as investor_count,
    (SELECT count(*) FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id)::bigint as aum_record_count
  FROM public.funds f
  LEFT JOIN public.investor_positions ip ON ip.fund_id = f.id
  LEFT JOIN public.profiles p ON p.id = ip.investor_id
  GROUP BY f.id, f.code, f.name, f.asset
  ORDER BY f.name;
END;
$$;
