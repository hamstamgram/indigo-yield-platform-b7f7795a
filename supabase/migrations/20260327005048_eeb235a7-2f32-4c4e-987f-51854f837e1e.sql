-- Fix 1: recompute_on_void - fix swapped parameters + add efficiency guard
CREATE OR REPLACE FUNCTION public.recompute_on_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act on void transitions
  IF NOT (TG_OP = 'UPDATE' AND NEW.is_voided = true AND OLD.is_voided = false) THEN
    RETURN NEW;
  END IF;

  -- fn_ledger_drives_position already handled the incremental delta in this same
  -- transaction and set indigo.canonical_rpc = 'true'. Skip the redundant full
  -- recompute unless we are in a context where the incremental sync did NOT run.
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Safety net: full recompute with CORRECT parameter order (investor first, fund second)
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM reconcile_investor_position_internal(
    NEW.investor_id,  -- p_investor_id (was incorrectly NEW.fund_id)
    NEW.fund_id       -- p_fund_id    (was incorrectly NEW.investor_id)
  );

  RETURN NEW;
END;
$$;

-- Fix 2: validate_transaction_fund_status - add canonical RPC bypass
CREATE OR REPLACE FUNCTION public.validate_transaction_fund_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Allow canonical RPCs (void-and-reissue, yield distribution, etc.)
  IF current_setting('indigo.canonical_rpc', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_fund_status
  FROM public.funds
  WHERE id = NEW.fund_id;

  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  END IF;

  IF v_fund_status NOT IN ('active') THEN
    RAISE EXCEPTION 'Cannot create transaction for fund with status: %', v_fund_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix 3: Clean up any phantom position rows with swapped IDs
DELETE FROM public.investor_positions
WHERE investor_id IN (SELECT id FROM public.funds)
   OR fund_id IN (SELECT id FROM public.profiles);