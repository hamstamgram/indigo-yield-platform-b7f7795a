-- =============================================================================
-- SAFETY: Deprecate legacy position-mutating helper
-- =============================================================================
-- Non-negotiable rule: Do NOT manually update investor_positions.current_value or
-- investor_positions.shares in any DB function.
--
-- This legacy helper mutated investor_positions directly. Replace it with a hard
-- failure to prevent runtime usage. Ledger mutations must happen via
-- public.transactions_v2 + recompute trigger path.

CREATE OR REPLACE FUNCTION public.handle_ledger_transaction(
  p_investor_id uuid,
  p_fund_id uuid,
  p_amount numeric,
  p_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION
    'handle_ledger_transaction is deprecated. Use transactions_v2 and trigger recompute only.';
END;
$$;

