-- Fix: fn_ledger_drives_position must handle unvoid (is_voided: true -> false)
-- Without this, unvoided transactions don't restore position values.

CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric;
BEGIN
  v_delta := NEW.amount; -- Amount is already signed in transactions_v2

  IF (TG_OP = 'INSERT') THEN
    UPDATE public.investor_positions
    SET
        -- CORE INTEGRITY: Value driven by Ledger
        current_value = current_value + v_delta,

        -- Metadata Updates
        updated_at = NOW(),
        last_transaction_date = GREATEST(last_transaction_date, NEW.tx_date),

        -- Cost Basis Logic: capital in/out (aligned with recompute_investor_position)
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END,

        -- Crystallization Metadata
        last_yield_crystallization_date = GREATEST(last_yield_crystallization_date, NEW.tx_date)
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    -- Reverse the effect of voided transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value - v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  ELSIF (TG_OP = 'UPDATE' AND NEW.is_voided = false AND OLD.is_voided = true) THEN
    -- Restore the effect of an unvoided transaction
    UPDATE public.investor_positions
    SET
        current_value = current_value + v_delta,
        updated_at = NOW(),
        cost_basis = CASE
            WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
            WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
            ELSE cost_basis
        END
    WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  END IF;

  RETURN NEW;
END;
$function$;
