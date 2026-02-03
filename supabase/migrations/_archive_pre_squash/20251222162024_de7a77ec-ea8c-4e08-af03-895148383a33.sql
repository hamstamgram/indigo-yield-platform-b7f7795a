
-- Fix the recompute_investor_position function to use correct enum values
-- Valid tx_type values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT

CREATE OR REPLACE FUNCTION recompute_investor_position(p_investor_id uuid, p_fund_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric := 0;
  v_cost_basis numeric := 0;
  v_first_tx_date date;
  v_last_tx_date date;
  v_fund_cursor CURSOR FOR 
    SELECT DISTINCT fund_id 
    FROM transactions_v2 
    WHERE investor_id = p_investor_id 
    AND (p_fund_id IS NULL OR fund_id = p_fund_id);
  v_current_fund_id uuid;
BEGIN
  -- If fund_id is specified, process only that fund
  -- If fund_id is NULL, process all funds for this investor
  FOR v_current_fund_id IN 
    SELECT DISTINCT fund_id 
    FROM transactions_v2 
    WHERE investor_id = p_investor_id 
    AND (p_fund_id IS NULL OR fund_id = p_fund_id)
  LOOP
    -- Calculate totals from non-voided transactions only
    -- Using correct enum values: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
          WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
          ELSE 0
        END
      ), 0),
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0),
      MIN(tx_date),
      MAX(tx_date)
    INTO v_total, v_cost_basis, v_first_tx_date, v_last_tx_date
    FROM transactions_v2
    WHERE investor_id = p_investor_id 
      AND fund_id = v_current_fund_id
      AND is_voided = false;

    -- Upsert the position
    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, updated_at)
    VALUES (p_investor_id, v_current_fund_id, v_total, v_cost_basis, v_total, now())
    ON CONFLICT (investor_id, fund_id) DO UPDATE SET
      current_value = v_total,
      shares = v_total,
      cost_basis = v_cost_basis,
      updated_at = now();
  END LOOP;
END;
$$;

-- Also fix the trigger_recompute_position function
CREATE OR REPLACE FUNCTION trigger_recompute_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recompute_investor_position(OLD.investor_id, OLD.fund_id);
    RETURN OLD;
  ELSE
    PERFORM recompute_investor_position(NEW.investor_id, NEW.fund_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Fix validate_transaction_type to also reject TOP_UP when balance is 0
-- Note: Since TOP_UP doesn't exist in enum, we use tx_subtype for differentiation
CREATE OR REPLACE FUNCTION validate_transaction_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Only validate DEPOSIT type transactions
  IF NEW.type != 'DEPOSIT' THEN
    RETURN NEW;
  END IF;

  -- Get current balance (before this transaction) from investor_positions
  SELECT COALESCE(current_value, 0) INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  -- If no position exists, balance is 0
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  -- If deposit and balance is 0, force first_investment subtype
  IF COALESCE(v_current_balance, 0) = 0 THEN
    NEW.tx_subtype := 'first_investment';
  -- If trying to use first_investment when balance exists, convert to deposit
  ELSIF NEW.tx_subtype = 'first_investment' AND v_current_balance > 0 THEN
    NEW.tx_subtype := 'deposit';
  -- If balance is 0 and subtype is 'top_up', reject
  ELSIF NEW.tx_subtype = 'top_up' AND v_current_balance = 0 THEN
    RAISE EXCEPTION 'Cannot use top_up for first investment. Investor has no existing position in this fund.';
  END IF;

  RETURN NEW;
END;
$$;
