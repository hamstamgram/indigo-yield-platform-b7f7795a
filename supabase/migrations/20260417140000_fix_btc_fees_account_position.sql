-- ============================================================
-- Data Fix: Recompute BTC fees_account stranded position
-- Date: 2026-04-17
-- ============================================================
-- The INDIGO Fees account (b464a3f7) has a BTC fund position
-- of 2.0 but all 4 transactions are voided (sum = 0).
-- This happened because voids occurred before the
-- fn_ledger_drives_position trigger had the DUST_SWEEP handler
-- (added in 20260417090000), so the incremental position
-- adjustment was incorrect.
--
-- recompute_investor_position sets canonical_rpc=true which
-- bypasses trg_enforce_canonical_position_write. No need to
-- disable triggers.
--
-- Also recomputes ALL fees_account positions across all funds
-- as a defensive measure.
-- ============================================================

DO $$
DECLARE
  v_fees_account_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT DISTINCT fund_id
    FROM investor_positions
    WHERE investor_id = v_fees_account_id
  LOOP
    PERFORM public.recompute_investor_position(v_fees_account_id, v_rec.fund_id);
  END LOOP;

  -- Also check for the mystery fund 8a7b6c5d that shows is_active=false at 0
  IF EXISTS (SELECT 1 FROM funds WHERE id = '8a7b6c5d-4e3f-2a1b-9c8d-7e6f5a4b3c2d') THEN
    PERFORM public.recompute_investor_position(v_fees_account_id, '8a7b6c5d-4e3f-2a1b-9c8d-7e6f5a4b3c2d'::uuid);
  END IF;
END;
$$;

-- Verify: BTC position should now be 0 (deactivated)
-- XRP: should remain ~116.56, SOL: ~0.29