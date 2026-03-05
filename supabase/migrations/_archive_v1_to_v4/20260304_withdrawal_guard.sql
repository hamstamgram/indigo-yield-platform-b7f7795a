-- Migration: 20260304_withdrawal_guard.sql
-- Description: State machine guard for withdrawal_requests to prevent bypass of financial logic.
-- Scope: Platform Integrity Hardening

-- 1. State Machine Guard Function
CREATE OR REPLACE FUNCTION public.guard_withdrawal_state_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- GUARD: Block manual status changes to 'approved' or 'completed' unless via Canonical RPC
  -- This ensures that ledger entries and balance adjustments are always processed.
  IF (NEW.status IN ('approved', 'completed')) AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'CRITICAL: Status change to % must be performed via canonical Indigo RPC for financial reconciliation.', NEW.status;
  END IF;

  -- GUARD: Valid State Transitions
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    RAISE EXCEPTION 'INALID TRANSITION: Completed withdrawals cannot be rolled back to %.', NEW.status;
  END IF;

  IF OLD.status = 'rejected' AND NEW.status NOT IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID TRANSITION: Rejected withdrawals must remain rejected or be cancelled.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply Trigger
DROP TRIGGER IF EXISTS trg_guard_withdrawal_state ON public.withdrawal_requests;
CREATE TRIGGER trg_guard_withdrawal_state
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.guard_withdrawal_state_transitions();

-- 3. Audit Log Entry
COMMENT ON TRIGGER trg_guard_withdrawal_state ON public.withdrawal_requests IS 'Canonical guard: Prevents non-RPC status changes to sensitive financial states.';
