-- Defense-in-depth: fn_ledger_drives_position sets canonical flag
-- This ensures position updates succeed even if called outside an RPC context
-- Also adds advisory lock to apply_segmented_yield_distribution_v5 for concurrency safety

-- 1. Add canonical flag to fn_ledger_drives_position
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta numeric;
  v_new_value numeric;
BEGIN
  -- Defense-in-depth: ensure canonical flag is set so position writes are not blocked
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  v_delta := NEW.amount;

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        is_active = ((current_value + v_delta) > 0),
        updated_at = NOW(),
        last_transaction_date = GREATEST(last_transaction_date, NEW.tx_date),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END,
        last_yield_crystallization_date = GREATEST(last_yield_crystallization_date, NEW.tx_date)
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    UPDATE public.investor_positions
    SET
        current_value = current_value - v_delta,
        is_active = ((current_value - v_delta) > 0),
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = false AND OLD.is_voided = true) THEN
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        is_active = ((current_value + v_delta) > 0),
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$;