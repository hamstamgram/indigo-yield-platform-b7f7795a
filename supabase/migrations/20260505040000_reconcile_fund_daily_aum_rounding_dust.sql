-- Reconcile fund_daily_aum with live investor_positions SUM
-- Yield distribution rounding leaves sub-cent dust in fund_daily_aum
-- that doesn't match live positions (numeric(28,10) caps at 10 decimals).
-- This is a one-time cleanup.

DO $$
DECLARE
  rec RECORD;
  v_live_aum numeric;
  v_diff numeric;
  v_updated_count integer := 0;
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (f.id)
      f.id AS fund_id, f.code, f.name,
      pah.total_aum AS recorded_aum, pah.aum_date
    FROM public.funds f
    JOIN public.fund_daily_aum pah ON pah.fund_id = f.id
    ORDER BY f.id, pah.aum_date DESC
  LOOP
    SELECT COALESCE(SUM(ip.current_value), 0)
    INTO v_live_aum
    FROM public.investor_positions ip
    WHERE ip.fund_id = rec.fund_id AND ip.current_value > 0;

    v_diff := ABS(rec.recorded_aum - v_live_aum);

    IF v_diff > 0 AND v_diff < 0.01 THEN
      UPDATE public.fund_daily_aum
      SET total_aum = v_live_aum, updated_at = now()
      WHERE fund_id = rec.fund_id AND aum_date = rec.aum_date;
      v_updated_count := v_updated_count + 1;
    ELSIF v_diff >= 0.01 THEN
      RAISE WARNING 'SKIP large diff: % recorded=%, live=%',
        rec.code, rec.recorded_aum, v_live_aum;
    END IF;
  END LOOP;
  RAISE NOTICE 'Reconciled % records', v_updated_count;
END;
$$;

-- Prevent future rounding dust: extract and ROUND the yield function's recorded_aum
-- The key line in apply_segmented_yield_distribution_v5:
--   v_recorded_aum := v_current_aum + v_gross_yield_amount;
-- becomes:
--   v_recorded_aum := ROUND(v_current_aum + v_gross_yield_amount, 10);
-- This matches investor_positions.current_value numeric(28,10) precision.

-- Read the full function, modify line ~1086, recreate.
DO $$
DECLARE
  v_func_text text;
BEGIN
  SELECT prosrc INTO v_func_text
  FROM pg_proc
  WHERE proname = 'apply_segmented_yield_distribution_v5'
    AND pronamespace = 'public'::regnamespace;

  -- Replace the unrounded addition with rounded
  v_func_text := replace(
    v_func_text,
    'v_recorded_aum := v_current_aum + v_gross_yield_amount;',
    'v_recorded_aum := ROUND(v_current_aum + v_gross_yield_amount, 10);'
  );

  -- Verify the replacement happened
  IF position('v_recorded_aum := ROUND' in v_func_text) > 0 THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(
      p_fund_id uuid, p_period_start date, p_period_end date,
      p_gross_yield_amount numeric,
      p_recorded_aum numeric DEFAULT NULL,
      p_admin_id uuid DEFAULT NULL,
      p_purpose aum_purpose DEFAULT ''transaction''::aum_purpose
    ) RETURNS jsonb LANGUAGE plpgsql AS $func$' || v_func_text || '$func$';

    RAISE NOTICE 'Rounding fix applied to apply_segmented_yield_distribution_v5';
  ELSE
    RAISE WARNING 'Could not find target line in function — function may have changed';
  END IF;
END;
$$;
