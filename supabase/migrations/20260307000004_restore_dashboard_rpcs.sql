-- =========================================================================
-- RESTORE DASHBOARD RPCS
-- =========================================================================

-- 1. get_admin_stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'totalFunds', (SELECT count(*) FROM public.funds),
    'totalPositions', (SELECT count(*) FROM public.investor_positions),
    'activePositions', (SELECT count(*) FROM public.investor_positions WHERE current_value > 0),
    'totalProfiles', (SELECT count(*) FROM public.profiles),
    'activeProfiles', (SELECT count(*) FROM public.profiles WHERE status = 'active'),
    'uniqueInvestorsWithPositions', (SELECT count(DISTINCT investor_id) FROM public.investor_positions WHERE current_value > 0),
    'pendingWithdrawals', (SELECT count(*) FROM public.withdrawal_requests WHERE status = 'pending'),
    'recentActivity', (SELECT count(*) FROM public.transactions_v2 WHERE created_at >= now() - interval '24 hours' AND is_voided = false)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2. get_active_funds_summary
CREATE OR REPLACE FUNCTION public.get_active_funds_summary()
RETURNS TABLE (
  fund_id uuid,
  fund_code text,
  fund_name text,
  fund_asset text,
  total_aum numeric,
  investor_count bigint,
  aum_record_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    COALESCE(
      (SELECT pah.total_aum FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id ORDER BY pah.aum_date DESC LIMIT 1),
      0
    )::numeric as total_aum,
    (SELECT count(*) FROM public.investor_positions inv WHERE inv.fund_id = f.id AND inv.current_value > 0)::bigint as investor_count,
    (SELECT count(*) FROM public.fund_daily_aum pah WHERE pah.fund_id = f.id)::bigint as aum_record_count
  FROM public.funds f;
END;
$$;

-- 3. get_funds_aum_snapshot
CREATE OR REPLACE FUNCTION public.get_funds_aum_snapshot(p_as_of_date date, p_purpose public.aum_purpose DEFAULT 'reporting'::aum_purpose)
RETURNS TABLE (
  fund_id uuid,
  fund_code text,
  aum_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    f.id as fund_id,
    f.code as fund_code,
    COALESCE(
      (
        SELECT pah.total_aum 
        FROM public.fund_daily_aum pah 
        WHERE pah.fund_id = f.id 
          AND pah.purpose = p_purpose 
          AND pah.aum_date <= p_as_of_date 
        ORDER BY pah.aum_date DESC LIMIT 1
      ), 0
    ) as aum_value
  FROM public.funds f;
END;
$$;
