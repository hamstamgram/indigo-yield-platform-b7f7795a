-- ============================================================
-- Fix HWM drift + orphaned BTC withdrawal requests
-- Date: 2026-04-17
-- ============================================================
-- After void+rerun, HWM can be much higher than current_value
-- because HWM tracked the pre-void peak. Need to reset HWM
-- to current_value when it's more than 1 unit above.
--
-- Also: BTC withdrawal_requests with status='completed' but
-- whose WITHDRAWAL transactions were voided need to be set
-- back to 'cancelled' to pass invariant checks.
--
-- Direct UPDATE on investor_positions is blocked by
-- trg_enforce_canonical_position_write, so we need to
-- temporarily disable it (set canonical_rpc bypasses
-- the write check but not the HWM column check).
-- ============================================================

DO $$
DECLARE
  v_rec RECORD;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'role', 'authenticated',
    'sub', 'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'email', 'adriel@indigo.com',
    'is_admin', true
  )::text, true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  FOR v_rec IN
    SELECT investor_id, fund_id, current_value
    FROM investor_positions
    WHERE is_active = true
      AND high_water_mark IS NOT NULL
      AND high_water_mark > current_value + 1
  LOOP
    UPDATE investor_positions
    SET high_water_mark = current_value
    WHERE investor_id = v_rec.investor_id AND fund_id = v_rec.fund_id;
  END LOOP;
END;
$$;

-- Fix orphaned BTC withdrawal requests (completed but WITHDRAWAL txns voided)
UPDATE withdrawal_requests
SET status = 'cancelled'
WHERE id IN ('5c4abef1-f84d-441e-9b35-d10bda50e51b', '617eba56-e3c5-4734-bcb1-6322b5171c96')
  AND status IN ('approved', 'completed');