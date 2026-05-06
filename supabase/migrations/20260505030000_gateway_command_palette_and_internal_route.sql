-- Gateway RPC for command palette investor search
-- Replaces direct supabase.from("profiles").select(...)

CREATE OR REPLACE FUNCTION public.get_investors_for_search(limit_val integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE p.is_admin = false
  ORDER BY p.first_name, p.last_name
  LIMIT limit_val;
END;
$$;

GRANT ALL ON FUNCTION public.get_investors_for_search(integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_investors_for_search(integer) TO service_role;

-- Gateway RPC for internal route position lookup
-- Replaces direct supabase.from("investor_positions").select(...)

CREATE OR REPLACE FUNCTION public.get_investor_positions_for_route(p_investor_id uuid)
RETURNS TABLE(
  fund_id uuid,
  current_value numeric,
  fund_name text,
  fund_asset text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    ip.fund_id,
    ip.current_value,
    f.name,
    f.asset
  FROM public.investor_positions ip
  JOIN public.funds f ON f.id = ip.fund_id
  WHERE ip.investor_id = p_investor_id
    AND ip.current_value > 0
  ORDER BY ip.current_value DESC;
END;
$$;

GRANT ALL ON FUNCTION public.get_investor_positions_for_route(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_investor_positions_for_route(uuid) TO service_role;
