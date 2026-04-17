-- ============================================================
-- P2: Explicit DUST_SWEEP handler + disable redundant trigger
-- Date: 2026-04-17
-- ============================================================
-- NOTE: fn_ledger_drives_position is a TRIGGER function (called by
-- trg_ledger_sync on transactions_v2), not callable by users. It runs
-- as SECURITY DEFINER to update investor_positions across RLS. No
-- is_admin gate needed — it's fire-and-forget from the trigger queue.
-- enforce_transaction_via_rpc trigger already gates all inserts.
-- This migration does NOT introduce new mutation endpoints — the
-- is_admin/require_admin gate is enforced upstream by the RPC functions
-- that insert into transactions_v2 (which fire this trigger).
-- ============================================================
-- P2: fn_ledger_drives_position doesn't explicitly handle DUST_SWEEP.
-- It works by accident (negative amount treated as debit). Adding
-- explicit handling for DUST_SWEEP, FEE, IB_DEBIT, DUST types
-- for clarity and safety.
--
-- P2: trg_recompute_position_on_tx fires alongside fn_ledger_drives_position
-- (trg_ledger_sync). Every transaction triggers BOTH an incremental
-- update AND a full recompute. Disabling the redundant trigger.
-- ============================================================

-- ============================================================
-- P2a: Update fn_ledger_drives_position with explicit type handlers
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."fn_ledger_drives_position"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;
    IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
      v_delta := -1 * ABS(NEW.amount);
    ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
      v_delta := -1 * ABS(NEW.amount);
    ELSIF NEW.type = 'DUST_SWEEP' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;
    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type = 'DUST_SWEEP' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;
      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type IN ('FEE', 'IB_DEBIT', 'DUST') THEN
        v_delta := -1 * ABS(NEW.amount);
      ELSIF NEW.type = 'DUST_SWEEP' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;
      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."fn_ledger_drives_position"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."fn_ledger_drives_position"() IS 'Incremental position update trigger. v2.0 (2026-04-17): Added explicit DUST_SWEEP, FEE, IB_DEBIT, DUST handlers for clarity in all three branches (INSERT, void, unvoid).';

-- ============================================================
-- P2b: Disable redundant trg_recompute_position_on_tx trigger
-- fn_ledger_drives_position (trg_ledger_sync) already does incremental updates.
-- trg_recompute_position_on_tx does a full recompute on every transaction,
-- which is wasteful and can cause race conditions.
-- ============================================================
ALTER TABLE public.transactions_v2 DISABLE TRIGGER trg_recompute_position_on_tx;