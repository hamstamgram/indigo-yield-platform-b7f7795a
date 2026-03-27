-- One-time data heal: recalculate ALL non-voided AUM snapshots for BTC fund
-- to sync fund_daily_aum with the current investor_positions reality.
-- This fixes the 10 BTC drift caused by the old void_transaction calling
-- recalculate_fund_aum_for_date with wrong arg count (silently failed).

DO $$
DECLARE
  v_row RECORD;
  v_result jsonb;
BEGIN
  FOR v_row IN
    SELECT DISTINCT aum_date
    FROM fund_daily_aum
    WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
      AND is_voided = false
    ORDER BY aum_date
  LOOP
    v_result := recalculate_fund_aum_for_date(
      '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
      v_row.aum_date
    );
    RAISE NOTICE 'Healed AUM for %: %', v_row.aum_date, v_result;
  END LOOP;
END;
$$;