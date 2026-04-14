-- Fix: "Fund not found" error on void transaction
-- Root cause: check_fund_is_active() and validate_position_fund_status() triggers
-- fire during INSERT ON CONFLICT DO UPDATE on investor_positions, blocking canonical
-- RPCs (void, recompute, yield distribution) that already validate inputs upstream.

CREATE OR REPLACE FUNCTION public.check_fund_is_active()
RETURNS trigger AS $$
DECLARE
  v_fund_status text;
BEGIN
  -- Skip when inside a canonical RPC (void, recompute, yield distribution)
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip any UPDATE where fund_id hasn't changed
  IF TG_OP = 'UPDATE' AND NEW.fund_id = OLD.fund_id THEN
    RETURN NEW;
  END IF;

  -- For transactions_v2 only, skip void operations
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions_v2' THEN
    IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Validate fund exists and is active
  SELECT status INTO v_fund_status
  FROM public.funds WHERE id = NEW.fund_id::uuid;

  IF v_fund_status IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', NEW.fund_id;
  ELSIF v_fund_status != 'active' THEN
    RAISE EXCEPTION 'Cannot use inactive fund (status: %): %', v_fund_status, NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.validate_position_fund_status()
RETURNS trigger AS $$
BEGIN
  -- Skip when inside a canonical RPC
  IF COALESCE(current_setting('indigo.canonical_rpc', true), 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.funds WHERE id = NEW.fund_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot create position on non-active fund. Fund ID: %, Status must be active.', NEW.fund_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';