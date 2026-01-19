-- P0-03: Deprecate legacy yield functions with forwarding wrappers
-- These functions forward to the canonical apply_daily_yield_to_fund_v3

-- 1. Deprecate apply_adb_yield_distribution (if exists)
CREATE OR REPLACE FUNCTION public.apply_adb_yield_distribution(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE WARNING '[DEPRECATED] apply_adb_yield_distribution is deprecated. Use apply_daily_yield_to_fund_v3 instead.';
  
  -- Forward to canonical function
  RETURN public.apply_daily_yield_to_fund_v3(
    p_fund_id := p_fund_id,
    p_yield_date := p_yield_date,
    p_new_aum := p_new_aum,
    p_actor_id := COALESCE(p_actor_id, auth.uid())
  );
END;
$$;

COMMENT ON FUNCTION public.apply_adb_yield_distribution(uuid, date, numeric, uuid) IS
'DEPRECATED: Use apply_daily_yield_to_fund_v3 instead. This wrapper forwards calls and logs a deprecation warning.';

-- 2. Deprecate apply_daily_yield_with_validation (if exists)
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_validation(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE WARNING '[DEPRECATED] apply_daily_yield_with_validation is deprecated. Use apply_daily_yield_to_fund_v3 instead.';
  
  -- Forward to canonical function
  RETURN public.apply_daily_yield_to_fund_v3(
    p_fund_id := p_fund_id,
    p_yield_date := p_yield_date,
    p_new_aum := p_new_aum,
    p_actor_id := COALESCE(p_actor_id, auth.uid())
  );
END;
$$;

COMMENT ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid) IS
'DEPRECATED: Use apply_daily_yield_to_fund_v3 instead. This wrapper forwards calls and logs a deprecation warning.';

-- 3. Also deprecate apply_daily_yield_to_fund (v1) if it exists
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE WARNING '[DEPRECATED] apply_daily_yield_to_fund is deprecated. Use apply_daily_yield_to_fund_v3 instead.';
  
  -- Forward to canonical function
  RETURN public.apply_daily_yield_to_fund_v3(
    p_fund_id := p_fund_id,
    p_yield_date := p_yield_date,
    p_new_aum := p_new_aum,
    p_actor_id := COALESCE(p_actor_id, auth.uid())
  );
END;
$$;

COMMENT ON FUNCTION public.apply_daily_yield_to_fund(uuid, date, numeric, uuid) IS
'DEPRECATED: Use apply_daily_yield_to_fund_v3 instead. This wrapper forwards calls and logs a deprecation warning.';

-- 4. Also deprecate apply_daily_yield_to_fund_v2 if it exists
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE WARNING '[DEPRECATED] apply_daily_yield_to_fund_v2 is deprecated. Use apply_daily_yield_to_fund_v3 instead.';
  
  -- Forward to canonical function
  RETURN public.apply_daily_yield_to_fund_v3(
    p_fund_id := p_fund_id,
    p_yield_date := p_yield_date,
    p_new_aum := p_new_aum,
    p_actor_id := COALESCE(p_actor_id, auth.uid())
  );
END;
$$;

COMMENT ON FUNCTION public.apply_daily_yield_to_fund_v2(uuid, date, numeric, uuid) IS
'DEPRECATED: Use apply_daily_yield_to_fund_v3 instead. This wrapper forwards calls and logs a deprecation warning.';