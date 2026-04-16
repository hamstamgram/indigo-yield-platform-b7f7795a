-- Drop and recreate reconcile_investor_position_internal with aligned cost_basis logic
DROP FUNCTION IF EXISTS public.reconcile_investor_position_internal(uuid, uuid);

CREATE OR REPLACE FUNCTION public.reconcile_investor_position_internal(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
  v_realized_pnl numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  -- ALIGNED with canonical recompute_investor_position: use ABS for deposits, -ABS for withdrawals
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  v_cost_basis := GREATEST(v_cost_basis, 0);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_realized_pnl
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false)
    AND type IN ('YIELD', 'IB_CREDIT', 'INTEREST', 'FEE_CREDIT');

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO investor_positions (
    investor_id, fund_id, cost_basis, current_value, shares, realized_pnl,
    is_active, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_current_value, v_realized_pnl,
    (v_current_value > 0),
    now()
  )
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    realized_pnl = EXCLUDED.realized_pnl,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$function$;