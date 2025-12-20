-- Fix v_itd_returns view to use SECURITY INVOKER
DROP VIEW IF EXISTS public.v_itd_returns;

CREATE VIEW public.v_itd_returns
WITH (security_invoker = on)
AS
SELECT daily_nav.fund_id,
    (exp(sum(ln(((1)::numeric + (COALESCE(daily_nav.net_return_pct, (0)::numeric) / 100.0))))) - (1)::numeric) AS itd_return
FROM daily_nav
WHERE daily_nav.purpose = 'reporting'::aum_purpose
GROUP BY daily_nav.fund_id;

COMMENT ON VIEW public.v_itd_returns IS 'ITD returns view with SECURITY INVOKER - respects caller RLS permissions';