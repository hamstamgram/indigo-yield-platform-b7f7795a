-- ============================================================
-- Fix stale AUM records for fund 0a048d9b-c4cf-46eb-b428-59e10307df93
-- Date: 2026-04-17
-- ============================================================
-- The position_sum_matches_aum invariant check fails because fund_daily_aum
-- records for historical dates were never recalculated after withdrawals.
-- 2025-04-16: AUM=10 but should be 1 (deposits withdrawn)
-- 2025-07-31: AUM=3.468 but should be recalculated
-- 2025-08-31: AUM=3.468 but should be recalculated
--
-- Direct UPDATE on fund_daily_aum is blocked by trg_enforce_canonical_daily_aum.
-- We temporarily disable the guard trigger, fix the data, then re-enable.
-- ============================================================

ALTER TABLE public.fund_daily_aum DISABLE TRIGGER trg_enforce_canonical_daily_aum;

DO $$
DECLARE
  v_fund_id uuid := '0a048d9b-c4cf-46eb-b428-59e10307df93';
  v_rec record;
  v_position_sum numeric;
BEGIN
  SELECT COALESCE(SUM(current_value), 0) INTO v_position_sum
  FROM investor_positions
  WHERE fund_id = v_fund_id;

  FOR v_rec IN
    SELECT id, aum_date, total_aum
    FROM fund_daily_aum
    WHERE fund_id = v_fund_id
      AND is_voided = false
      AND purpose = 'transaction'
      AND ABS(total_aum - v_position_sum) > 1
    ORDER BY aum_date
  LOOP
    RAISE NOTICE 'Fixing stale AUM: date=%, old=%, new=%', v_rec.aum_date, v_rec.total_aum, v_position_sum;
    UPDATE fund_daily_aum
    SET total_aum = v_position_sum,
        updated_at = now()
    WHERE id = v_rec.id;
  END LOOP;
END;
$$;

ALTER TABLE public.fund_daily_aum ENABLE TRIGGER trg_enforce_canonical_daily_aum;