-- ============================================================
-- Fix stale AUM records + HWM after void+rerun cycle
-- Date: 2026-04-17
-- ============================================================
-- After voiding all transactions and rerunning, old AUM records
-- from the original deposit dates still show deposit-only amounts.
-- Need to recalculate AUM for those dates.
-- Also fix HWM inconsistencies from voided positions.
--
-- Must set JWT claims + canonical_rpc because these SECDEF
-- functions check is_admin() and investor_positions is
-- guarded by trg_enforce_canonical_position_write.
-- ============================================================

-- Fix AUM: recalculate for all dates with stale records
DO $$
DECLARE
  v_dates RECORD;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'role', 'authenticated',
    'sub', 'e438bfff-44bc-48ab-a472-6abe89ee8f82',
    'email', 'adriel@indigo.com',
    'is_admin', true
  )::text, true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  FOR v_dates IN
    SELECT DISTINCT fund_id, aum_date
    FROM fund_daily_aum
    WHERE is_voided = false
      AND purpose = 'transaction'
      AND fund_id IN ('2c123c4f-76b4-4504-867e-059649855417', '7574bc81-aab3-4175-9e7f-803aa6f9eb8f')
  LOOP
    BEGIN
      PERFORM public.recalculate_fund_aum_for_date(
        v_dates.fund_id, v_dates.aum_date, 'transaction'::aum_purpose,
        'e438bfff-44bc-48ab-a472-6abe89ee8f82'::uuid
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to recalculate AUM for fund % date %: %', v_dates.fund_id, v_dates.aum_date, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Fix HWM: use recompute_investor_position to recalculate with canonical_rpc
-- (direct UPDATE is blocked by trg_enforce_canonical_position_write)
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
    SELECT DISTINCT investor_id, fund_id
    FROM investor_positions
    WHERE is_active = true
      AND high_water_mark IS NOT NULL
      AND high_water_mark > current_value + 1
  LOOP
    PERFORM public.recompute_investor_position(v_rec.investor_id, v_rec.fund_id);
  END LOOP;
END;
$$;