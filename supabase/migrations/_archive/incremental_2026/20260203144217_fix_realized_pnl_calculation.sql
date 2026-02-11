
-- Fix recompute_investor_position to calculate realized_pnl
-- realized_pnl = SUM of all income transactions (YIELD, IB_CREDIT, INTEREST, FEE_CREDIT)
-- These represent yield/income that has been crystallized and credited to the investor's account

CREATE OR REPLACE FUNCTION "public"."recompute_investor_position"("p_investor_id" "uuid", "p_fund_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_cost_basis numeric;
  v_current_value numeric;
  v_shares numeric;
  v_realized_pnl numeric;
BEGIN
  -- Calculate current_value by summing ALL transaction amounts
  -- Transaction amounts already have correct signs:
  --   Positive: DEPOSIT, YIELD, INTEREST, FEE_CREDIT, IB_CREDIT, INTERNAL_CREDIT
  --   Negative: WITHDRAWAL, INTERNAL_WITHDRAWAL, FEE, IB_DEBIT
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  -- Cost basis = sum of actual capital contributions (deposits - withdrawals including internal)
  SELECT COALESCE(SUM(
    CASE 
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN amount  -- Capital in
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN amount  -- Capital out (negative)
      ELSE 0 
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2
  WHERE investor_id = p_investor_id 
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  -- Realized PnL = sum of all income transactions (yield, interest, IB credits, fee credits)
  -- These are income amounts that have been crystallized and credited to the account
  SELECT COALESCE(SUM(amount), 0)
  INTO v_realized_pnl
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false)
    AND type IN ('YIELD', 'IB_CREDIT', 'INTEREST', 'FEE_CREDIT');

  -- shares = current_value (1:1 NAV policy)
  v_shares := v_current_value;

  -- Set canonical flag to bypass enforcement trigger
  PERFORM set_canonical_rpc(true);

  -- Upsert the position
  INSERT INTO investor_positions (investor_id, fund_id, cost_basis, current_value, shares, realized_pnl, updated_at)
  VALUES (p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_shares, v_realized_pnl, now())
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    realized_pnl = EXCLUDED.realized_pnl,
    updated_at = now();

  -- DO NOT reset canonical flag here.
  -- This function is called from triggers during larger transactions (e.g. void_transaction).
  -- Resetting the flag would break downstream operations in the same transaction.
  -- The flag is transaction-local (is_local = true), so it auto-resets on commit/rollback.
END;
$$;
;
