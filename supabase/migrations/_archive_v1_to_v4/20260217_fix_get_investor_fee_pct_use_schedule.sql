-- Fix get_investor_fee_pct to delegate to _resolve_investor_fee_pct
--
-- ROOT CAUSE: get_investor_fee_pct only reads profiles.fee_pct, ignoring
-- investor_fee_schedule entirely. The correct resolution function
-- _resolve_investor_fee_pct exists but was never wired up.
--
-- IMPACT: All callers (V5 apply, V5 preview, V3, crystallization) will
-- now respect fee schedule overrides. Zero TypeScript changes needed.

CREATE OR REPLACE FUNCTION public.get_investor_fee_pct(
  p_investor_id uuid,
  p_fund_id uuid,
  p_effective_date date
)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public._resolve_investor_fee_pct(p_investor_id, p_fund_id, p_effective_date);
$$;

COMMENT ON FUNCTION public.get_investor_fee_pct(uuid, uuid, date) IS
  'Centralized fee resolution: delegates to _resolve_investor_fee_pct which checks fee_schedule (fund-specific then global), then profile default. fees_account always returns 0.';
